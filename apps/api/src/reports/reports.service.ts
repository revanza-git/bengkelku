import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from '../items/items.service';
import { StockMovementsQueryDto } from './dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemsService: ItemsService,
  ) {}

  async getLowStock(orgId: string) {
    return this.itemsService.getLowStock(orgId);
  }

  async getStockMovements(orgId: string, query: StockMovementsQueryDto) {
    const trxType = this.normalizeTrxType(query.trx_type);
    const createdAtFilter =
      query.date_from || query.date_to
        ? {
            ...(query.date_from ? { gte: new Date(query.date_from) } : {}),
            ...(query.date_to ? { lte: new Date(query.date_to) } : {}),
          }
        : undefined;

    return this.prisma.inventory_transactions.findMany({
      where: {
        org_id: orgId,
        ...(query.item_id ? { item_id: query.item_id } : {}),
        ...(query.warehouse_id ? { warehouse_id: query.warehouse_id } : {}),
        ...(trxType ? { trx_type: trxType as any } : {}),
        ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
      },
      include: {
        items: true,
        warehouses: true,
      },
      orderBy: { created_at: 'desc' },
      take: 1000,
    });
  }

  private normalizeTrxType(trxType?: string) {
    if (!trxType) return undefined;
    if (trxType === 'ADJ+') return 'ADJ_PLUS';
    if (trxType === 'ADJ-') return 'ADJ_MINUS';
    return trxType;
  }
}
