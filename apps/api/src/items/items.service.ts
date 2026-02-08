import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto, UpdateItemDto } from './dto';

interface InventorySummaryRow {
  id: string;
  sku: string;
  name: string;
  uom: string;
  base_cost: number | string;
  is_stock: boolean;
  min_stock: number | string | null;
  reorder_point: number | string | null;
  current_stock: number | string;
}

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.items.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const item = await this.prisma.items.findFirst({
      where: { id, org_id: orgId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async create(createItemDto: CreateItemDto, orgId: string) {
    return this.prisma.items.create({
      data: {
        ...createItemDto,
        org_id: orgId,
      },
    });
  }

  async update(id: string, updateItemDto: UpdateItemDto, orgId: string) {
    // Verify item exists and belongs to org
    await this.findOne(id, orgId);

    return this.prisma.items.update({
      where: { id },
      data: updateItemDto,
    });
  }

  async remove(id: string, orgId: string) {
    // Verify item exists and belongs to org
    await this.findOne(id, orgId);

    await this.prisma.items.delete({
      where: { id },
    });

    return { success: true, message: 'Item deleted successfully' };
  }

  async findStockItems(orgId: string) {
    return this.prisma.items.findMany({
      where: { 
        org_id: orgId,
        is_stock: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getInventorySummary(orgId: string) {
    const hasReorderPoint = await this.hasColumn('items', 'reorder_point');

    if (!hasReorderPoint) {
      return this.prisma.$queryRaw`
        SELECT i.id, i.sku, i.name, i.uom, i.base_cost, i.is_stock, i.min_stock,
               CAST(0 AS numeric) as reorder_point,
               COALESCE(SUM(it.qty), 0) as current_stock
        FROM public.items i
        LEFT JOIN public.inventory_transactions it ON it.item_id = i.id
        WHERE i.org_id = ${orgId}::uuid
          AND i.is_stock = true
        GROUP BY i.id, i.sku, i.name, i.uom, i.base_cost, i.is_stock, i.min_stock
        ORDER BY i.name
      `;
    }

    return this.prisma.$queryRaw`
      SELECT i.id, i.sku, i.name, i.uom, i.base_cost, i.is_stock, i.min_stock, i.reorder_point,
             COALESCE(SUM(it.qty), 0) as current_stock
      FROM public.items i
      LEFT JOIN public.inventory_transactions it ON it.item_id = i.id
      WHERE i.org_id = ${orgId}::uuid
        AND i.is_stock = true
      GROUP BY i.id, i.sku, i.name, i.uom, i.base_cost, i.is_stock, i.min_stock, i.reorder_point
      ORDER BY i.name
    `;
  }

  async getLowStock(orgId: string) {
    const summary = (await this.getInventorySummary(orgId)) as InventorySummaryRow[];

    return summary
      .map((row) => {
        const currentStock = Number(row.current_stock || 0);
        const minStock = Number(row.min_stock || 0);
        const reorderPoint = Number(row.reorder_point || 0);
        const threshold = Math.max(minStock, reorderPoint);

        return {
          ...row,
          current_stock: currentStock,
          min_stock: minStock,
          reorder_point: reorderPoint,
          threshold,
          shortage: threshold > currentStock ? threshold - currentStock : 0,
        };
      })
      .filter((row) => row.threshold > 0 && row.current_stock <= row.threshold)
      .sort((a, b) => a.current_stock - b.current_stock);
  }

  async exportItemsCsv(orgId: string) {
    const items = await this.prisma.items.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    });

    const header = [
      'sku',
      'name',
      'uom',
      'base_cost',
      'is_stock',
      'category',
      'min_stock',
      'reorder_point',
    ];

    const rows = items.map((item) => [
      // keep compatibility with environments where Prisma client is generated before schema update
      // and does not yet expose reorder_point in the typed model
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.escapeCsv(String((item as any).sku)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.escapeCsv(String((item as any).name)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.escapeCsv(String((item as any).uom)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.escapeCsv(String((item as any).base_cost ?? 0)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.escapeCsv(String((item as any).is_stock)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.escapeCsv((item as any).category ?? ''),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.escapeCsv(String((item as any).min_stock ?? 0)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.escapeCsv(String((item as any).reorder_point ?? 0)),
    ]);

    return [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  async importItemsCsv(orgId: string, fileBuffer: Buffer) {
    const content = fileBuffer.toString('utf8').replace(/^\uFEFF/, '').trim();
    if (!content) {
      throw new BadRequestException('CSV file is empty');
    }

    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new BadRequestException('CSV must include a header and at least one data row');
    }

    const header = this.parseCsvLine(lines[0]).map((cell) => cell.toLowerCase().trim());

    const required = ['sku', 'name'];
    for (const key of required) {
      if (!header.includes(key)) {
        throw new BadRequestException(`Missing required CSV column: ${key}`);
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      for (let i = 1; i < lines.length; i += 1) {
        const raw = this.parseCsvLine(lines[i]);
        if (!raw.some((cell) => cell.trim().length > 0)) {
          skipped += 1;
          continue;
        }

        const row = header.reduce<Record<string, string>>((acc, key, idx) => {
          acc[key] = (raw[idx] ?? '').trim();
          return acc;
        }, {});

        const sku = row.sku;
        const name = row.name;
        if (!sku || !name) {
          skipped += 1;
          continue;
        }

        const payload = {
          name,
          uom: row.uom || 'unit',
          base_cost: this.parseNumber(row.base_cost, 0),
          is_stock: this.parseBoolean(row.is_stock, true),
          category: row.category || null,
          min_stock: this.parseNumber(row.min_stock, 0),
          reorder_point: this.parseNumber(row.reorder_point, 0),
        };

        const existing = await tx.items.findFirst({
          where: {
            org_id: orgId,
            sku,
          },
          select: { id: true },
        });

        if (existing) {
          await tx.items.update({
            where: { id: existing.id },
            data: payload,
          });
          updated += 1;
        } else {
          await tx.items.create({
            data: {
              org_id: orgId,
              sku,
              ...payload,
            },
          });
          created += 1;
        }
      }
    });

    return {
      created,
      updated,
      skipped,
      total_rows: lines.length - 1,
    };
  }

  private escapeCsv(value: string) {
    const normalized = value ?? '';
    if (/[",\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  }

  private parseNumber(value: string | undefined, fallback: number) {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private parseBoolean(value: string | undefined, fallback: boolean) {
    if (!value) return fallback;
    const lowered = value.toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(lowered)) return true;
    if (['false', '0', 'no', 'n'].includes(lowered)) return false;
    return fallback;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    result.push(current);
    return result;
  }

  private async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
          AND column_name = ${columnName}
      ) as "exists"
    `;

    return Boolean(rows?.[0]?.exists);
  }
}
