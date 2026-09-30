import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PromotionsService } from './promotions.service';
import type { User } from '../users/user.entity';

const seller = {
  id: 'seller-1',
  emailVerifiedAt: new Date(),
  firstName: 'Nimal',
  lastName: 'Perera',
  email: 'nimal@example.com',
  phone: '0771234567',
} as User;
const admin = { id: 'admin-1' } as User;

function md5(value: string) {
  return createHash('md5').update(value, 'utf8').digest('hex');
}

function makeService(overrides?: {
  listing?: { id: string; sellerId: string; status: string; title?: string };
  partListing?: { id: string; sellerId: string; status: string; title?: string };
  pkg?: {
    id: string;
    kind: string;
    durationDays: number;
    priceLkr: number;
    isActive: boolean;
    name: string;
    tier?: string;
    surfaces?: string[];
    priority?: number;
  };
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
    tier: 'featured',
    surfaces: ['home', 'browse', 'detail'],
    priority: 20,
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
    findOne: jest.fn(async (_query?: unknown) => overrides?.pending ?? null),
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => ({ id: 'req-1', ...(v as object) })),
    createQueryBuilder: jest.fn(),
  };
  const placements = {
    findOne: jest.fn(async (_query?: unknown) => overrides?.live ?? null),
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => ({ id: 'place-1', ...(v as object) })),
    createQueryBuilder: jest.fn(),
  };
  const packages = {
    findOne: jest.fn(async (_query?: unknown) => pkg),
    find: jest.fn(async () => [pkg]),
  };
  const accounts = {
    findOne: jest.fn(async (_query?: unknown) => bank),
  };
  const listings = {
    findOne: jest.fn(async (_query?: unknown) => listing),
  };
  const partListings = {
    findOne: jest.fn(async (_query?: unknown) => overrides?.partListing ?? null),
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
  const payhere = {
    requireMerchantId: jest.fn(() => '123456'),
    merchantSecret: jest.fn(() => 'secret_value'),
    currency: jest.fn(() => 'LKR'),
    mode: jest.fn(() => 'sandbox' as const),
    checkoutUrl: jest.fn(() => 'https://sandbox.payhere.lk/pay/checkout'),
    notifyUrl: jest.fn(
      () => 'https://api.example/api/v1/promotions/payhere/notify',
    ),
    webUrl: jest.fn(() => 'http://localhost:3000'),
    formatAmount: jest.fn((n: number) => Number(n).toFixed(2)),
    normalizePhone: jest.fn((phone: string | null | undefined) => phone || ''),
    buildCheckoutHash: jest.fn(() => 'CHECKOUT_HASH'),
    buildNotifyHash: jest.fn(() => 'NOTIFY_HASH'),
    verifyNotifyHash: jest.fn(() => true),
  };
  const dataSource = {
    transaction: jest.fn(async (cb: (manager: unknown) => Promise<unknown>) => {
      const manager = {
        getRepository: (entity: { name?: string } | Function) => {
          const name =
            typeof entity === 'function'
              ? entity.name
              : (entity as { name?: string }).name;
          if (name === 'PromoRequest') {
            return {
              ...requests,
              createQueryBuilder: () => {
                const state: {
                  where?: { id?: string };
                } = {};
                const qb = {
                  setLock: () => qb,
                  leftJoinAndSelect: () => qb,
                  where: (_sql: string, params: { id: string }) => {
                    state.where = params;
                    return qb;
                  },
                  getOne: async () =>
                    requests.findOne({
                      where: { id: state.where?.id ?? 'unknown' },
                    }),
                };
                return qb;
              },
            };
          }
          if (name === 'HomepagePlacement') return placements;
          return {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((v: unknown) => v),
          };
        },
      };
      return cb(manager);
    }),
  };

  const service = new PromotionsService(
    packages as never,
    accounts as never,
    {
      findOne: jest.fn(async () => ({ id: 'default', whatsapp: '0770000000' })),
      save: jest.fn(async (v: unknown) => v),
      create: jest.fn((v: unknown) => v),
    } as never,
    requests as never,
    placements as never,
    listings as never,
    partListings as never,
    listingsService as never,
    partListingsService as never,
    notifications as never,
    cache as never,
    payhere as never,
    dataSource as never,
  );

  return {
    service,
    requests,
    placements,
    packages,
    accounts,
    listings,
    notifications,
    payhere,
    listing,
    pkg,
  };
}

describe('PromotionsService.createCheckout', () => {
  it('creates a payhere pending request and returns checkout fields', async () => {
    const { service, requests, payhere } = makeService();
    const result = await service.createCheckout(seller, {
      packageId: 'pkg-1',
      listingId: 'listing-1',
      locale: 'en',
    });
    expect(requests.save).toHaveBeenCalled();
    const saved = requests.save.mock.calls[0][0] as {
      paymentProvider: string;
      paymentStatus: string;
      payhereOrderId: string;
      chargedPriceLkr: number;
    };
    expect(saved.paymentProvider).toBe('payhere');
    expect(saved.chargedPriceLkr).toBe(2500);
    expect(saved.paymentStatus).toBe('unpaid');
    expect(saved.payhereOrderId).toMatch(/^promo_/);
    expect(result.checkoutUrl).toBe('https://sandbox.payhere.lk/pay/checkout');
    expect(result.merchant_id).toBe('123456');
    expect(result.amount).toBe('2500.00');
    expect(result.currency).toBe('LKR');
    expect(result.hash).toBe('CHECKOUT_HASH');
    expect(result.custom_1).toBe('req-1');
    expect(result.return_url).toContain(
      '/en/account/listings/listing-1/promote?paid=1',
    );
    expect(result.cancel_url).toContain('cancelled=1');
    expect(payhere.requireMerchantId).toHaveBeenCalled();
  });

  it('reclaims an unpaid payhere pending for the same seller', async () => {
    const pending = {
      id: 'req-old',
      status: 'pending',
      sellerId: seller.id,
      paymentProvider: 'payhere',
      paymentStatus: 'unpaid',
      packageId: 'pkg-old',
    };
    const { service, requests } = makeService({ pending });
    await service.createCheckout(seller, {
      packageId: 'pkg-1',
      listingId: 'listing-1',
    });
    expect(requests.save).toHaveBeenCalled();
    const saved = requests.save.mock.calls[0][0] as {
      id: string;
      packageId: string;
      paymentStatus: string;
    };
    expect(saved.id).toBe('req-old');
    expect(saved.packageId).toBe('pkg-1');
    expect(saved.paymentStatus).toBe('unpaid');
  });
});

describe('PromotionsService.handlePayHereNotify', () => {
  it('marks paid on status_code 2 and waits for admin approval', async () => {
    const { service, requests, placements, notifications, payhere } =
      makeService();
    const pendingRow = {
      id: 'req-1',
      status: 'pending',
      sellerId: seller.id,
      subjectType: 'bike',
      listingId: 'listing-1',
      partListingId: null,
      paymentProvider: 'payhere',
      paymentStatus: 'unpaid',
      payhereOrderId: 'promo_abc',
      package: {
        durationDays: 7,
        priceLkr: 2500,
        name: '7 days',
        tier: 'featured',
        surfaces: ['home', 'browse', 'detail'],
        priority: 20,
      },
      listing: { title: 'Honda Dio' },
    };
    requests.findOne.mockResolvedValue(pendingRow as never);

    const amount = '2500.00';
    const currency = 'LKR';
    const statusCode = '2';
    const secretHash = md5('secret_value').toUpperCase();
    const md5sig = md5(
      '123456' + 'promo_abc' + amount + currency + statusCode + secretHash,
    ).toUpperCase();
    payhere.verifyNotifyHash.mockReturnValue(true);

    const first = await service.handlePayHereNotify({
      merchant_id: '123456',
      order_id: 'promo_abc',
      payhere_amount: amount,
      payhere_currency: currency,
      status_code: statusCode,
      md5sig,
      payment_id: 'ph-1',
      custom_1: 'req-1',
    });
    expect(first).toBe('OK');
    expect(placements.save).not.toHaveBeenCalled();
    expect(notifications.promoApproved).not.toHaveBeenCalled();
    const saved = requests.save.mock.calls[0][0] as {
      status: string;
      paymentStatus: string;
      payherePaymentId: string;
    };
    expect(saved.status).toBe('pending');
    expect(saved.paymentStatus).toBe('paid');
    expect(saved.payherePaymentId).toBe('ph-1');

    notifications.promoApproved.mockClear();
    placements.save.mockClear();
    requests.save.mockClear();
    requests.findOne.mockResolvedValue({
      ...pendingRow,
      status: 'pending',
      paymentStatus: 'paid',
    } as never);
    const second = await service.handlePayHereNotify({
      merchant_id: '123456',
      order_id: 'promo_abc',
      payhere_amount: amount,
      payhere_currency: currency,
      status_code: statusCode,
      md5sig,
      payment_id: 'ph-1',
      custom_1: 'req-1',
    });
    expect(second).toBe('OK');
    expect(notifications.promoApproved).not.toHaveBeenCalled();
    expect(placements.save).not.toHaveBeenCalled();
    expect(requests.save).not.toHaveBeenCalled();
  });

  it('marks payment failed on status_code -2', async () => {
    const { service, requests, payhere } = makeService();
    const pendingRow = {
      id: 'req-1',
      status: 'pending',
      paymentStatus: 'unpaid',
      payhereOrderId: 'promo_abc',
      package: { priceLkr: 2500 },
    };
    requests.findOne.mockResolvedValue(pendingRow as never);
    payhere.verifyNotifyHash.mockReturnValue(true);
    const result = await service.handlePayHereNotify({
      merchant_id: '123456',
      order_id: 'promo_abc',
      payhere_amount: '2500.00',
      payhere_currency: 'LKR',
      status_code: '-2',
      md5sig: 'x',
    });
    expect(result).toBe('OK');
    expect(requests.save).toHaveBeenCalled();
    const saved = requests.save.mock.calls[0][0] as { paymentStatus: string };
    expect(saved.paymentStatus).toBe('failed');
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
      paymentStatus: 'paid',
      package: {
        durationDays: 7,
        name: '7 days',
        tier: 'featured',
        surfaces: ['home', 'browse', 'detail'],
        priority: 20,
      },
    });
    const result = await service.approve(admin, 'req-1');
    expect(result.status).toBe('approved');
    expect(placements.save).toHaveBeenCalled();
    const saved = placements.save.mock.calls[0][0] as {
      endsAt: Date;
      tier: string;
      surfaces: string[];
      priority: number;
    };
    expect(saved.endsAt.getTime()).toBeGreaterThan(now + 6 * 86_400_000);
    expect(saved.tier).toBe('featured');
    expect(saved.surfaces).toEqual(['home', 'browse', 'detail']);
    expect(saved.priority).toBe(20);
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
      paymentStatus: 'paid',
      package: {
        durationDays: 7,
        tier: 'featured',
        surfaces: ['home', 'browse', 'detail'],
        priority: 20,
      },
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

describe('PromotionsService.listRequests', () => {
  it('omits passwordHash and slipStorageKey from admin payloads', async () => {
    const { service, requests } = makeService();
    const row = {
      id: 'req-1',
      slipStorageKey: 'promo-slips/secret.pdf',
      seller: {
        id: 'seller-1',
        firstName: 'Nimal',
        lastName: 'Perera',
        email: 'nimal@example.com',
        passwordHash: '$2b$10$secret',
        roles: [{ name: 'seller' }],
        status: 'active',
        phone: null,
        avatarUrl: null,
        createdAt: new Date(),
        emailVerifiedAt: null,
      },
      package: { id: 'pkg-1' },
      bankAccount: { id: 'bank-1' },
      listing: { id: 'listing-1', title: 'Honda' },
    };
    requests.createQueryBuilder = jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [row]),
    }));

    const items = await service.listRequests();
    expect(items[0]).not.toHaveProperty('slipStorageKey');
    expect(items[0].seller).not.toHaveProperty('passwordHash');
    expect(items[0].seller).toMatchObject({
      id: 'seller-1',
      email: 'nimal@example.com',
    });
  });
});

describe('PromotionsService.statusFor', () => {
  it('returns the selected package and promotion dates for a live listing', async () => {
    const startsAt = new Date('2026-09-28T04:30:00.000Z');
    const endsAt = new Date('2026-10-05T04:30:00.000Z');
    const paidAt = new Date('2026-09-28T04:12:00.000Z');
    const reviewedAt = new Date('2026-09-28T04:20:00.000Z');
    const { service } = makeService({
      live: {
        id: 'place-1',
        tier: 'featured',
        startsAt,
        endsAt,
        request: {
          paidAt,
          reviewedAt,
          package: {
            id: 'pkg-1',
            name: 'Featured',
            tier: 'featured',
            durationDays: 7,
            priceLkr: 2500,
          },
        },
      },
    });

    const status = await service.statusFor(seller.id, 'listing-1');

    expect(status.canRequest).toBe(false);
    expect(status.live).toEqual({
      id: 'place-1',
      tier: 'featured',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      package: {
        id: 'pkg-1',
        name: 'Featured',
        tier: 'featured',
        durationDays: 7,
        priceLkr: 2500,
      },
      paidAt: paidAt.toISOString(),
      approvedAt: reviewedAt.toISOString(),
    });
  });

  it('omits payment dates when a live placement has no request', async () => {
    const startsAt = new Date('2026-09-01T00:00:00.000Z');
    const endsAt = new Date('2026-10-01T00:00:00.000Z');
    const { service } = makeService({
      live: {
        id: 'place-admin',
        tier: 'premium',
        startsAt,
        endsAt,
        request: null,
      },
    });

    const status = await service.statusFor(seller.id, 'listing-1');

    expect(status.live).toMatchObject({
      id: 'place-admin',
      tier: 'premium',
      package: null,
      paidAt: null,
      approvedAt: null,
    });
  });
});
