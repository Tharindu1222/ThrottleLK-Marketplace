import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ListingsService, searchTokens } from './listings.service';
import type { User } from '../users/user.entity';
import type { Listing } from './listing.entity';

const seller = { id: 'seller-1', emailVerifiedAt: new Date() } as User;
const viewer = { id: 'buyer-1' } as User;

function makeService(
  listing: Partial<Listing>,
  extras?: {
    dealerId?: string | null;
    findActiveOwned?: jest.Mock;
  },
) {
  const row = { seller: { id: seller.id, status: 'active' }, dealer: listing.dealerId ? { id: listing.dealerId, status: 'active', owner: { status: 'active' } } : null, ...listing } as Listing;
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
    listingExpired: jest.fn(),
    listingInquiry: jest.fn(),
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
    {
      userIdsForListing: jest.fn(async () => []),
      countsByListingIds: jest.fn(async () => new Map<string, number>()),
    } as never,
    {} as never,
    { invalidateDashboard: jest.fn() } as never,
    { upsertFromListing: jest.fn(async () => undefined) } as never,
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

    await service.update(seller, row.id, { description: 'Updated description for admin review' });

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
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => []),
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
      {
        userIdsForListing: jest.fn(async () => []),
        countsByListingIds: jest.fn(async () => new Map<string, number>()),
      } as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
      { upsertFromListing: jest.fn(async () => undefined) } as never,
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
      email: 'nimal@example.com',
    });
    expect(row.seller).not.toHaveProperty('passwordHash');
    expect(row.updatedAt).toEqual(submittedAt);
    expect(row.duplicateSignals).toEqual([]);
    expect(row.duplicateCount).toBe(0);
    expect(meta).toMatchObject({ page: 1, limit: 20, total: 1 });
  });
});

describe('ListingsService.listAllAdmin', () => {
  it('does not serialize seller passwordHash', async () => {
    const adminRow = {
      id: 'listing-1',
      title: 'Honda Activa',
      seller: {
        id: 'seller-1',
        firstName: 'Nimal',
        lastName: 'Perera',
        email: 'nimal@example.com',
        passwordHash: '$2b$10$not-a-real-hash',
        roles: [{ name: 'seller' }],
        status: 'active',
        phone: '0770000000',
        avatarUrl: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        emailVerifiedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    };
    const listingsQb = {
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[adminRow], 1]),
    };
    const imagesQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => []),
    };
    const usersService = {
      toPublic: jest.fn((user: { id: string; passwordHash?: string }) => {
        const { passwordHash: _passwordHash, ...safe } = user;
        return safe;
      }),
    };
    const service = new ListingsService(
      { createQueryBuilder: jest.fn(() => listingsQb) } as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { createQueryBuilder: jest.fn(() => imagesQb) } as never,
      { create: jest.fn(), save: jest.fn() } as never,
      {} as never,
      {} as never,
      {
        userIdsForListing: jest.fn(async () => []),
        countsByListingIds: jest.fn(async () => new Map<string, number>()),
      } as never,
      usersService as never,
      { invalidateDashboard: jest.fn() } as never,
      { upsertFromListing: jest.fn(async () => undefined) } as never,
    );

    const { items } = await service.listAllAdmin();
    expect(items[0].seller).not.toHaveProperty('passwordHash');
    expect(usersService.toPublic).toHaveBeenCalled();
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
      {
        userIdsForListing: jest.fn(async () => []),
        countsByListingIds: jest.fn(async () => new Map<string, number>()),
      } as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
      { upsertFromListing: jest.fn(async () => undefined) } as never,
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

describe('ListingsService registration status', () => {
  const privateSeller = {
    ...seller,
    roles: [{ name: 'seller' }],
  } as User;

  it.each(['registered', 'unregistered'] as const)(
    'persists %s without inventing a registration year',
    async (registrationStatus) => {
      const { service } = makeService({});
      const saved = await service.create(privateSeller, {
        ...createInput,
        registrationStatus,
      } as never);
      expect(saved.registrationStatus).toBe(registrationStatus);
      expect(saved.registrationYear).toBeNull();
    },
  );

  it('preserves private inventory values when registration is updated from the listing form', async () => {
    const { service, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      dealerId: 'dealer-1',
      status: 'draft',
      registrationYear: 2020,
      registrationStatus: 'registered',
      costPriceLkr: 350000,
      purchaseDate: '2020-01-15',
    });
    const saved = await service.update(seller, row.id, {
      registrationStatus: 'unregistered',
    });
    expect(saved.registrationStatus).toBe('unregistered');
    expect(saved.registrationYear).toBeNull();
    expect(saved.costPriceLkr).toBe(350000);
    expect(saved.purchaseDate).toBe('2020-01-15');
    await service.update(seller, row.id, { registrationStatus: 'registered' });
    expect(saved.registrationStatus).toBe('registered');
    expect(saved.registrationYear).toBeNull();
  });

  it('continues to accept legacy registration years', async () => {
    const { service } = makeService({});
    const saved = await service.create(privateSeller, {
      ...createInput,
      registrationYear: 2020,
    } as never);
    expect(saved.registrationYear).toBe(2020);
    expect(saved.registrationStatus).toBe('registered');
  });

  it('preserves a known registration year on status edits and supports legacy year PATCH requests', async () => {
    const { service, row } = makeService({
      id: 'listing-1', sellerId: seller.id, status: 'draft', registrationYear: 2020,
    });
    await service.update(seller, row.id, { registrationStatus: 'registered' });
    expect(row.registrationYear).toBe(2020);
    await service.update(seller, row.id, { registrationStatus: 'unregistered' });
    await service.update(seller, row.id, { registrationYear: 2021 });
    expect(row.registrationStatus).toBe('registered');
    expect(row.registrationYear).toBe(2021);
  });
});

describe('ListingsService.create dealer conversion', () => {
  it('rejects listing create when email is not verified', async () => {
    const unverified = {
      id: 'seller-1',
      emailVerifiedAt: null,
      roles: [{ name: 'buyer' }, { name: 'seller' }],
    } as User;
    const { service } = makeService({});

    await expect(
      service.create(unverified, createInput as never),
    ).rejects.toMatchObject({
      response: {
        error: { code: 'EMAIL_UNVERIFIED' },
      },
    });
  });

  it('keeps private-seller listings unattached to a dealer', async () => {
    const privateSeller = {
      id: 'seller-1',
      emailVerifiedAt: new Date(),
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
      emailVerifiedAt: new Date(),
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
      emailVerifiedAt: new Date(),
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
  it('increments viewCount without writing a view event', async () => {
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
    expect(engagementEvents.save).not.toHaveBeenCalled();
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

describe('ListingsService.markSold', () => {
  it('markSold requires soldPriceLkr and sets soldPriceLkr + soldAt', async () => {
    const { service, listingsRepo, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'active',
    });

    const result = await service.markSold(seller, row.id, {
      soldPriceLkr: 450000,
      soldAt: '2026-09-10',
    });

    expect(result.status).toBe('sold');
    expect(result.soldPriceLkr).toBe(450000);
    expect(result.soldAt).toEqual(new Date('2026-09-10T12:00:00.000Z'));
    expect(listingsRepo.save).toHaveBeenCalled();
  });
});

describe('ListingsService.create inventory', () => {
  it('create stores costPriceLkr/purchaseDate only when listing has dealerId', async () => {
    const inventory = {
      costPriceLkr: 350000,
      purchaseDate: '2026-08-01',
    };
    const dealerUser = {
      id: 'seller-1',
      emailVerifiedAt: new Date(),
      roles: [{ name: 'buyer' }, { name: 'dealer' }],
    } as User;
    const privateSeller = {
      id: 'seller-1',
      emailVerifiedAt: new Date(),
      roles: [{ name: 'buyer' }, { name: 'seller' }],
    } as User;

    const { service: dealerService, listingsRepo: dealerRepo } = makeService(
      {},
      { dealerId: 'dealer-1' },
    );
    await dealerService.create(dealerUser, {
      ...createInput,
      ...inventory,
    } as never);

    expect(dealerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dealerId: 'dealer-1',
        costPriceLkr: 350000,
        purchaseDate: '2026-08-01',
      }),
    );

    const { service: privateService, listingsRepo: privateRepo } = makeService(
      {},
    );
    await privateService.create(privateSeller, {
      ...createInput,
      ...inventory,
    } as never);

    expect(privateRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dealerId: null,
        costPriceLkr: null,
        purchaseDate: null,
      }),
    );
  });

  it('update ignores costPriceLkr/purchaseDate for private listings', async () => {
    const { service, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'draft',
      dealerId: null,
      costPriceLkr: null,
      purchaseDate: null,
    });

    await service.update(seller, row.id, {
      costPriceLkr: 100000,
      purchaseDate: '2026-01-01',
    });

    expect(row.costPriceLkr).toBeNull();
    expect(row.purchaseDate).toBeNull();
  });

  it('keeps an active dealer listing published when updating only costPriceLkr', async () => {
    const publishedAt = new Date('2026-09-01T00:00:00.000Z');
    const { service, notifications, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      dealerId: 'dealer-1',
      status: 'active',
      title: 'Honda CBR',
      slug: 'honda-cbr',
      priceLkr: 500000,
      costPriceLkr: 300000,
      publishedAt,
    });

    const saved = await service.update(seller, row.id, { costPriceLkr: 320000 });

    expect(saved.status).toBe('active');
    expect(saved.publishedAt).toEqual(publishedAt);
    expect(saved.costPriceLkr).toBe(320000);
    expect(notifications.listingPendingReview).not.toHaveBeenCalled();
  });
});

describe('ListingsService.listMine owner extras', () => {
  const ownerRow = {
    id: 'listing-1',
    sellerId: 'seller-1',
    dealerId: 'dealer-1',
    slug: 'honda-dio',
    title: 'Honda Dio',
    priceLkr: 550000,
    status: 'sold',
    costPriceLkr: 400000,
    purchaseDate: '2026-09-01',
    soldPriceLkr: 500000,
    soldAt: new Date('2026-09-11T12:00:00.000Z'),
    phoneClickCount: 4,
    whatsappClickCount: 2,
    viewCount: 11,
    manufactureYear: 2020,
  };

  it('listMine includes owner inventory fields; toBrowseCard public path does not', async () => {
    const imagesQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => []),
    };
    const publicQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ ...ownerRow, status: 'active' }], 1]),
    };
    const listingsRepo = {
      findAndCount: jest.fn(async () => [[{ ...ownerRow }], 1]),
      createQueryBuilder: jest.fn(() => publicQb),
    };
    const favourites = {
      userIdsForListing: jest.fn(async () => []),
      countsByListingIds: jest.fn(async () => new Map([['listing-1', 7]])),
    };
    const service = new ListingsService(
      listingsRepo as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { createQueryBuilder: jest.fn(() => imagesQb) } as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { activeVerifiedIds: jest.fn(async () => new Set()) } as never,
      {} as never,
      favourites as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
      { upsertFromListing: jest.fn(async () => undefined) } as never,
    );

    const { items } = await service.listMine('seller-1');
    const [ownerCard] = items;

    expect(ownerCard).toMatchObject({
      id: 'listing-1',
      status: 'sold',
      costPriceLkr: 400000,
      purchaseDate: '2026-09-01',
      soldPriceLkr: 500000,
      soldAt: '2026-09-11T12:00:00.000Z',
      phoneClickCount: 4,
      whatsappClickCount: 2,
      favouriteCount: 7,
      daysInStock: 10,
      marginLkr: 100000,
      marginPercent: 25,
    });
    expect(favourites.countsByListingIds).toHaveBeenCalledWith(['listing-1']);

    const { items: publicItems } = await service.listPublic({});
    const [publicCard] = publicItems;
    expect(publicCard).not.toHaveProperty('costPriceLkr');
    expect(publicCard).not.toHaveProperty('purchaseDate');
    expect(publicCard).not.toHaveProperty('soldPriceLkr');
    expect(publicCard).not.toHaveProperty('soldAt');
    expect(publicCard).not.toHaveProperty('phoneClickCount');
    expect(publicCard).not.toHaveProperty('whatsappClickCount');
    expect(publicCard).not.toHaveProperty('favouriteCount');
    expect(publicCard).not.toHaveProperty('daysInStock');
    expect(publicCard).not.toHaveProperty('marginLkr');
    expect(publicCard).not.toHaveProperty('marginPercent');
  });

  it('listMine daysInStock is 0 when start dates are missing or invalid', async () => {
    const imagesQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => []),
    };
    const listingsRepo = {
      findAndCount: jest.fn(async () => [
        [
          {
            ...ownerRow,
            purchaseDate: null,
            publishedAt: null,
            createdAt: undefined,
            soldAt: null,
          },
          {
            ...ownerRow,
            id: 'listing-2',
            purchaseDate: 'not-a-date',
            publishedAt: null,
            createdAt: undefined,
            soldAt: null,
          },
        ],
        2,
      ]),
    };
    const service = new ListingsService(
      listingsRepo as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { createQueryBuilder: jest.fn(() => imagesQb) } as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { activeVerifiedIds: jest.fn(async () => new Set()) } as never,
      {} as never,
      {
        userIdsForListing: jest.fn(async () => []),
        countsByListingIds: jest.fn(async () => new Map()),
      } as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
      { upsertFromListing: jest.fn(async () => undefined) } as never,
    );

    const { items } = await service.listMine('seller-1');
    expect(items[0].daysInStock).toBe(0);
    expect(items[1].daysInStock).toBe(0);
  });
});

describe('ListingsService.getPublicOrOwned inventory privacy', () => {
  const detailRow = {
    id: 'listing-1',
    sellerId: 'seller-1',
    dealerId: 'dealer-1',
    seller: { id: 'seller-1', status: 'active' },
    dealer: { id: 'dealer-1', status: 'active', owner: { status: 'active' } },
    slug: 'honda-dio',
    title: 'Honda Dio',
    priceLkr: 550000,
    status: 'active',
    costPriceLkr: 400000,
    purchaseDate: '2026-09-01',
    soldPriceLkr: 500000,
    soldAt: new Date('2026-09-11T12:00:00.000Z'),
    phoneClickCount: 4,
    whatsappClickCount: 2,
    viewCount: 11,
    manufactureYear: 2020,
    images: [],
    publishedAt: new Date('2026-09-01T00:00:00.000Z'),
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
  };

  function makeDetailService(row: Record<string, unknown> = detailRow) {
    const listingsRepo = {
      findOne: jest.fn(async () => ({ ...row })),
    };
    const favourites = {
      userIdsForListing: jest.fn(async () => []),
      countsByListingIds: jest.fn(async () => new Map([['listing-1', 7]])),
    };
    const usersService = {
      findByIdOrThrow: jest.fn(async () => ({ id: 'seller-1' })),
      toSellerPublic: jest.fn(() => ({
        id: 'seller-1',
        displayName: 'Seller',
      })),
    };
    const dealersService = {
      findActiveById: jest.fn(async () => null),
      activeVerifiedIds: jest.fn(async () => new Set()),
    };
    const service = new ListingsService(
      listingsRepo as never,
      { create: jest.fn(), save: jest.fn() } as never,
      {} as never,
      { create: jest.fn(), save: jest.fn() } as never,
      dealersService as never,
      {} as never,
      favourites as never,
      usersService as never,
      { invalidateDashboard: jest.fn() } as never,
      { upsertFromListing: jest.fn(async () => undefined) } as never,
    );
    return { service, favourites };
  }

  it('getPublicOrOwned omits sensitive keys for a non-owner when inventory fields are set', async () => {
    const { service } = makeDetailService();
    const result = await service.getPublicOrOwned('honda-dio', {
      id: 'buyer-1',
    } as User);

    expect(result).not.toHaveProperty('costPriceLkr');
    expect(result).not.toHaveProperty('purchaseDate');
    expect(result).not.toHaveProperty('soldPriceLkr');
    expect(result).not.toHaveProperty('phoneClickCount');
    expect(result).not.toHaveProperty('whatsappClickCount');
    expect(result).not.toHaveProperty('favouriteCount');
    expect(result).not.toHaveProperty('daysInStock');
    expect(result).not.toHaveProperty('marginLkr');
    expect(result).not.toHaveProperty('marginPercent');
  });

  it('lets guests view sold listings and hides contact', async () => {
    const { service } = makeDetailService({
      ...detailRow,
      status: 'sold',
      phone: '0771234567',
      whatsapp: '0771234567',
    });
    const result = await service.getPublicOrOwned('honda-dio', null);

    expect(result.status).toBe('sold');
    expect(result.contactHidden).toBe(true);
    expect(result.phone).toBeNull();
    expect(result.whatsapp).toBeNull();
  });

  it('still hides paused listings from guests', async () => {
    const { service } = makeDetailService({ ...detailRow, status: 'paused' });
    await expect(service.getPublicOrOwned('honda-dio', null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getPublicOrOwned includes listMine owner extras for the seller', async () => {
    const { service, favourites } = makeDetailService();
    const result = await service.getPublicOrOwned('honda-dio', {
      id: 'seller-1',
    } as User);

    expect(result).toMatchObject({
      costPriceLkr: 400000,
      purchaseDate: '2026-09-01',
      soldPriceLkr: 500000,
      soldAt: '2026-09-11T12:00:00.000Z',
      phoneClickCount: 4,
      whatsappClickCount: 2,
      favouriteCount: 7,
      daysInStock: 10,
      marginLkr: 100000,
      marginPercent: 25,
    });
    expect(favourites.countsByListingIds).toHaveBeenCalledWith(['listing-1']);
  });
});

describe('ListingsService launch hardening', () => {
  it('applies city, fuel, seller type and featured filters', async () => {
    const publicQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[], 0]),
    };
    const service = new ListingsService(
      { createQueryBuilder: jest.fn(() => publicQb) } as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => []),
      })) } as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { activeVerifiedIds: jest.fn(async () => new Set()) } as never,
      {} as never,
      { countsByListingIds: jest.fn(async () => new Map()) } as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
      { upsertFromListing: jest.fn(async () => undefined) } as never,
    );

    await service.listPublic({
      cityId: 'city-1',
      fuelType: 'petrol',
      sellerType: 'private',
      featured: 'true',
      minMileage: 1000,
    });

    const clauses = publicQb.andWhere.mock.calls.map((call) => String(call[0]));
    expect(clauses.some((sql) => sql.includes('city_id'))).toBe(true);
    expect(clauses.some((sql) => sql.includes('fuel_type'))).toBe(true);
    expect(clauses.some((sql) => sql.includes('dealer_id IS NULL'))).toBe(true);
    expect(clauses.some((sql) => sql.includes('homepage_placements'))).toBe(true);
    expect(clauses.some((sql) => sql.includes('mileage'))).toBe(true);
  });

  it('excludes listings that are past expires_at', async () => {
    const publicQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[], 0]),
    };
    const service = new ListingsService(
      { createQueryBuilder: jest.fn(() => publicQb) } as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => []),
      })) } as never,
      { create: jest.fn(), save: jest.fn() } as never,
      { activeVerifiedIds: jest.fn(async () => new Set()) } as never,
      {} as never,
      { countsByListingIds: jest.fn(async () => new Map()) } as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
      { upsertFromListing: jest.fn(async () => undefined) } as never,
    );

    await service.listPublic({
      minRegistrationYear: 2018,
      maxRegistrationYear: 2024,
      sort: 'popular',
    });

    const clauses = publicQb.andWhere.mock.calls.map((call) => String(call[0]));
    expect(clauses.some((sql) => sql.includes('expires_at'))).toBe(true);
    expect(clauses.some((sql) => sql.includes('registration_year'))).toBe(true);
    expect(publicQb.orderBy).toHaveBeenCalledWith('l.viewCount', 'DESC');
  });

  it('renews an expired listing and sets a new expiry', async () => {
    const { service, row, listingsRepo } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'expired',
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const saved = await service.renew(seller, row.id);

    expect(saved.status).toBe('active');
    expect(saved.expiresAt).toBeInstanceOf(Date);
    expect(listingsRepo.save).toHaveBeenCalled();
  });

  it('resumes a paused listing without resetting a future expiry', async () => {
    const expiresAt = new Date('2027-06-01T00:00:00.000Z');
    const { service, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'paused',
      expiresAt,
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const saved = await service.resume(seller, row.id);

    expect(saved.status).toBe('active');
    expect(saved.expiresAt).toEqual(expiresAt);
  });

  it('does not copy dealerId from a listing update payload', async () => {
    const { service, row } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'draft',
      dealerId: 'dealer-own',
      title: 'Honda Dio 2022',
    });

    await service.update(seller, row.id, {
      dealerId: 'dealer-other',
      title: 'Honda Dio 2022 clean',
    } as never);

    expect(row.dealerId).toBe('dealer-own');
  });

  it('expires due active listings and notifies the seller', async () => {
    const { service, notifications } = makeService({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'active',
    });
    const listingsRepo = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('pg_try_advisory_xact_lock')) return [{ locked: true }];
        if (sql.includes('pg_advisory_unlock')) return [];
        if (sql.includes('expires_at IS NULL')) return [[{ id: 'backfill-1' }], 1];
        return [[{ id: 'listing-1', sellerId: seller.id, title: 'Honda Dio' }], 1];
      }),
    };
    Object.assign(listingsRepo, { manager: { transaction: (cb: (m: unknown) => unknown) => cb({ query: listingsRepo.query }) } });
    Object.assign(service as never, { listings: listingsRepo });

    const result = await service.expireStale(new Date('2026-03-01T00:00:00.000Z'));

    expect(result).toEqual({ expired: 1, backfilled: 1 });
    expect(notifications.listingExpired).toHaveBeenCalledWith('seller-1', {
      id: 'listing-1',
      title: 'Honda Dio',
    });
  });
});

describe('approved listing edits', () => {
  it.each(['paused', 'expired'] as const)('requires review after a material edit to %s', async (status) => {
    const { service, row } = makeService({ id: 'bike', sellerId: seller.id, status, title: 'Old title' });
    await service.update(seller, row.id, { title: 'New title' });
    expect(row.status).toBe('pending_review');
    await expect(service.resume(seller, row.id)).rejects.toThrow(BadRequestException);
    await expect(service.renew(seller, row.id)).rejects.toThrow(BadRequestException);
  });
  it('preserves active status on a no-op edit', async () => {
    const { service, row, notifications } = makeService({ id: 'bike', sellerId: seller.id, status: 'active', title: 'Same title' });
    await service.update(seller, row.id, { title: 'Same title' });
    expect(row.status).toBe('active');
    expect(notifications.listingPendingReview).not.toHaveBeenCalled();
  });
});
