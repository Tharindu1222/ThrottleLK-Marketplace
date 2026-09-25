import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import type { User } from '../users/user.entity';

const seller = { id: 'seller-1' } as User;
const admin = { id: 'admin-1' } as User;

function makeService(overrides?: {
  listing?: { id: string; sellerId: string; status: string; title?: string };
  partListing?: { id: string; sellerId: string; status: string; title?: string };
  pkg?: { id: string; kind: string; durationDays: number; priceLkr: number; isActive: boolean; name: string };
  bank?: { id: string; isDefault: boolean; isActive: boolean };
  pending?: unknown;
  live?: unknown;
}) {
  const listing = overrides?.listing ?? {
    id: 'listing-1',
    sellerId: seller.id,
    status: 'active',
    title: 'Honda Dio',
  };
  const pkg = overrides?.pkg ?? {
    id: 'pkg-1',
    kind: 'bike',
    durationDays: 7,
    priceLkr: 2500,
    isActive: true,
    name: '7 days',
  };
  const bank = overrides?.bank ?? {
    id: 'bank-1',
    isDefault: true,
    isActive: true,
    bankName: 'BOC',
    accountName: 'ThrottleLK',
    accountNumber: '123',
    branch: 'Colombo',
  };

  const requests = {
    findOne: jest.fn(async () => overrides?.pending ?? null),
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => ({ id: 'req-1', ...(v as object) })),
  };
  const placements = {
    findOne: jest.fn(async () => overrides?.live ?? null),
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => ({ id: 'place-1', ...(v as object) })),
    createQueryBuilder: jest.fn(),
  };
  const packages = {
    findOne: jest.fn(async () => pkg),
    find: jest.fn(async () => [pkg]),
  };
  const accounts = {
    findOne: jest.fn(async () => bank),
  };
  const listings = {
    findOne: jest.fn(async () => listing),
  };
  const partListings = {
    findOne: jest.fn(async () => overrides?.partListing ?? null),
  };
  const storage = {
    putObject: jest.fn(async () => ({ storageKey: 'k', publicUrl: 'u' })),
    deleteObject: jest.fn(async () => undefined),
    getObject: jest.fn(async () => ({ buffer: Buffer.from('x'), contentType: 'application/pdf' })),
  };
  const notifications = {
    promoApproved: jest.fn(async () => undefined),
    promoRejected: jest.fn(async () => undefined),
  };
  const listingsService = {
    browseCardsByIds: jest.fn(async (ids: string[]) =>
      ids.map((id) => ({ id, title: id })),
    ),
    listPublic: jest.fn(async () => ({ items: [] })),
  };
  const partListingsService = {
    browseCardsByIds: jest.fn(async (ids: string[]) =>
      ids.map((id) => ({ id, title: id })),
    ),
    listPublic: jest.fn(async () => ({ items: [] })),
  };
  const cache = { invalidateDashboard: jest.fn() };

  const service = new PromotionsService(
    packages as never,
    accounts as never,
    { findOne: jest.fn(async () => ({ id: 'default', whatsapp: '0770000000' })), save: jest.fn(async (v) => v), create: jest.fn((v) => v) } as never,
    requests as never,
    placements as never,
    listings as never,
    partListings as never,
    listingsService as never,
    partListingsService as never,
    storage as never,
    notifications as never,
    cache as never,
  );

  return {
    service,
    requests,
    placements,
    packages,
    accounts,
    listings,
    storage,
    notifications,
    listing,
    pkg,
  };
}

describe('PromotionsService.createRequest', () => {
  const file = {
    mimetype: 'application/pdf',
    size: 1000,
    originalname: 'slip.pdf',
    buffer: Buffer.from('pdf'),
  } as Express.Multer.File;

  it('creates a pending request when listing is active and no live placement exists', async () => {
    const { service, requests } = makeService();
    const result = await service.createRequest(
      seller,
      { packageId: 'pkg-1', listingId: 'listing-1' },
      file,
    );
    expect(result.status).toBe('pending');
    expect(requests.save).toHaveBeenCalled();
  });

  it('rejects a second request while one is pending', async () => {
    const { service } = makeService({
      pending: { id: 'req-old', status: 'pending' },
    });
    await expect(
      service.createRequest(
        seller,
        { packageId: 'pkg-1', listingId: 'listing-1' },
        file,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when a live placement exists', async () => {
    const { service } = makeService({
      live: { id: 'p1', endsAt: new Date(Date.now() + 86_400_000) },
    });
    await expect(
      service.createRequest(
        seller,
        { packageId: 'pkg-1', listingId: 'listing-1' },
        file,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when there is no default bank account', async () => {
    const { service, accounts } = makeService();
    accounts.findOne.mockResolvedValueOnce(null as never);
    await expect(
      service.createRequest(
        seller,
        { packageId: 'pkg-1', listingId: 'listing-1' },
        file,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PromotionsService.approve', () => {
  it('creates a placement ending after the package duration', async () => {
    const now = Date.now();
    const { service, placements, requests } = makeService();
    requests.findOne.mockResolvedValue({
      id: 'req-1',
      status: 'pending',
      sellerId: seller.id,
      subjectType: 'bike',
      listingId: 'listing-1',
      partListingId: null,
      package: { durationDays: 7, name: '7 days' },
    });
    const result = await service.approve(admin, 'req-1');
    expect(result.status).toBe('approved');
    expect(placements.save).toHaveBeenCalled();
    const saved = placements.save.mock.calls[0][0] as { endsAt: Date };
    expect(saved.endsAt.getTime()).toBeGreaterThan(now + 6 * 86_400_000);
  });

  it('fails when the listing is no longer active', async () => {
    const { service, requests, listings } = makeService({
      listing: { id: 'listing-1', sellerId: seller.id, status: 'sold' },
    });
    requests.findOne.mockResolvedValue({
      id: 'req-1',
      status: 'pending',
      sellerId: seller.id,
      subjectType: 'bike',
      listingId: 'listing-1',
      partListingId: null,
      package: { durationDays: 7 },
    });
    listings.findOne.mockResolvedValue({
      id: 'listing-1',
      sellerId: seller.id,
      status: 'sold',
    });
    await expect(service.approve(admin, 'req-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('PromotionsService.reject', () => {
  it('requires a reason', async () => {
    const { service } = makeService();
    await expect(service.reject(admin, 'req-1', '  ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('marks the request rejected and notifies the seller', async () => {
    const { service, requests, notifications } = makeService();
    requests.findOne.mockResolvedValue({
      id: 'req-1',
      status: 'pending',
      sellerId: seller.id,
      subjectType: 'bike',
      listingId: 'listing-1',
      listing: { title: 'Honda Dio' },
      partListingId: null,
    });
    const result = await service.reject(admin, 'req-1', 'Unclear slip');
    expect(result.status).toBe('rejected');
    expect(notifications.promoRejected).toHaveBeenCalled();
  });
});

describe('PromotionsService.adminPlace', () => {
  it('updates an existing live placement instead of inserting another', async () => {
    const live = {
      id: 'place-1',
      listingId: 'listing-1',
      endsAt: new Date(),
    };
    const { service, placements } = makeService({ live });
    placements.findOne.mockResolvedValue(live);
    const result = await service.adminPlace(admin, {
      subjectType: 'bike',
      listingId: 'listing-1',
      durationDays: 14,
    });
    expect(result.id).toBe('place-1');
    expect(placements.create).not.toHaveBeenCalled();
  });

  it('auto-rejects a pending request when placing manually', async () => {
    const pending = {
      id: 'req-1',
      status: 'pending',
      sellerId: seller.id,
      subjectType: 'bike',
      listingId: 'listing-1',
      listing: { title: 'Honda Dio' },
    };
    const { service, requests, notifications } = makeService({ pending });
    await service.adminPlace(admin, {
      subjectType: 'bike',
      listingId: 'listing-1',
      durationDays: 7,
    });
    expect(requests.save).toHaveBeenCalled();
    expect(notifications.promoRejected).toHaveBeenCalled();
  });
});

describe('PromotionsService helpers', () => {
  it('throws when a request is missing', async () => {
    const { service, requests } = makeService();
    requests.findOne.mockResolvedValue(null);
    await expect(service.approve(admin, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
