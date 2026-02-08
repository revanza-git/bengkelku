import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.suppliers.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const supplier = await this.prisma.suppliers.findFirst({
      where: { id, org_id: orgId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async create(createSupplierDto: CreateSupplierDto, orgId: string) {
    return this.prisma.suppliers.create({
      data: {
        ...createSupplierDto,
        org_id: orgId,
      },
    });
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto, orgId: string) {
    await this.findOne(id, orgId);

    return this.prisma.suppliers.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);

    await this.prisma.suppliers.delete({
      where: { id },
    });

    return { success: true, message: 'Supplier deleted successfully' };
  }
}
