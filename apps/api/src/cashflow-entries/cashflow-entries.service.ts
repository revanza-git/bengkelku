import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashflowEntriesService {
  constructor(private prisma: PrismaService) {}

  private mapEntry(entry: any) {
    if (!entry) return entry;
    return {
      ...entry,
      type: entry.type,
      entry_number: entry.entry_number || `CF-${entry.id?.slice(0, 8)}`,
    };
  }

  async findAll(orgId: string) {
    const entries = await this.prisma.cashflow_entries.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    });

    return entries.map((entry) => this.mapEntry(entry));
  }

  async findOne(id: string, orgId: string) {
    const entry = await this.prisma.cashflow_entries.findFirst({
      where: { id, org_id: orgId },
    });

    if (!entry) {
      throw new NotFoundException(`Cashflow entry with ID ${id} not found`);
    }

    return this.mapEntry(entry);
  }

  private buildData(body: any, orgId: string, userId: string) {
    const entryDate = body.entry_date || null;
    const plannedDate = body.planned_date || null;
    const status = body.status || 'planned';
    const actualDate = body.actual_date || (status === 'paid' ? entryDate || plannedDate : null);
    const entryNumber = body.entry_number || `CF-${Date.now()}`;

    return {
      org_id: orgId,
      created_by: userId,
      entry_number: entryNumber,
      entry_date: entryDate,
      planned_date: plannedDate,
      actual_date: actualDate,
      type: body.type,
      category: body.category || null,
      reference_type: body.reference_type || null,
      reference_id: body.reference_id || null,
      description: body.description || null,
      amount: body.amount ?? 0,
      payment_method: body.payment_method || null,
      status,
      notes: body.notes || null,
    };
  }

  async create(orgId: string, userId: string, body: any) {
    const data = this.buildData(body, orgId, userId);

    const entry = await this.prisma.cashflow_entries.create({
      data,
    });

    return this.mapEntry(entry);
  }

  async update(id: string, orgId: string, userId: string, body: any) {
    await this.findOne(id, orgId);
    const data = this.buildData(body, orgId, userId);
    delete (data as any).org_id;
    delete (data as any).created_by;

    const entry = await this.prisma.cashflow_entries.update({
      where: { id },
      data,
    });

    return this.mapEntry(entry);
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    await this.prisma.cashflow_entries.delete({ where: { id } });

    return { success: true, message: 'Cashflow entry deleted successfully' };
  }
}
