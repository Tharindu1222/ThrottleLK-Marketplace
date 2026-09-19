import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Role } from '../users/role.entity';
import type { User } from '../users/user.entity';
import type { Dealer } from './dealer.entity';
import { DealersService } from './dealers.service';

function role(name: string) {
  return { id: `${name}-id`, name } as Role;
}

function matchWhere(
  row: Record<string, unknown>,
  where: Record<string, unknown> | undefined,
): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    const actual = row[key];
    if (cond && typeof cond === 'object' && cond !== null && 'type' in cond) {
      const op = cond as { type: string; value: unknown };
      if (op.type === 'in') return (op.value as unknown[]).includes(actual);
      if (op.type === 'moreThanOrEqual') {
        return (
          actual instanceof Date &&
          op.value instanceof Date &&
          actual >= op.value
        );
      }
    }
    return actual === cond;
  });
}

function makeService(
  dealer: Partial<Dealer> | null,
  owner: User,
  seed?: {
    listings?: Array<{
      id: string;
      status: string;
      dealerId: string | null;
      deletedAt?: Date | null;
    }>;
    events?: Array<{ listingId: string; type: string; createdAt: Date }>;
    favourites?: Array<{ listingId: string; createdAt: Date }>;
  },
) {
  const row = dealer as Dealer | null;
  const dealersRepo = {
    findOne: jest.fn(async () => row),
    find: jest.fn(async () => (row ? [row] : [])),
    save: jest.fn(async (saved: Dealer) => saved),
  };
  const execute = jest.fn(async () => ({ affected: 1 }));
  const listings = seed?.listings ?? [];
  const events = seed?.events ?? [];
  const favourites = seed?.favourites ?? [];
  const listingsRepo = {
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute,
    })),
    count: jest.fn(async (opts?: { where?: Record<string, unknown> }) =>
      listings.filter((listing) => !listing.deletedAt && matchWhere(listing, opts?.where))
        .length,
    ),
    find: jest.fn(async (opts?: { where?: Record<string, unknown> }) =>
      listings
        .filter((listing) => !listing.deletedAt && matchWhere(listing, opts?.where))
        .map((listing) => ({ id: listing.id })),
    ),
  };
  const engagementEvents = {
    count: jest.fn(async (opts?: { where?: Record<string, unknown> }) =>
      events.filter((event) => matchWhere(event, opts?.where)).length,
    ),
  };
  const favouritesRepo = {
    count: jest.fn(async (opts?: { where?: Record<string, unknown> }) =>
      favourites.filter((fav) => matchWhere(fav, opts?.where)).length,
    ),
  };
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
    dealerApproved: jest.fn(),
    dealerRejected: jest.fn(),
  };
  const service = new DealersService(
    dealersRepo as never,
    listingsRepo as never,
    engagementEvents as never,
    favouritesRepo as never,
    usersService as never,
    notifications as never,
    { invalidateDashboard: jest.fn() } as never,
  );
  return { service, usersService, listingsRepo, execute, notifications, row };
}

describe('DealersService.approve', () => {
  it('converts a private seller into a dealer-only account and moves listings', async () => {
    const owner = {
      id: 'user-1',
      roles: [role('buyer'), role('seller')],
    } as User;
    const { service, usersService, execute, notifications } = makeService(
      {
        id: 'dealer-1',
        ownerUserId: 'user-1',
        name: 'Island Motos',
        slug: 'island-motos',
        status: 'pending',
      },
      owner,
    );

    const approved = await service.approve('dealer-1');

    expect(approved.status).toBe('active');
    expect(approved.verifiedAt ?? null).toBeNull();
    expect(usersService.addRole).toHaveBeenCalledWith(owner, 'dealer');
    expect(usersService.removeRole).toHaveBeenCalledWith(owner, 'seller');
    expect(owner.roles.map((r) => r.name).sort()).toEqual(['buyer', 'dealer']);
    expect(execute).toHaveBeenCalled();
    expect(notifications.dealerApproved).toHaveBeenCalledWith('user-1', {
      id: 'dealer-1',
      name: 'Island Motos',
      slug: 'island-motos',
    });
  });

  it('keeps buyer access after dealer approval', async () => {
    const owner = {
      id: 'user-1',
      roles: [role('buyer'), role('seller')],
    } as User;
    const { service } = makeService(
      {
        id: 'dealer-1',
        ownerUserId: 'user-1',
        name: 'Island Motos',
        slug: 'island-motos',
        status: 'pending',
      },
      owner,
    );

    await service.approve('dealer-1');

    expect(owner.roles.some((r) => r.name === 'buyer')).toBe(true);
    expect(owner.roles.some((r) => r.name === 'seller')).toBe(false);
  });

  it('rejects approval when the dealer is not pending', async () => {
    const owner = { id: 'user-1', roles: [role('dealer')] } as User;
    const { service } = makeService(
      {
        id: 'dealer-1',
        ownerUserId: 'user-1',
        status: 'active',
      },
      owner,
    );

    await expect(service.approve('dealer-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('DealersService.performance', () => {
  const owner = { id: 'user-1', roles: [role('dealer')] } as User;
  const dealer = {
    id: 'dealer-1',
    ownerUserId: 'user-1',
    status: 'active' as const,
  };

  it('throws Forbidden when the owner has no active dealer', async () => {
    const { service } = makeService(null, owner);

    await expect(service.performance('user-1', 'all')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('counts only active listings with this dealerId', async () => {
    const { service } = makeService(dealer, owner, {
      listings: [
        { id: 'active-1', status: 'active', dealerId: 'dealer-1' },
        { id: 'sold-1', status: 'sold', dealerId: 'dealer-1' },
        { id: 'other-dealer', status: 'active', dealerId: 'dealer-2' },
        { id: 'orphan', status: 'active', dealerId: null },
        {
          id: 'deleted-active',
          status: 'active',
          dealerId: 'dealer-1',
          deletedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });

    const result = await service.performance('user-1', 'all');

    expect(result.activeListings).toBe(1);
    expect(result.range).toBe('all');
    expect(result.views).toBe(0);
    expect(result.phoneClicks).toBe(0);
    expect(result.whatsappClicks).toBe(0);
    expect(result.favourites).toBe(0);
  });

  it('7d excludes older events and favourites; all includes them', async () => {
    const recent = new Date();
    recent.setUTCDate(recent.getUTCDate() - 2);
    const older = new Date();
    older.setUTCDate(older.getUTCDate() - 40);

    const { service } = makeService(dealer, owner, {
      listings: [
        { id: 'listing-1', status: 'active', dealerId: 'dealer-1' },
        { id: 'listing-sold', status: 'sold', dealerId: 'dealer-1' },
      ],
      events: [
        { listingId: 'listing-1', type: 'view', createdAt: recent },
        { listingId: 'listing-1', type: 'view', createdAt: older },
        { listingId: 'listing-sold', type: 'phone', createdAt: recent },
        { listingId: 'listing-sold', type: 'whatsapp', createdAt: older },
      ],
      favourites: [
        { listingId: 'listing-1', createdAt: recent },
        { listingId: 'listing-sold', createdAt: older },
      ],
    });

    const all = await service.performance('user-1', 'all');
    const week = await service.performance('user-1', '7d');

    expect(all).toEqual({
      range: 'all',
      activeListings: 1,
      views: 2,
      phoneClicks: 1,
      whatsappClicks: 1,
      favourites: 2,
    });
    expect(week).toEqual({
      range: '7d',
      activeListings: 1,
      views: 1,
      phoneClicks: 1,
      whatsappClicks: 0,
      favourites: 1,
    });
  });
});
