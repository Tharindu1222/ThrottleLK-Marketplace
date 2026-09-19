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
    {
      userIdsForListing: jest.fn(async () => []),
      countsByListingIds: jest.fn(async () => new Map<string, number>()),
    } as never,
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
      {
        userIdsForListing: jest.fn(async () => []),
        countsByListingIds: jest.fn(async () => new Map<string, number>()),
      } as never,
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
      {
        userIdsForListing: jest.fn(async () => []),
        countsByListingIds: jest.fn(async () => new Map<string, number>()),
      } as never,
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
      roles: [{ name: 'buyer' }, { name: 'dealer' }],
    } as User;
    const privateSeller = {
      id: 'seller-1',
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
