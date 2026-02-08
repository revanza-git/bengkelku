import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    auth_users: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      auth_users: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('always creates users under the actor org', async () => {
    prisma.auth_users.findFirst.mockResolvedValue(null);

    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        auth_users: {
          create: jest.fn().mockResolvedValue({ id: 'auth-user-1' }),
        },
        public_users: {
          create: jest.fn().mockImplementation(({ data }) => data),
        },
      }),
    );

    const result = await service.create(
      {
        email: 'new.user@example.com',
        password: 'StrongPass#123',
        full_name: 'New User',
        role: 'viewer',
      },
      'org-actor',
    );

    expect(result.org_id).toBe('org-actor');
  });
});
