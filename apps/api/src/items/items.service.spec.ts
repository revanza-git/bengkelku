import { ItemsService } from './items.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
    };
    service = new ItemsService(prisma as unknown as PrismaService);
  });

  describe('getLowStock', () => {
    it('returns items at or below threshold sorted by current stock', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: '1',
          sku: 'P-001',
          name: 'Bearing',
          uom: 'pcs',
          base_cost: '1000',
          is_stock: true,
          min_stock: '10',
          reorder_point: '15',
          current_stock: '7',
        },
        {
          id: '2',
          sku: 'P-002',
          name: 'Seal',
          uom: 'pcs',
          base_cost: '500',
          is_stock: true,
          min_stock: '5',
          reorder_point: '5',
          current_stock: '8',
        },
        {
          id: '3',
          sku: 'P-003',
          name: 'Grease',
          uom: 'tube',
          base_cost: '300',
          is_stock: true,
          min_stock: '4',
          reorder_point: '2',
          current_stock: '0',
        },
      ]);

      const result = await service.getLowStock('org-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '3',
        current_stock: 0,
        threshold: 4,
        shortage: 4,
      });
      expect(result[1]).toMatchObject({
        id: '1',
        current_stock: 7,
        threshold: 15,
        shortage: 8,
      });
    });
  });
});
