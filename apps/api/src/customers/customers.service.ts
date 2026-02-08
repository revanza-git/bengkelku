import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.customers.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const customer = await this.prisma.customers.findFirst({
      where: { id, org_id: orgId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async create(createCustomerDto: CreateCustomerDto, orgId: string) {
    return this.prisma.customers.create({
      data: {
        ...createCustomerDto,
        org_id: orgId,
      },
    });
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, orgId: string) {
    await this.findOne(id, orgId);

    return this.prisma.customers.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);

    await this.prisma.customers.delete({
      where: { id },
    });

    return { success: true, message: 'Customer deleted successfully' };
  }
}
