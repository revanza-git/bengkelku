import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: {
    customers: { findFirst: jest.Mock };
    purchase_orders: { findFirst: jest.Mock };
    items: { findMany: jest.Mock };
    tax_codes: { findMany: jest.Mock };
    invoices: { create: jest.Mock };
    invoice_lines: { createMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      customers: { findFirst: jest.fn() },
      purchase_orders: { findFirst: jest.fn() },
      items: { findMany: jest.fn() },
      tax_codes: { findMany: jest.fn() },
      invoices: { create: jest.fn() },
      invoice_lines: { createMany: jest.fn() },
    };

    service = new InvoicesService(prisma as unknown as PrismaService);
  });

  it('rejects create when customer does not belong to actor org', async () => {
    prisma.customers.findFirst.mockResolvedValue(null);

    await expect(
      service.create('org-1', {
        customer_id: 'customer-other-org',
        lines: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects create when invoice line item is outside actor org', async () => {
    prisma.customers.findFirst.mockResolvedValue({ id: 'customer-1' });
    prisma.items.findMany.mockResolvedValue([]);

    await expect(
      service.create('org-1', {
        customer_id: 'customer-1',
        lines: [{ item_id: 'item-other-org', qty: 1, unit_price: 100 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
