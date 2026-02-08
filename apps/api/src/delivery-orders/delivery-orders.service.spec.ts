import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryOrdersService } from './delivery-orders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DeliveryOrdersService', () => {
  const deliveryOrderMock = {
    id: 'do-1',
    org_id: 'org-1',
    delivery_number: 'SJ-20260101-001',
    status: 'confirmed',
    purchase_order_id: 'po-1',
    delivery_order_lines: [
      {
        item_id: 'item-1',
        warehouse_id: 'wh-1',
        qty_delivered: 5,
        items: {
          sku: 'PART-001',
          base_cost: 100,
        },
      },
    ],
    purchase_orders: {
      po_lines: [],
    },
  };

  let service: DeliveryOrdersService;
  let prisma: any;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    };

    prisma = {
      delivery_orders: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      purchase_orders: {
        findFirst: jest.fn(),
      },
      customers: {
        findFirst: jest.fn(),
      },
      items: {
        findMany: jest.fn(),
      },
      warehouses: {
        findMany: jest.fn(),
      },
      po_lines: {
        findMany: jest.fn(),
      },
      account_settings: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new DeliveryOrdersService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
    );
  });

  it('rejects processing when stock is insufficient and negative stock is disabled', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'FEATURE_FINANCE') return 'false';
      if (key === 'ALLOW_NEGATIVE_STOCK') return 'false';
      return undefined;
    });

    prisma.delivery_orders.findFirst.mockResolvedValue(deliveryOrderMock);
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        inventory_transactions: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { qty: 2 } }),
          create: jest.fn(),
        },
        reservations: {
          deleteMany: jest.fn(),
        },
        delivery_orders: {
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        purchase_orders: {
          update: jest.fn(),
        },
      }),
    );

    await expect(
      service.processDelivery(
        'do-1',
        { actual_delivery_date: '2026-01-01' },
        'org-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('processes issue successfully and skips finance when FEATURE_FINANCE=false', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'FEATURE_FINANCE') return 'false';
      if (key === 'ALLOW_NEGATIVE_STOCK') return 'false';
      return undefined;
    });

    prisma.delivery_orders.findFirst.mockResolvedValue(deliveryOrderMock);

    const tx = {
      inventory_transactions: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { qty: 8 } }),
        create: jest.fn().mockResolvedValue({}),
      },
      reservations: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      delivery_orders: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest
          .fn()
          .mockResolvedValue([{ status: 'delivered' }, { status: 'delivered' }]),
      },
      purchase_orders: {
        update: jest.fn().mockResolvedValue({}),
      },
      journal_entries: {
        create: jest.fn(),
      },
      journal_lines: {
        create: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const result = await service.processDelivery(
      'do-1',
      { actual_delivery_date: '2026-01-01' },
      'org-1',
    );

    expect(result.success).toBe(true);
    expect(tx.inventory_transactions.create).toHaveBeenCalledTimes(1);
    expect(tx.delivery_orders.update).toHaveBeenCalled();
    expect(tx.purchase_orders.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'delivered' }),
      }),
    );
    expect(tx.journal_entries.create).not.toHaveBeenCalled();
    expect(prisma.account_settings.findFirst).not.toHaveBeenCalled();
  });

  it('rejects create when purchase order is outside actor org', async () => {
    prisma.purchase_orders.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          purchase_order_id: 'po-other-org',
          delivery_date: '2026-01-01',
          lines: [
            {
              item_id: 'item-1',
              qty_ordered: 1,
              qty_delivered: 1,
              warehouse_id: 'wh-1',
            },
          ],
        },
        'user-1',
        'org-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
