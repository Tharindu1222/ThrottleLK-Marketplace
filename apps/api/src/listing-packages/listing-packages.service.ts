import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  CreateListingPackageCheckoutInput,
  CreateListingPackageInput,
  UpdateListingPackageInput,
  UpdateListingPostSettingsInput,
} from '@throttlelk/validation';
import { In, QueryFailedError, Repository } from 'typeorm';
import { assertEmailVerified } from '../common/email-verified';
import { Dealer } from '../dealers/dealer.entity';
import { Listing } from '../listings/listing.entity';
import { PartListing } from '../part-listings/part-listing.entity';
import { PartsDealer } from '../parts-dealers/parts-dealer.entity';
import { PayHereService } from '../promotions/payhere.service';
import { User } from '../users/user.entity';
import { ListingPackage } from './listing-package.entity';
import { ListingPostOrder, ListingQuota } from './listing-post-order.entity';
import {
  bikeQuotaAudience,
  freeListingsFor,
  listingsRemaining,
  type PackageAudience,
  type QuotaAudience,
} from './listing-post-rules';
import { ListingPostSettings } from './listing-post-settings.entity';

const SETTINGS_ID = 1;

function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const driver = err.driverError as { code?: string } | undefined;
  return driver?.code === '23505' || (err as { code?: string }).code === '23505';
}

@Injectable()
export class ListingPackagesService {
  private readonly logger = new Logger(ListingPackagesService.name);

  constructor(
    @InjectRepository(ListingPostSettings)
    private readonly settings: Repository<ListingPostSettings>,
    @InjectRepository(ListingPackage)
    private readonly packages: Repository<ListingPackage>,
    @InjectRepository(ListingPostOrder)
    private readonly orders: Repository<ListingPostOrder>,
    @InjectRepository(ListingQuota)
    private readonly quotas: Repository<ListingQuota>,
    @InjectRepository(Dealer)
    private readonly dealers: Repository<Dealer>,
    @InjectRepository(PartsDealer)
    private readonly partsDealers: Repository<PartsDealer>,
    @InjectRepository(Listing)
    private readonly listings: Repository<Listing>,
    @InjectRepository(PartListing)
    private readonly partListings: Repository<PartListing>,
    private readonly payhere: PayHereService,
  ) {}

  async getSettings(): Promise<ListingPostSettings> {
    const existing = await this.settings.findOne({ where: { id: SETTINGS_ID } });
    if (existing) return existing;
    return this.settings.save(
      this.settings.create({
        id: SETTINGS_ID,
        privateFreeListings: 5,
        dealerFreeListings: 10,
        partsFreeListings: 10,
      }),
    );
  }

  async updateSettings(
    input: UpdateListingPostSettingsInput,
  ): Promise<ListingPostSettings> {
    const row = await this.getSettings();
    row.privateFreeListings = input.privateFreeListings;
    row.dealerFreeListings = input.dealerFreeListings;
    row.partsFreeListings = input.partsFreeListings;
    return this.settings.save(row);
  }

  async listAdmin(): Promise<ListingPackage[]> {
    return this.packages.find({
      order: { audience: 'ASC', sortOrder: 'ASC', priceLkr: 'ASC' },
    });
  }

  async listPublic(audience: PackageAudience): Promise<ListingPackage[]> {
    return this.packages.find({
      where: { audience, isActive: true },
      order: { sortOrder: 'ASC', priceLkr: 'ASC' },
    });
  }

  async createPackage(input: CreateListingPackageInput): Promise<ListingPackage> {
    return this.packages.save(
      this.packages.create({
        audience: input.audience,
        name: input.name,
        description: input.description ?? null,
        priceLkr: input.priceLkr,
        listingCount: input.listingCount,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      }),
    );
  }

  async updatePackage(
    id: string,
    input: UpdateListingPackageInput,
  ): Promise<ListingPackage> {
    const row = await this.packages.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException({
        success: false,
        error: { code: 'PACKAGE_NOT_FOUND', message: 'Listing package not found' },
      });
    }
    if (input.audience != null) row.audience = input.audience;
    if (input.name != null) row.name = input.name;
    if (input.description !== undefined) row.description = input.description ?? null;
    if (input.priceLkr != null) row.priceLkr = input.priceLkr;
    if (input.listingCount != null) row.listingCount = input.listingCount;
    if (input.sortOrder != null) row.sortOrder = input.sortOrder;
    if (input.isActive != null) row.isActive = input.isActive;
    return this.packages.save(row);
  }

  async summary(userId: string) {
    const settings = await this.getSettings();
    const [dealer, partsDealer] = await Promise.all([
      this.dealers.findOne({ where: { ownerUserId: userId, status: 'active' } }),
      this.partsDealers.findOne({ where: { ownerUserId: userId, status: 'active' } }),
    ]);
    const isDealer = Boolean(dealer);
    const bikeAudience = bikeQuotaAudience(isDealer);
    return {
      isDealer,
      isPartsDealer: Boolean(partsDealer),
      dealerFreeListings: settings.dealerFreeListings,
      bike: await this.view(userId, bikeAudience, settings),
      parts: partsDealer
        ? await this.view(userId, 'parts', settings)
        : null,
    };
  }

  /** Blocks a new bike listing once the seller's existing listings fill the quota. */
  async assertCanCreateBike(userId: string): Promise<void> {
    await this.consumeBike(userId, { existingListing: false });
  }

  /** Charges one bike listing. A normal user who is out of free listings must apply as a dealer. */
  async consumeBike(userId: string, options?: { existingListing?: boolean }): Promise<void> {
    const existingListing = options?.existingListing !== false;
    const dealer = await this.dealers.findOne({
      where: { ownerUserId: userId, status: 'active' },
    });
    if (!dealer) {
      await this.settleQuota(userId, 'private', existingListing);
      return;
    }
    await this.consumePaidAudience(userId, 'dealer', 'bike', existingListing);
  }

  async assertCanCreateParts(userId: string): Promise<void> {
    await this.consumeParts(userId, { existingListing: false });
  }

  async consumeParts(userId: string, options?: { existingListing?: boolean }): Promise<void> {
    await this.consumePaidAudience(
      userId,
      'parts',
      'parts',
      options?.existingListing !== false,
    );
  }

  async createCheckout(seller: User, input: CreateListingPackageCheckoutInput) {
    assertEmailVerified(seller, 'buying a listing package');
    const merchantId = this.payhere.requireMerchantId();
    const pkg = await this.packages.findOne({ where: { id: input.packageId } });
    if (!pkg || !pkg.isActive) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_PACKAGE', message: 'Package is not available' },
      });
    }
    if (pkg.audience === 'bike') {
      const dealer = await this.dealers.findOne({
        where: { ownerUserId: seller.id, status: 'active' },
      });
      if (!dealer) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'APPLY_DEALER',
            message: 'Apply as a dealer before buying bike listing packages',
          },
        });
      }
    } else {
      const parts = await this.partsDealers.findOne({
        where: { ownerUserId: seller.id, status: 'active' },
      });
      if (!parts) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'PARTS_DEALER_NOT_ACTIVE',
            message: 'An approved parts shop is required to buy part listing packages',
          },
        });
      }
    }

    const orderId = `post_${randomUUID()}`;
    const currency = this.payhere.currency();
    const amount = this.payhere.formatAmount(pkg.priceLkr);
    const locale = input.locale === 'si' ? 'si' : 'en';
    const donePath =
      pkg.audience === 'parts'
        ? `/${locale}/account/parts-listings`
        : `/${locale}/account/listings`;
    const webUrl = this.payhere.webUrl();
    const notifyUrl = this.payhere.notifyUrl();
    if (!notifyUrl) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PAYHERE_NOTIFY_MISSING',
          message: 'PayHere notify URL is not configured',
        },
      });
    }

    const saved = await this.orders.save(
      this.orders.create({
        sellerId: seller.id,
        audience: pkg.audience,
        packageId: pkg.id,
        status: 'pending',
        payhereOrderId: orderId,
        chargedPriceLkr: pkg.priceLkr,
        listingCount: pkg.listingCount,
      }),
    );

    const hash = this.payhere.buildCheckoutHash({
      merchantId,
      orderId,
      amount,
      currency,
    });
    return {
      checkoutUrl: this.payhere.checkoutUrl(),
      merchant_id: merchantId,
      return_url: `${this.payhere.apiUrl()}/api/v1/listing-packages/payhere/return`,
      cancel_url: `${webUrl}${donePath}?quota=cancelled`,
      notify_url: notifyUrl,
      order_id: orderId,
      items: `ThrottleLK ${pkg.listingCount} listings`,
      currency,
      amount,
      hash,
      first_name: seller.firstName || 'Seller',
      last_name: seller.lastName || 'ThrottleLK',
      email: seller.email,
      phone: this.payhere.normalizePhone(seller.phone),
      address: 'Sri Lanka',
      city: 'Colombo',
      country: 'Sri Lanka',
      custom_1: saved.id,
      custom_2: locale,
    };
  }

  /** Browser return from PayHere. Credits the quota, then sends the seller back to their listings. */
  async completePayHereReturn(
    body: Record<string, string | undefined>,
  ): Promise<string> {
    await this.handlePayHereNotify(body);
    const locale = body.custom_2 === 'si' ? 'si' : 'en';
    const orderId = body.order_id ?? '';
    const order = orderId
      ? await this.orders.findOne({ where: { payhereOrderId: orderId } })
      : null;
    const page =
      order?.audience === 'parts'
        ? `/${locale}/account/parts-listings`
        : `/${locale}/account/listings`;
    const quota = order?.status === 'paid' ? 'paid' : 'cancelled';
    return `${this.payhere.webUrl()}${page}?quota=${quota}`;
  }

  async handlePayHereNotify(body: Record<string, string | undefined>): Promise<string> {
    const merchantId = body.merchant_id ?? '';
    const orderId = body.order_id ?? '';
    const payhereAmount = body.payhere_amount ?? '';
    const payhereCurrency = body.payhere_currency ?? '';
    const statusCode = String(body.status_code ?? '');
    const md5sig = body.md5sig ?? '';
    const paymentId = body.payment_id ?? undefined;

    const configuredMerchant = this.payhere.requireMerchantId();
    if (merchantId !== configuredMerchant) {
      this.logger.warn(`PayHere listing notify merchant mismatch for order ${orderId}`);
      return 'OK';
    }
    const valid = this.payhere.verifyNotifyHash({
      merchantId,
      orderId,
      amount: payhereAmount,
      currency: payhereCurrency,
      statusCode,
      md5sig,
    });
    if (!valid) {
      this.logger.warn(`PayHere listing notify invalid hash for order ${orderId}`);
      return 'OK';
    }

    const order = await this.orders.findOne({ where: { payhereOrderId: orderId } });
    if (!order) {
      this.logger.warn(`PayHere listing notify unknown order ${orderId}`);
      return 'OK';
    }
    if (order.status === 'paid' && statusCode !== '-3') return 'OK';
    if (order.status === 'chargedback') return 'OK';

    if (statusCode === '2') {
      const expectedAmount = this.payhere.formatAmount(order.chargedPriceLkr);
      const expectedCurrency = this.payhere.currency();
      if (
        payhereAmount !== expectedAmount ||
        payhereCurrency.toUpperCase() !== expectedCurrency
      ) {
        order.status = 'failed';
        await this.orders.save(order);
        return 'OK';
      }
      const paid = await this.orders
        .createQueryBuilder()
        .update()
        .set({
          status: 'paid',
          paidAt: new Date(),
          ...(paymentId ? { payherePaymentId: paymentId } : {}),
        })
        .where('id = :id AND status = :status', { id: order.id, status: 'pending' })
        .execute();
      if (!paid.affected) return 'OK';
      await this.addPurchased(
        order.sellerId,
        order.audience === 'parts' ? 'parts' : 'dealer',
        order.listingCount,
      );
      return 'OK';
    }

    if (statusCode === '-3') {
      if (order.status === 'paid') {
        await this.addPurchased(
          order.sellerId,
          order.audience === 'parts' ? 'parts' : 'dealer',
          -order.listingCount,
        );
      }
      order.status = 'chargedback';
      await this.orders.save(order);
      return 'OK';
    }
    if (statusCode === '-1' || statusCode === '-2') {
      order.status = 'failed';
      await this.orders.save(order);
    }
    return 'OK';
  }

  private async consumePaidAudience(
    userId: string,
    quotaAudience: 'dealer' | 'parts',
    packageAudience: PackageAudience,
    existingListing: boolean,
  ) {
    const view = await this.view(userId, quotaAudience, await this.getSettings());
    const allowance = view.free + view.purchased;
    const blocked = existingListing ? view.used > allowance : view.used >= allowance;
    if (blocked) {
      const packages = await this.listPublic(packageAudience);
      throw new BadRequestException({
        success: false,
        error: {
          code: 'LISTING_PACKAGE_REQUIRED',
          message: 'Listing quota is used up. Choose a package to add more listings.',
          details: {
            audience: packageAudience,
            free: view.free,
            purchased: view.purchased,
            used: view.used,
            remaining: 0,
            packages: packages.map((pkg) => this.toPublicPackage(pkg)),
          },
        },
      });
    }
    await this.ensureUsed(userId, quotaAudience, view.used);
  }

  private async settleQuota(
    userId: string,
    audience: 'private',
    existingListing: boolean,
  ) {
    const settings = await this.getSettings();
    const view = await this.view(userId, audience, settings);
    const allowance = view.free + view.purchased;
    const blocked = existingListing ? view.used > allowance : view.used >= allowance;
    if (blocked) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'APPLY_DEALER',
          message: 'Free listings are used up. Apply as a dealer for more free listings.',
          details: {
            dealerFreeListings: settings.dealerFreeListings,
            used: view.used,
            free: view.free,
          },
        },
      });
    }
    await this.ensureUsed(userId, audience, view.used);
  }

  private async view(userId: string, audience: QuotaAudience, settings: ListingPostSettings) {
    const row = await this.quotas.findOne({ where: { userId, audience } });
    const free = freeListingsFor(audience, settings);
    const purchased = row?.purchased ?? 0;
    const placed = await this.placedCount(userId, audience);
    const used = Math.max(row?.used ?? 0, placed);
    return {
      audience,
      free,
      purchased,
      used,
      remaining: listingsRemaining(free, purchased, used),
    };
  }

  /** Listings already saved count against the quota, including ones created before quotas existed. */
  private async placedCount(userId: string, audience: QuotaAudience): Promise<number> {
    if (audience === 'parts') {
      const shops = await this.partsDealers.find({
        where: { ownerUserId: userId },
        select: { id: true },
      });
      if (!shops.length) return 0;
      return this.partListings.count({
        where: { partsDealerId: In(shops.map((shop) => shop.id)) },
      });
    }
    return this.listings.count({ where: { sellerId: userId } });
  }

  private async quotaRow(userId: string, audience: QuotaAudience): Promise<ListingQuota> {
    const existing = await this.quotas.findOne({ where: { userId, audience } });
    if (existing) return existing;
    try {
      return await this.quotas.save(
        this.quotas.create({ userId, audience, purchased: 0, used: 0 }),
      );
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const again = await this.quotas.findOne({ where: { userId, audience } });
      if (!again) throw err;
      return again;
    }
  }

  private async ensureUsed(userId: string, audience: QuotaAudience, used: number) {
    const row = await this.quotaRow(userId, audience);
    if (row.used >= used) return;
    row.used = used;
    await this.quotas.save(row);
  }

  private async addPurchased(userId: string, audience: QuotaAudience, count: number) {
    const row = await this.quotaRow(userId, audience);
    row.purchased = Math.max(0, row.purchased + count);
    await this.quotas.save(row);
  }

  private toPublicPackage(pkg: ListingPackage) {
    return {
      id: pkg.id,
      audience: pkg.audience,
      name: pkg.name,
      description: pkg.description,
      priceLkr: pkg.priceLkr,
      listingCount: pkg.listingCount,
      sortOrder: pkg.sortOrder,
    };
  }
}
