import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryOrderDto, UpdateDeliveryOrderDto, ProcessDeliveryDto } from './dto';
import { Decimal } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeliveryOrdersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findAll(orgId: string) {
    return this.prisma.delivery_orders.findMany({
      where: { org_id: orgId },
      include: {
        purchase_orders: {
          include: {
            suppliers: true,
          },
        },
        customers: true,
        delivery_order_lines: {
          include: {
            items: true,
            warehouses: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const deliveryOrder = await this.prisma.delivery_orders.findFirst({
      where: { id, org_id: orgId },
      include: {
        purchase_orders: {
          include: {
            suppliers: true,
            po_lines: {
              include: {
                items: true,
              },
            },
          },
        },
        customers: true,
        delivery_order_lines: {
          include: {
            items: true,
            warehouses: true,
          },
        },
        delivery_expenses: {
          include: {
            expense_types: true,
          },
        },
      },
    });

    if (!deliveryOrder) {
      throw new NotFoundException(`Delivery Order with ID ${id} not found`);
    }

    return deliveryOrder;
  }

  async create(createDeliveryOrderDto: CreateDeliveryOrderDto, userId: string, orgId: string) {
    const { lines, ...doData } = createDeliveryOrderDto;

    await this.assertPurchaseOrderBelongsToOrg(doData.purchase_order_id, orgId);
    if (doData.customer_id) {
      await this.assertCustomerBelongsToOrg(doData.customer_id, orgId);
    }
    await this.assertItemsBelongToOrg((lines || []).map((line) => line.item_id), orgId);
    await this.assertWarehousesBelongToOrg((lines || []).map((line) => line.warehouse_id), orgId);
    await this.assertPoLinesBelongToOrder(lines || [], doData.purchase_order_id, orgId);

    // Generate delivery number
    const deliveryNumber = await this.generateDeliveryNumber();

    return this.prisma.$transaction(async (tx) => {
      // Create DO
      const deliveryOrder = await tx.delivery_orders.create({
        data: {
          delivery_number: deliveryNumber,
          purchase_order_id: doData.purchase_order_id,
          customer_id: doData.customer_id,
          delivery_date: new Date(doData.delivery_date),
          notes: doData.notes,
          org_id: orgId,
          created_by: userId,
          status: 'draft',
        },
      });

      // Create DO lines
      if (lines && lines.length > 0) {
        await tx.delivery_order_lines.createMany({
          data: lines.map((line) => ({
            delivery_order_id: deliveryOrder.id,
            po_line_id: line.po_line_id,
            item_id: line.item_id,
            qty_ordered: line.qty_ordered,
            qty_delivered: line.qty_delivered,
            warehouse_id: line.warehouse_id,
            org_id: orgId,
          })),
        });
      }

      // Update PO status
      await tx.purchase_orders.update({
        where: { id: doData.purchase_order_id },
        data: { status: 'pending' },
      });

      return this.findOne(deliveryOrder.id, orgId);
    });
  }

  async update(id: string, updateDeliveryOrderDto: UpdateDeliveryOrderDto, orgId: string) {
    const deliveryOrder = await this.findOne(id, orgId);

    if (deliveryOrder.status === 'delivered') {
      throw new BadRequestException('Cannot update a delivered order');
    }

    const updateData: any = {};
    if (updateDeliveryOrderDto.delivery_date) updateData.delivery_date = new Date(updateDeliveryOrderDto.delivery_date);
    if (updateDeliveryOrderDto.actual_delivery_date) updateData.actual_delivery_date = new Date(updateDeliveryOrderDto.actual_delivery_date);
    if (updateDeliveryOrderDto.notes !== undefined) updateData.notes = updateDeliveryOrderDto.notes;
    if (updateDeliveryOrderDto.status) updateData.status = updateDeliveryOrderDto.status;

    return this.prisma.delivery_orders.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Process Delivery - This replaces the Supabase edge function `process-delivery`
   * 
   * Complex operations:
   * 1. Create inventory transactions (SHIP_PO, negative qty for outgoing stock)
   * 2. Release reservations
   * 3. Create auto-journal entry (DR: COGS, CR: Inventory)
   * 4. Update delivery order status
   * 5. Update purchase order status
   */
  async processDelivery(id: string, processDeliveryDto: ProcessDeliveryDto, orgId: string) {
    const deliveryOrder = await this.prisma.delivery_orders.findFirst({
      where: { id, org_id: orgId },
      include: {
        delivery_order_lines: {
          include: {
            items: true,
          },
        },
        purchase_orders: {
          include: {
            po_lines: true,
          },
        },
      },
    });

    if (!deliveryOrder) {
      throw new NotFoundException(`Delivery Order with ID ${id} not found`);
    }

    if (deliveryOrder.status === 'delivered') {
      throw new BadRequestException('This delivery order has already been processed');
    }

    const financeEnabled = this.isFeatureEnabled(
      this.configService.get<string>('FEATURE_FINANCE'),
      true,
    );
    const allowNegativeStock = this.isFeatureEnabled(
      this.configService.get<string>('ALLOW_NEGATIVE_STOCK'),
      false,
    );

    let inventoryAccount: { gl_account_id: string } | null = null;
    let cogsAccount: { gl_account_id: string } | null = null;

    if (financeEnabled) {
      [inventoryAccount, cogsAccount] = await Promise.all([
        this.prisma.account_settings.findFirst({
          where: { org_id: orgId, setting_key: 'inventory_account' },
          select: { gl_account_id: true },
        }),
        this.prisma.account_settings.findFirst({
          where: { org_id: orgId, setting_key: 'cogs_account' },
          select: { gl_account_id: true },
        }),
      ]);
    }

    return this.prisma.$transaction(async (tx) => {
      const actualDeliveryDate = new Date(processDeliveryDto.actual_delivery_date);
      let totalCost = new Decimal(0);

      // Process each delivery line
      for (const line of deliveryOrder.delivery_order_lines) {
        const qtyDelivered = Number(line.qty_delivered);
        if (qtyDelivered <= 0) {
          continue;
        }

        const onHand = await this.getOnHandQty(tx, orgId, line.item_id, line.warehouse_id);
        if (!allowNegativeStock && onHand < qtyDelivered) {
          throw new BadRequestException(
            `Insufficient stock for item ${line.items.sku || line.item_id}. On-hand: ${onHand}, requested: ${qtyDelivered}`,
          );
        }

        const unitCost = Number(line.items.base_cost || 0);
        const lineCost = qtyDelivered * unitCost;
        totalCost = totalCost.add(new Decimal(lineCost));

        // 1. Create inventory transaction (SHIP_PO - negative qty for stock out)
        await tx.inventory_transactions.create({
          data: {
            org_id: orgId,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            trx_type: 'SHIP_PO',
            ref_table: 'delivery_orders',
            ref_id: deliveryOrder.id,
            qty: -qtyDelivered, // Negative for stock out
            unit_cost: unitCost,
          },
        });

        // 2. Release reservations for this item
        await tx.reservations.deleteMany({
          where: {
            org_id: orgId,
            doc_type: 'PO',
            doc_id: deliveryOrder.purchase_order_id,
            item_id: line.item_id,
          },
        });
      }

      // 3. Create journal entry for COGS (optional in MVP mode)
      if (financeEnabled && inventoryAccount?.gl_account_id && cogsAccount?.gl_account_id && totalCost.greaterThan(0)) {
        const journalEntry = await tx.journal_entries.create({
          data: {
            org_id: orgId,
            memo: `Delivery ${deliveryOrder.delivery_number} - Cost of Goods Sold`,
            posted_at: actualDeliveryDate,
          },
        });

        // DR: COGS (expense increases)
        await tx.journal_lines.create({
          data: {
            org_id: orgId,
            entry_id: journalEntry.id,
            gl_account_id: cogsAccount.gl_account_id,
            dr: totalCost,
            cr: new Decimal(0),
          },
        });

        // CR: Inventory (asset decreases)
        await tx.journal_lines.create({
          data: {
            org_id: orgId,
            entry_id: journalEntry.id,
            gl_account_id: inventoryAccount.gl_account_id,
            dr: new Decimal(0),
            cr: totalCost,
          },
        });
      }

      // 4. Update delivery order status
      await tx.delivery_orders.update({
        where: { id },
        data: {
          status: 'delivered',
          actual_delivery_date: actualDeliveryDate,
        },
      });

      // 5. Check if all deliveries for the PO are complete and update PO status
      const allDeliveries = await tx.delivery_orders.findMany({
        where: { purchase_order_id: deliveryOrder.purchase_order_id },
      });

      const allDelivered = allDeliveries.every((d) => d.status === 'delivered');
      const someDelivered = allDeliveries.some((d) => d.status === 'delivered');

      let newPoStatus: string;
      if (allDelivered) {
        newPoStatus = 'delivered';
      } else if (someDelivered) {
        newPoStatus = 'partial_delivery';
      } else {
        newPoStatus = 'pending';
      }

      await tx.purchase_orders.update({
        where: { id: deliveryOrder.purchase_order_id },
        data: { 
          status: newPoStatus as any,
          actual_delivery_date: allDelivered ? actualDeliveryDate : null,
        },
      });

      return {
        success: true,
        message: 'Issue/consumption processed successfully',
        delivery_order_id: id,
        total_cost: totalCost.toNumber(),
      };
    });
  }

  async remove(id: string, orgId: string) {
    const deliveryOrder = await this.findOne(id, orgId);

    if (deliveryOrder.status === 'delivered') {
      throw new BadRequestException('Cannot delete a delivered order');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete delivery order lines first
      await tx.delivery_order_lines.deleteMany({
        where: { delivery_order_id: id },
      });

      // Delete delivery expenses
      await tx.delivery_expenses.deleteMany({
        where: { delivery_order_id: id },
      });

      // Delete delivery order
      await tx.delivery_orders.delete({
        where: { id },
      });
    });

    return { success: true, message: 'Delivery Order deleted successfully' };
  }

  private async generateDeliveryNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SJ-${dateStr}-`;

    const lastDo = await this.prisma.delivery_orders.findFirst({
      where: {
        delivery_number: {
          startsWith: prefix,
        },
      },
      orderBy: {
        delivery_number: 'desc',
      },
    });

    let sequence = 1;
    if (lastDo) {
      const lastSeq = parseInt(lastDo.delivery_number.replace(prefix, ''), 10);
      sequence = isNaN(lastSeq) ? 1 : lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  }

  private async assertPurchaseOrderBelongsToOrg(purchaseOrderId: string, orgId: string) {
    const po = await this.prisma.purchase_orders.findFirst({
      where: { id: purchaseOrderId, org_id: orgId, is_deleted: false },
      select: { id: true },
    });

    if (!po) {
      throw new BadRequestException('Invalid purchase order for this organization');
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

  private async assertWarehousesBelongToOrg(warehouseIds: string[], orgId: string) {
    const uniqueWarehouseIds = Array.from(new Set(warehouseIds.filter(Boolean)));
    if (uniqueWarehouseIds.length === 0) return;

    const warehouses = await this.prisma.warehouses.findMany({
      where: {
        org_id: orgId,
        id: { in: uniqueWarehouseIds },
      },
      select: { id: true },
    });

    if (warehouses.length !== uniqueWarehouseIds.length) {
      throw new BadRequestException('One or more warehouses are invalid for this organization');
    }
  }

  private async assertPoLinesBelongToOrder(
    lines: CreateDeliveryOrderDto['lines'],
    purchaseOrderId: string,
    orgId: string,
  ) {
    const poLineIds = lines
      .map((line) => line.po_line_id)
      .filter((id): id is string => Boolean(id));
    const uniquePoLineIds = Array.from(new Set(poLineIds));
    if (uniquePoLineIds.length === 0) return;

    const poLines = await this.prisma.po_lines.findMany({
      where: {
        org_id: orgId,
        purchase_order_id: purchaseOrderId,
        id: { in: uniquePoLineIds },
      },
      select: {
        id: true,
        item_id: true,
      },
    });

    if (poLines.length !== uniquePoLineIds.length) {
      throw new BadRequestException('One or more PO lines are invalid for this purchase order');
    }

    const poLineMap = new Map(poLines.map((row) => [row.id, row.item_id]));
    for (const line of lines) {
      if (!line.po_line_id) continue;
      const expectedItemId = poLineMap.get(line.po_line_id);
      if (!expectedItemId || expectedItemId !== line.item_id) {
        throw new BadRequestException('PO line item mismatch for this organization');
      }
    }
  }

  private async getOnHandQty(
    tx: PrismaService | any,
    orgId: string,
    itemId: string,
    warehouseId: string,
  ): Promise<number> {
    const aggregate = await tx.inventory_transactions.aggregate({
      where: {
        org_id: orgId,
        item_id: itemId,
        warehouse_id: warehouseId,
      },
      _sum: { qty: true },
    });

    return Number(aggregate?._sum?.qty || 0);
  }

  private isFeatureEnabled(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
  }
}
