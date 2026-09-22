import { BadRequestException } from '@nestjs/common';
import type { Role } from '../users/role.entity';
import type { User } from '../users/user.entity';
import type { PartsDealer } from './parts-dealer.entity';
import { PartsDealersService } from './parts-dealers.service';

function role(name: string) {
  return { id: `${name}-id`, name } as Role;
}

function makeService(dealer: Partial<PartsDealer> | null, owner: User) {
  const row = dealer as PartsDealer | null;
  const partsDealersRepo = {
    findOne: jest.fn(async (opts?: { where?: unknown }) => {
      if (!row) return null;
      const where = opts?.where;
      if (Array.isArray(where)) {
        return where.some((clause: Record<string, unknown>) =>
          Object.entries(clause).every(([k, v]) => (row as never)[k] === v),
        )
          ? row
          : null;
      }
      if (where && typeof where === 'object') {
        const match = Object.entries(where as Record<string, unknown>).every(
          ([k, v]) => (row as never)[k] === v,
        );
        return match ? row : null;
      }
      return row;
    }),
    find: jest.fn(async () => (row ? [row] : [])),
    save: jest.fn(async (saved: PartsDealer) => saved),
    create: jest.fn((data: Partial<PartsDealer>) => data as PartsDealer),
  };
  const partListingsRepo = {
    count: jest.fn(async () => 0),
    find: jest.fn(async () => []),
  };
  const engagementEvents = { count: jest.fn(async () => 0) };
  const favouritesRepo = { count: jest.fn(async () => 0) };
  const usersService = {
    findByIdOrThrow: jest.fn(async () => owner),
    addRole: jest.fn(async (user: User, name: string) => {
      if (!user.roles.some((r) => r.name === name)) {
        user.roles = [...user.roles, role(name)];
      }
      return user;
    }),
    removeRole: jest.fn(async (user: User, name: string) => {
      user.roles = user.roles.filter((r) => r.name !== name);
      return user;
    }),
  };
  const notifications = {
    partsDealerApproved: jest.fn(),
    partsDealerRejected: jest.fn(),
  };
  const service = new PartsDealersService(
    partsDealersRepo as never,
    partListingsRepo as never,
    engagementEvents as never,
    favouritesRepo as never,
    usersService as never,
    notifications as never,
    { invalidateDashboard: jest.fn() } as never,
  );
  return { service, usersService, notifications, partsDealersRepo };
}

describe('PartsDealersService.create', () => {
  it('allows create when owner already has bike dealer role', async () => {
    const owner = {
      id: 'user-1',
      roles: [role('buyer'), role('dealer')],
    } as User;
    const { service, partsDealersRepo } = makeService(null, owner);

    await service.create(owner, {
      name: 'Parts Hub',
      phone: '0771234567',
      districtId: '11111111-1111-4111-8111-111111111111',
      cityId: '22222222-2222-4222-8222-222222222222',
    });

    expect(partsDealersRepo.create).toHaveBeenCalled();
    expect(partsDealersRepo.save).toHaveBeenCalled();
  });

  it('blocks create when owner already has parts_dealer role', async () => {
    const owner = {
      id: 'user-1',
      roles: [role('buyer'), role('parts_dealer')],
    } as User;
    const { service } = makeService(null, owner);

    await expect(
      service.create(owner, {
        name: 'Parts Hub',
        phone: '0771234567',
        districtId: '11111111-1111-4111-8111-111111111111',
        cityId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toMatchObject({
      response: {
        error: { code: 'PARTS_DEALER_EXISTS' },
      },
    });
  });
});

describe('PartsDealersService.approve', () => {
  it('adds parts_dealer and removes seller', async () => {
    const owner = {
      id: 'user-1',
      roles: [role('buyer'), role('seller')],
    } as User;
    const { service, usersService, notifications } = makeService(
      {
        id: 'pd-1',
        ownerUserId: 'user-1',
        name: 'Parts Hub',
        slug: 'parts-hub',
        status: 'pending',
      },
      owner,
    );

    const approved = await service.approve('pd-1');

    expect(approved.status).toBe('active');
    expect(usersService.addRole).toHaveBeenCalledWith(owner, 'parts_dealer');
    expect(usersService.removeRole).toHaveBeenCalledWith(owner, 'seller');
    expect(owner.roles.map((r) => r.name).sort()).toEqual([
      'buyer',
      'parts_dealer',
    ]);
    expect(notifications.partsDealerApproved).toHaveBeenCalledWith('user-1', {
      id: 'pd-1',
      name: 'Parts Hub',
      slug: 'parts-hub',
    });
  });
});
