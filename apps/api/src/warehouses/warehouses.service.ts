import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.warehouses.findMany({
      where: { org_id: orgId },
      include: { bins: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const warehouse = await this.prisma.warehouses.findFirst({
      where: { id, org_id: orgId },
      include: { bins: true },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return warehouse;
  }

  async create(createWarehouseDto: CreateWarehouseDto, orgId: string) {
    return this.prisma.warehouses.create({
      data: {
        ...createWarehouseDto,
        org_id: orgId,
      },
    });
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto, orgId: string) {
    await this.findOne(id, orgId);

    return this.prisma.warehouses.update({
      where: { id },
      data: updateWarehouseDto,
    });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);

    await this.prisma.warehouses.delete({
      where: { id },
    });

    return { success: true, message: 'Warehouse deleted successfully' };
  }

  async getInventoryByWarehouse(warehouseId: string, orgId: string) {
    await this.findOne(warehouseId, orgId);

    return this.prisma.$queryRaw`
      SELECT 
        i.id as item_id,
        i.sku,
        i.name,
        COALESCE(SUM(it.qty), 0) as qty_onhand
      FROM items i
      LEFT JOIN inventory_transactions it ON it.item_id = i.id AND it.warehouse_id = ${warehouseId}::uuid
      WHERE i.org_id = ${orgId}::uuid
        AND i.is_stock = true
      GROUP BY i.id, i.sku, i.name
      HAVING COALESCE(SUM(it.qty), 0) > 0
      ORDER BY i.name
    `;
  }
}
