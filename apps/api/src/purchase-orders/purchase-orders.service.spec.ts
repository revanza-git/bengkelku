import { BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let prisma: {
    suppliers: { findFirst: jest.Mock };
    customers: { findFirst: jest.Mock };
    items: { findMany: jest.Mock };
    purchase_orders: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      suppliers: { findFirst: jest.fn() },
      customers: { findFirst: jest.fn() },
      items: { findMany: jest.fn() },
      purchase_orders: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    service = new PurchaseOrdersService(prisma as unknown as PrismaService);
  });

  it('rejects create when supplier does not belong to the actor org', async () => {
    prisma.suppliers.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          supplier_id: 'supplier-other-org',
          lines: [{ item_id: 'item-1', qty: 1, unit_cost: 10 }],
        },
        'user-1',
        'org-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects create when one or more PO line items are outside the actor org', async () => {
    prisma.suppliers.findFirst.mockResolvedValue({ id: 'supplier-1' });
    prisma.items.findMany.mockResolvedValue([{ id: 'item-1' }]);

    await expect(
      service.create(
        {
          supplier_id: 'supplier-1',
          lines: [
            { item_id: 'item-1', qty: 1, unit_cost: 10 },
            { item_id: 'item-other-org', qty: 2, unit_cost: 20 },
          ],
        },
        'user-1',
        'org-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
