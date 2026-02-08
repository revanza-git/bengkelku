import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface InventoryTransactionFilters {
  item_id?: string;
  warehouse_id?: string;
  trx_type?: string;
  date_from?: string;
  date_to?: string;
}

@Injectable()
export class InventoryTransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, filters: InventoryTransactionFilters = {}) {
    const trxType = this.normalizeTrxType(filters.trx_type);
    const createdAtFilter =
      filters.date_from || filters.date_to
        ? {
            ...(filters.date_from ? { gte: new Date(filters.date_from) } : {}),
            ...(filters.date_to ? { lte: new Date(filters.date_to) } : {}),
          }
        : undefined;

    return this.prisma.inventory_transactions.findMany({
      where: {
        org_id: orgId,
        ...(filters.item_id ? { item_id: filters.item_id } : {}),
        ...(filters.warehouse_id ? { warehouse_id: filters.warehouse_id } : {}),
        ...(trxType ? { trx_type: trxType as any } : {}),
        ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
      },
      include: {
        items: true,
        warehouses: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(orgId: string, data: any) {
    const trxType = this.normalizeTrxType(data.trx_type);

    return this.prisma.inventory_transactions.create({
      data: {
        ...data,
        trx_type: trxType as any,
        unit_cost: data.unit_cost ?? 0,
        org_id: orgId,
      },
    });
  }

  private normalizeTrxType(trxType?: string) {
    if (!trxType) return undefined;
    if (trxType === 'ADJ+') return 'ADJ_PLUS';
    if (trxType === 'ADJ-') return 'ADJ_MINUS';
    return trxType;
  }
}
