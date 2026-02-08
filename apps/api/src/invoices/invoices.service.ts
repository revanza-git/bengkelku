import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private mapInvoice(invoice: any) {
    if (!invoice) return invoice;
    const mappedLines = invoice.invoice_lines
      ? invoice.invoice_lines.map((line: any) => ({
          ...line,
          item: line.items,
          tax_code: line.tax_codes,
        }))
      : undefined;

    return {
      ...invoice,
      customer: invoice.customers,
      invoice_date: invoice.issued_at,
      due_date: invoice.due_at,
      tax_amount: invoice.tax_total,
      total: invoice.grand_total,
      invoice_lines: mappedLines ?? invoice.invoice_lines,
    };
  }

  async findAll(orgId: string) {
    const invoices = await this.prisma.invoices.findMany({
      where: { org_id: orgId },
      include: {
        customers: true,
      },
      orderBy: { issued_at: 'desc' },
    });
    return invoices.map((inv) => this.mapInvoice(inv));
  }

  async findOne(id: string, orgId: string) {
    const invoice = await this.prisma.invoices.findFirst({
      where: { id, org_id: orgId },
      include: {
        customers: true,
        invoice_lines: {
          include: {
            items: true,
            tax_codes: true,
          },
        },
        payment_allocations: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return this.mapInvoice(invoice);
  }

  private buildInvoiceData(body: any, orgId: string) {
    const invoiceDate = body.invoice_date || body.issued_at || new Date().toISOString();
    const dueDate = body.due_date || body.due_at || null;
    const invoiceNumber =
      body.invoice_number ||
      body.invoice_no ||
      body.number ||
      `INV-${Date.now()}`;

    return {
      org_id: orgId,
      invoice_number: invoiceNumber,
      purchase_order_id: body.purchase_order_id || null,
      customer_id: body.customer_id || body.customer?.id || null,
      status: body.status || 'open',
      issued_at: invoiceDate,
      due_at: dueDate,
      subtotal: body.subtotal ?? 0,
      tax_total: body.tax_total ?? body.tax_amount ?? 0,
      grand_total: body.grand_total ?? body.total ?? 0,
      attachment_url: body.attachment_url || null,
      source_type: body.source_type || null,
      source_id: body.source_id || null,
    };
  }

  private normalizeLines(body: any) {
    const lines = body.invoice_lines || body.lines || [];
    if (!Array.isArray(lines)) return [];

    return lines.map((line: any) => {
      const qty = Number(line.qty ?? 0);
      const unitPrice = Number(line.unit_price ?? line.unitPrice ?? 0);
      const lineTotal = Number(line.line_total ?? lineTotalSafe(qty, unitPrice));

      return {
        item_id: line.item_id || null,
        description: line.description || line.item?.name || 'Item',
        qty,
        unit_price: unitPrice,
        tax_code_id: line.tax_code_id || null,
        line_total: lineTotal,
        is_service: line.is_service ?? false,
      };
    });

    function lineTotalSafe(qty: number, unitPrice: number) {
      return qty * unitPrice;
    }
  }

  private calcTotals(lines: any[]) {
    const subtotal = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unit_price || 0), 0);
    const total = subtotal;
    return { subtotal, total };
  }

  async create(orgId: string, body: any) {
    const lines = this.normalizeLines(body);
    const totals = lines.length > 0 ? this.calcTotals(lines) : null;

    const data = this.buildInvoiceData(body, orgId);
    if (!data.customer_id) {
      const fallbackCustomer = await this.prisma.customers.findFirst({
        where: { org_id: orgId },
        orderBy: { created_at: 'asc' },
      });
      if (fallbackCustomer) {
        data.customer_id = fallbackCustomer.id;
      }
    }

    if (!data.customer_id) {
      throw new BadRequestException('Customer is required');
    }

    await this.assertCustomerBelongsToOrg(data.customer_id, orgId);
    if (data.purchase_order_id) {
      await this.assertPurchaseOrderBelongsToOrg(data.purchase_order_id, orgId);
    }
    await this.assertInvoiceLineReferencesBelongToOrg(lines, orgId);

    if (totals) {
      data.subtotal = totals.subtotal;
      const taxTotal = Number(data.tax_total || 0);
      data.grand_total = totals.subtotal + taxTotal;
    }

    const created = await this.prisma.invoices.create({
      data,
    });

    if (lines.length > 0) {
      await this.prisma.invoice_lines.createMany({
        data: lines.map((line: any) => ({
          ...line,
          org_id: orgId,
          invoice_id: created.id,
        })),
      });
    }

    return this.findOne(created.id, orgId);
  }

  async update(id: string, orgId: string, body: any) {
    await this.findOne(id, orgId);
    const lines = this.normalizeLines(body);
    const totals = lines.length > 0 ? this.calcTotals(lines) : null;

    const data = this.buildInvoiceData(body, orgId);
    delete (data as any).org_id;
    if (!body.customer_id && !body.customer?.id) delete (data as any).customer_id;
    if (body.purchase_order_id === undefined) delete (data as any).purchase_order_id;
    if (!body.invoice_number && !body.invoice_no && !body.number) delete (data as any).invoice_number;
    if (!body.invoice_date && !body.issued_at) delete (data as any).issued_at;
    if (body.due_date === undefined && body.due_at === undefined) delete (data as any).due_at;

    if (body.customer_id === null || body.customer?.id === null) {
      throw new BadRequestException('Customer cannot be empty');
    }
    if (body.customer_id || body.customer?.id) {
      await this.assertCustomerBelongsToOrg(body.customer_id || body.customer.id, orgId);
    }
    if (body.purchase_order_id !== undefined && body.purchase_order_id !== null) {
      await this.assertPurchaseOrderBelongsToOrg(body.purchase_order_id, orgId);
    }
    await this.assertInvoiceLineReferencesBelongToOrg(lines, orgId);

    if (totals) {
      data.subtotal = totals.subtotal;
      const taxTotal = Number(data.tax_total || 0);
      data.grand_total = totals.subtotal + taxTotal;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invoices.update({
        where: { id },
        data,
      });

      if (lines.length > 0) {
        await tx.invoice_lines.deleteMany({ where: { invoice_id: id } });
        await tx.invoice_lines.createMany({
          data: lines.map((line: any) => ({
            ...line,
            org_id: orgId,
            invoice_id: id,
          })),
        });
      }
    });

    return this.findOne(id, orgId);
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);

    await this.prisma.invoice_lines.deleteMany({ where: { invoice_id: id } });
    await this.prisma.invoices.delete({ where: { id } });

    return { success: true, message: 'Invoice deleted successfully' };
  }

  private async assertCustomerBelongsToOrg(customerId: string, orgId: string) {
    const customer = await this.prisma.customers.findFirst({
      where: { id: customerId, org_id: orgId },
      select: { id: true },
    });

    if (!customer) {
      throw new BadRequestException('Invalid customer for this organization');
    }
  }

  private async assertPurchaseOrderBelongsToOrg(purchaseOrderId: string, orgId: string) {
    const purchaseOrder = await this.prisma.purchase_orders.findFirst({
      where: { id: purchaseOrderId, org_id: orgId, is_deleted: false },
      select: { id: true },
    });

    if (!purchaseOrder) {
      throw new BadRequestException('Invalid purchase order for this organization');
    }
  }

  private async assertInvoiceLineReferencesBelongToOrg(lines: any[], orgId: string) {
    if (!Array.isArray(lines) || lines.length === 0) return;

    const itemIds = Array.from(
      new Set(lines.map((line) => line.item_id).filter((id): id is string => Boolean(id))),
    );
    if (itemIds.length > 0) {
      const items = await this.prisma.items.findMany({
        where: {
          org_id: orgId,
          id: { in: itemIds },
        },
        select: { id: true },
      });
      if (items.length !== itemIds.length) {
        throw new BadRequestException('One or more invoice items are invalid for this organization');
      }
    }

    const taxCodeIds = Array.from(
      new Set(lines.map((line) => line.tax_code_id).filter((id): id is string => Boolean(id))),
    );
    if (taxCodeIds.length > 0) {
      const taxCodes = await this.prisma.tax_codes.findMany({
        where: {
          org_id: orgId,
          id: { in: taxCodeIds },
        },
        select: { id: true },
      });
      if (taxCodes.length !== taxCodeIds.length) {
        throw new BadRequestException('One or more invoice tax codes are invalid for this organization');
      }
    }
  }
}
