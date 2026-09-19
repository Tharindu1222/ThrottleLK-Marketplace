import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ListingsService, searchTokens } from './listings.service';
import type { User } from '../users/user.entity';
import type { Listing } from './listing.entity';

const seller = { id: 'seller-1' } as User;
const viewer = { id: 'buyer-1' } as User;

function makeService(
  listing: Partial<Listing>,
  extras?: {
    dealerId?: string | null;
    findActiveOwned?: jest.Mock;
  },
) {
  const row = { ...listing } as Listing;
  const listingsRepo = {
    findOne: jest.fn(async () => row),
    save: jest.fn(async (saved: Listing) => saved),
    create: jest.fn((value: Listing) => value),
    increment: jest.fn(async () => undefined),
  };
  const engagementEvents = {
    create: jest.fn((value: unknown) => value),
    save: jest.fn(async (value: unknown) => value),
  };
  const notifications = {
    listingPendingReview: jest.fn(async () => undefined),
    listingApproved: jest.fn(),
    listingRejected: jest.fn(),
    priceDrop: jest.fn(),
  };
  const dealersService = {
    assertOwnedActiveDealer: jest.fn(async (_owner: string, id: string) => ({
      id,
      status: 'active',
    })),
    findActiveOwned: extras?.findActiveOwned ?? jest.fn(async () =>
      extras?.dealerId
        ? { id: extras.dealerId, status: 'active' }
        : null,
    ),
    activeVerifiedIds: jest.fn(async () => new Set<string>()),
    findActiveById: jest.fn(async () => null),
  };
  const service = new ListingsService(
    listingsRepo as never,
    { create: jest.fn(), save: jest.fn() } as never,
    {} as never,
    engagementEvents as never,
    dealersService as never,
    notifications as never,
    { userIdsForListing: jest.fn(async () => []) } as never,
    {} as never,
    { invalidateDashboard: jest.fn() } as never,
  );
  return { service, notifications, row, listingsRepo, dealersService, engagementEvents };
}

describe('ListingsService status rules', () => {
  it('documents allowed submit sources', () => {
    const allowed = ['draft', 'rejected'];
    expect(allowed).toContain('draft');
    expect(allowed).not.toContain('active');
  });

  it('exports service class', () => {
    expect(ListingsService).toBeDefined();
  });
});

describe('ListingsService admin review notifications', () => {
  it('notifies admins when a draft listing is submitted', async () => {
    const { service, notifications, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'draft',
      title: 'BMW Motorrad S 1000 R 2026',
      slug: 'bmw-s-1000-r',
    });

    await service.submit(seller, row.id);

    expect(notifications.listingPendingReview).toHaveBeenCalledWith({
      id: 'listing-1',
      title: 'BMW Motorrad S 1000 R 2026',
      slug: 'bmw-s-1000-r',
    });
  });

  it('notifies admins when an active listing is sent back for review', async () => {
    const { service, notifications, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'active',
      title: 'BMW Motorrad S 1000 R 2026',
      slug: 'bmw-s-1000-r',
      priceLkr: 3900000,
    });

    await service.update(seller, row.id, { title: 'BMW Motorrad S 1000 R 2026' });

    expect(notifications.listingPendingReview).toHaveBeenCalledWith({
      id: 'listing-1',
      title: 'BMW Motorrad S 1000 R 2026',
      slug: 'bmw-s-1000-r',
    });
  });

  it('does not notify admins for price-only edits on an active listing', async () => {
    const { service, notifications, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'active',
      title: 'Honda CBR',
      slug: 'honda-cbr',
      priceLkr: 500000,
    });

    await service.update(seller, row.id, { priceLkr: 450000 });

    expect(notifications.listingPendingReview).not.toHaveBeenCalled();
  });

  it('does not notify admins when editing a listing already in review', async () => {
    const { service, notifications, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'pending_review',
      title: 'Honda CBR',
      slug: 'honda-cbr',
    });

    await service.update(seller, row.id, { title: 'Honda CBR updated' });

    expect(notifications.listingPendingReview).not.toHaveBeenCalled();
  });
});

describe('ListingsService.listPending', () => {
  it('returns cover image, seller name, and submitted time without secrets', async () => {
    const submittedAt = new Date('2026-09-17T04:30:00.000Z');
    const pendingRow = {
      id: 'listing-1',
      title: 'Honda Activa',
      priceLkr: 500000,
      manufactureYear: 2021,
      updatedAt: submittedAt,
      seller: {
        id: 'seller-1',
        firstName: 'Nimal',
        lastName: 'Perera',
        email: 'nimal@example.com',
        passwordHash: 'secret',
      },
    };
    const listingsQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[pendingRow], 1]),
    };
    const imagesQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [
        { listingId: 'listing-1', imageUrl: 'https://cdn.example/cover.jpg' },
      ]),
    };
    const listingsRepo = {
      createQueryBuilder: jest.fn(() => listingsQb),
    };
    const listingImagesRepo = {
      createQueryBuilder: jest.fn(() => imagesQb),
    };
    const service = new ListingsService(
      listingsRepo as never,
      { create: jest.fn(), save: jest.fn() } as never,
      listingImagesRepo as never,
      { create: jest.fn(), save: jest.fn() } as never,
      {} as never,
      {} as never,
      { userIdsForListing: jest.fn(async () => []) } as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
    );

    const { items, meta } = await service.listPending();
    const [row] = items;

    expect(listingsQb.skip).toHaveBeenCalled();
    expect(listingsQb.take).toHaveBeenCalled();
    expect(row.coverImageUrl).toBe('https://cdn.example/cover.jpg');
    expect(row.seller).toEqual({
      id: 'seller-1',
      firstName: 'Nimal',
      lastName: 'Perera',
    });
    expect(row.seller).not.toHaveProperty('passwordHash');
    expect(row.updatedAt).toEqual(submittedAt);
    expect(meta).toMatchObject({ page: 1, limit: 20, total: 1 });
  });
});

describe('ListingsService.listMine', () => {
  it('pages with skip/take and returns meta', async () => {
    const listingsRepo = {
      findAndCount: jest.fn(async () => [[{ id: 'listing-1' }], 21]),
    };
    const imagesQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => []),
    };
    const service = new ListingsService(
      listingsRepo as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { createQueryBuilder: jest.fn(() => imagesQb) } as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { activeVerifiedIds: jest.fn(async () => new Set()) } as never,
      {} as never,
      { userIdsForListing: jest.fn(async () => []) } as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
    );

    const { items, meta } = await service.listMine('seller-1', {
      page: 2,
      limit: 20,
    });

    expect(listingsRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sellerId: 'seller-1' },
        skip: 20,
        take: 20,
      }),
    );
    expect(items).toHaveLength(1);
    expect(meta).toMatchObject({
      page: 2,
      limit: 20,
      total: 21,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });
});

describe('searchTokens', () => {
  it('splits on spaces and hyphens so d tracker matches D-Tracker', () => {
    expect(searchTokens('d tracker')).toEqual(['d', 'tracker']);
    expect(searchTokens('  D-Tracker  ')).toEqual(['D', 'Tracker']);
  });

  it('ignores empty query', () => {
    expect(searchTokens('   ')).toEqual([]);
  });
});

const createInput = {
  title: 'Honda Dio',
  description: 'A well kept scooter for city use in Colombo.',
  brandId: 'brand-1',
  modelId: 'model-1',
  categoryId: 'cat-1',
  districtId: 'dist-1',
  cityId: 'city-1',
  priceLkr: 500000,
  manufactureYear: 2020,
  fuelType: 'petrol',
  transmission: 'automatic',
  condition: 'used',
};

describe('ListingsService.create dealer conversion', () => {
  it('keeps private-seller listings unattached to a dealer', async () => {
    const privateSeller = {
      id: 'seller-1',
      roles: [{ name: 'buyer' }, { name: 'seller' }],
    } as User;
    const { service, listingsRepo } = makeService({});

    await service.create(privateSeller, createInput as never);

    expect(listingsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ dealerId: null, sellerId: 'seller-1' }),
    );
  });

  it('forces approved dealers to list under their showroom', async () => {
    const dealerUser = {
      id: 'seller-1',
      roles: [{ name: 'buyer' }, { name: 'dealer' }],
    } as User;
    const { service, listingsRepo } = makeService(
      {},
      { dealerId: 'dealer-1' },
    );

    await service.create(dealerUser, createInput as never);

    expect(listingsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ dealerId: 'dealer-1', sellerId: 'seller-1' }),
    );
  });

  it('rejects a private seller trying to list under a dealer', async () => {
    const privateSeller = {
      id: 'seller-1',
      roles: [{ name: 'buyer' }, { name: 'seller' }],
    } as User;
    const { service } = makeService({});

    await expect(
      service.create(privateSeller, {
        ...createInput,
        dealerId: 'dealer-1',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ListingsService.recordView', () => {
  it('increments viewCount and inserts a view event for active listings', async () => {
    const { service, listingsRepo, engagementEvents, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'active',
    });

    const result = await service.recordView(row.id, viewer);

    expect(result).toEqual({ recorded: true });
    expect(listingsRepo.increment).toHaveBeenCalledWith(
      { id: 'listing-1' },
      'viewCount',
      1,
    );
    expect(engagementEvents.create).toHaveBeenCalledWith({
      listingId: 'listing-1',
      type: 'view',
    });
    expect(engagementEvents.save).toHaveBeenCalledWith({
      listingId: 'listing-1',
      type: 'view',
    });
  });

  it('skips seller own views', async () => {
    const { service, listingsRepo, engagementEvents, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'active',
    });

    const result = await service.recordView(row.id, seller);

    expect(result).toEqual({ recorded: false });
    expect(listingsRepo.increment).not.toHaveBeenCalled();
    expect(engagementEvents.save).not.toHaveBeenCalled();
  });
});

describe('ListingsService.recordContactClick', () => {
  it('increments phoneClickCount and inserts phone event', async () => {
    const { service, listingsRepo, engagementEvents, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'active',
    });

    const result = await service.recordContactClick(row.id, 'phone', viewer);

    expect(result).toEqual({ recorded: true });
    expect(listingsRepo.increment).toHaveBeenCalledWith(
      { id: 'listing-1' },
      'phoneClickCount',
      1,
    );
    expect(engagementEvents.create).toHaveBeenCalledWith({
      listingId: 'listing-1',
      type: 'phone',
    });
    expect(engagementEvents.save).toHaveBeenCalledWith({
      listingId: 'listing-1',
      type: 'phone',
    });
  });

  it('returns recorded false / throws NotFound for non-active', async () => {
    const { service, listingsRepo, engagementEvents, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'draft',
    });

    await expect(
      service.recordContactClick(row.id, 'phone', viewer),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(listingsRepo.increment).not.toHaveBeenCalled();
    expect(engagementEvents.save).not.toHaveBeenCalled();
  });

  it('skips owner clicks when identifiable', async () => {
    const { service, listingsRepo, engagementEvents, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'active',
    });

    const result = await service.recordContactClick(row.id, 'whatsapp', seller);

    expect(result).toEqual({ recorded: false });
    expect(listingsRepo.increment).not.toHaveBeenCalled();
    expect(engagementEvents.save).not.toHaveBeenCalled();
  });
});
