import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getOnHand(orgId: string) {
    return this.prisma.$queryRaw`
      SELECT item_id,
             warehouse_id,
             COALESCE(SUM(qty), 0) as qty_onhand
      FROM inventory_transactions
      WHERE org_id = ${orgId}::uuid
      GROUP BY item_id, warehouse_id
    `;
  }

  async getAvailableSummary(orgId: string) {
    return this.prisma.$queryRaw`
      SELECT COALESCE(it.item_id, r.item_id) as item_id,
             COALESCE(it.warehouse_id, r.warehouse_id) as warehouse_id,
             COALESCE(it.on_hand, 0) as on_hand,
             COALESCE(r.reserved, 0) as reserved,
             COALESCE(it.on_hand, 0) - COALESCE(r.reserved, 0) as available
      FROM (
        SELECT item_id, warehouse_id, SUM(qty) as on_hand
        FROM inventory_transactions
        WHERE org_id = ${orgId}::uuid
        GROUP BY item_id, warehouse_id
      ) it
      FULL OUTER JOIN (
        SELECT item_id, warehouse_id, SUM(qty) as reserved
        FROM reservations
        WHERE org_id = ${orgId}::uuid
        GROUP BY item_id, warehouse_id
      ) r
      ON it.item_id = r.item_id AND it.warehouse_id = r.warehouse_id
    `;
  }

  async getAvailableForItem(orgId: string, itemId: string, warehouseId?: string) {
    const rows = await this.getAvailableSummary(orgId);
    const filtered = (rows as any[]).filter((row) => {
      if (row.item_id !== itemId) return false;
      if (warehouseId && row.warehouse_id !== warehouseId) return false;
      return true;
    });
    return filtered;
  }
}
