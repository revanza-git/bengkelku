import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, includeDeleted = false) {
    return this.prisma.purchase_orders.findMany({
      where: { 
        org_id: orgId,
        ...(includeDeleted ? {} : { is_deleted: false }),
      },
      include: {
        suppliers: true,
        customers: true,
        po_lines: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const po = await this.prisma.purchase_orders.findFirst({
      where: { id, org_id: orgId, is_deleted: false },
      include: {
        suppliers: true,
        customers: true,
        po_lines: {
          include: {
            items: true,
          },
        },
        delivery_orders: {
          include: {
            delivery_order_lines: true,
          },
        },
        invoices: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    return po;
  }

  async create(createPurchaseOrderDto: CreatePurchaseOrderDto, userId: string, orgId: string) {
    const { lines, ...poData } = createPurchaseOrderDto;

    await this.assertSupplierBelongsToOrg(poData.supplier_id, orgId);
    if (poData.customer_id) {
      await this.assertCustomerBelongsToOrg(poData.customer_id, orgId);
    }
    await this.assertItemsBelongToOrg((lines || []).map((line) => line.item_id), orgId);

    // Generate PO number
    const poNumber = await this.generatePoNumber();

    return this.prisma.$transaction(async (tx) => {
      // Create PO
      const po = await tx.purchase_orders.create({
        data: {
          supplier_id: poData.supplier_id,
          customer_id: poData.customer_id,
          eta_date: poData.eta_date ? new Date(poData.eta_date) : null,
          planned_delivery_start: poData.planned_delivery_start ? new Date(poData.planned_delivery_start) : null,
          currency: poData.currency || 'IDR',
          notes: poData.notes,
          po_number: poNumber,
          org_id: orgId,
          created_by: userId,
          status: 'draft',
        },
      });

      // Create PO lines
      if (lines && lines.length > 0) {
        await tx.po_lines.createMany({
          data: lines.map((line) => ({
            item_id: line.item_id,
            qty: line.qty,
            unit_cost: line.unit_cost,
            org_id: orgId,
            purchase_order_id: po.id,
          })),
        });
      }

      return this.findOne(po.id, orgId);
    });
  }

  async update(id: string, updatePurchaseOrderDto: UpdatePurchaseOrderDto, orgId: string) {
    const po = await this.findOne(id, orgId);

    // Can only update draft or submitted POs
    const status = po.status as string;
    if (!['draft', 'submitted'].includes(status)) {
      throw new BadRequestException(`Cannot update PO with status: ${status}`);
    }

    const updateData: any = {};
    if (updatePurchaseOrderDto.supplier_id) {
      await this.assertSupplierBelongsToOrg(updatePurchaseOrderDto.supplier_id, orgId);
      updateData.supplier_id = updatePurchaseOrderDto.supplier_id;
    }
    if (updatePurchaseOrderDto.customer_id) {
      await this.assertCustomerBelongsToOrg(updatePurchaseOrderDto.customer_id, orgId);
      updateData.customer_id = updatePurchaseOrderDto.customer_id;
    }
    if (updatePurchaseOrderDto.eta_date) updateData.eta_date = new Date(updatePurchaseOrderDto.eta_date);
    if (updatePurchaseOrderDto.planned_delivery_start) updateData.planned_delivery_start = new Date(updatePurchaseOrderDto.planned_delivery_start);
    if (updatePurchaseOrderDto.actual_delivery_date) updateData.actual_delivery_date = new Date(updatePurchaseOrderDto.actual_delivery_date);
    if (updatePurchaseOrderDto.currency) updateData.currency = updatePurchaseOrderDto.currency;
    if (updatePurchaseOrderDto.notes !== undefined) updateData.notes = updatePurchaseOrderDto.notes;
    if (updatePurchaseOrderDto.status) updateData.status = updatePurchaseOrderDto.status;

    return this.prisma.purchase_orders.update({
      where: { id },
      data: updateData,
      include: {
        suppliers: true,
        customers: true,
        po_lines: {
          include: {
            items: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: string, orgId: string, userId?: string) {
    await this.findOne(id, orgId);

    const updateData: any = { status };

    if (status === 'approved' && userId) {
      updateData.approved_by = userId;
      updateData.approved_at = new Date();
    }

    return this.prisma.purchase_orders.update({
      where: { id },
      data: updateData,
    });
  }

  async softDelete(id: string, orgId: string) {
    await this.findOne(id, orgId);

    await this.prisma.purchase_orders.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });

    return { success: true, message: 'Purchase Order deleted successfully' };
  }

  async reserveStock(id: string, orgId: string) {
    const po = await this.prisma.purchase_orders.findFirst({
      where: { id, org_id: orgId, is_deleted: false },
      include: {
        po_lines: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    if (po.status !== 'approved') {
      throw new BadRequestException('Only approved POs can have stock reserved');
    }

    // Get default warehouse
    const warehouse = await this.prisma.warehouses.findFirst({
      where: { org_id: orgId },
    });

    if (!warehouse) {
      throw new BadRequestException('No warehouse found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create reservations for each line
      for (const line of po.po_lines) {
        await tx.reservations.create({
          data: {
            org_id: orgId,
            doc_type: 'PO',
            doc_id: po.id,
            item_id: line.item_id,
            qty: line.qty,
            warehouse_id: warehouse.id,
          },
        });
      }

      // Update PO status to 'pending' (since 'reserved' may not be in enum)
      await tx.purchase_orders.update({
        where: { id },
        data: { status: 'pending' },
      });

      return { success: true, message: 'Stock reserved successfully' };
    });
  }

  private async assertSupplierBelongsToOrg(supplierId: string, orgId: string) {
    const supplier = await this.prisma.suppliers.findFirst({
      where: { id: supplierId, org_id: orgId },
      select: { id: true },
    });

    if (!supplier) {
      throw new BadRequestException('Invalid supplier for this organization');
    }
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

  private async assertItemsBelongToOrg(itemIds: string[], orgId: string) {
    const uniqueItemIds = Array.from(new Set(itemIds.filter(Boolean)));
    if (uniqueItemIds.length === 0) return;

    const items = await this.prisma.items.findMany({
      where: {
        org_id: orgId,
        id: { in: uniqueItemIds },
      },
      select: { id: true },
    });

    if (items.length !== uniqueItemIds.length) {
      throw new BadRequestException('One or more items are invalid for this organization');
    }
  }

  private async generatePoNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${dateStr}-`;

    const lastPo = await this.prisma.purchase_orders.findFirst({
      where: {
        po_number: {
          startsWith: prefix,
        },
      },
      orderBy: {
        po_number: 'desc',
      },
    });

    let sequence = 1;
    if (lastPo && lastPo.po_number) {
      const lastSeq = parseInt(lastPo.po_number.replace(prefix, ''), 10);
      sequence = isNaN(lastSeq) ? 1 : lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  }
}
