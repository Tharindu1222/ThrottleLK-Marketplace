import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import {
  DataSource,
  MoreThan,
  QueryFailedError,
  Repository,
} from 'typeorm';
import type {
  AdminPlaceHomepageInput,
  CreatePromoBankAccountInput,
  CreatePromoCheckoutInput,
  CreatePromoPackageInput,
  CreatePromoRequestMetaInput,
  UpdatePromoBankAccountInput,
  UpdatePromoPackageInput,
  UpdatePromoSettingsInput,
} from '@throttlelk/validation';
import { CacheService } from '../common/cache.service';
import { assertEmailVerified } from '../common/email-verified';
import { Listing } from '../listings/listing.entity';
import { ListingsService } from '../listings/listings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PartListing } from '../part-listings/part-listing.entity';
import { PartListingsService } from '../part-listings/part-listings.service';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.entity';
import { HomepagePlacement } from './homepage-placement.entity';
import { PayHereService } from './payhere.service';
import { PromoBankAccount } from './promo-bank-account.entity';
import {
  PromoPackage,
  type PromoSubjectType,
  type PromoSurface,
  type PromoTier,
} from './promo-package.entity';
import { PromoRequest } from './promo-request.entity';
import { PromoSettings } from './promo-settings.entity';
import {
  addUtcDays,
  assertSlipFile,
  buildPreviewIds,
  interleaveIds,
  slipExtension,
} from './promotions.util';

const PREVIEW_LIMIT = 8;

const TIER_DEFAULTS: Record<
  PromoTier,
  { surfaces: PromoSurface[]; priority: number }
> = {
  boost: { surfaces: ['browse', 'detail'], priority: 10 },
  featured: { surfaces: ['home', 'browse', 'detail'], priority: 20 },
  premium: { surfaces: ['home', 'browse', 'detail'], priority: 30 },
};

function defaultsForTier(tier: PromoTier) {
  return TIER_DEFAULTS[tier];
}

function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const driver = err.driverError as { code?: string } | undefined;
  return driver?.code === '23505' || (err as { code?: string }).code === '23505';
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectRepository(PromoPackage)
    private readonly packages: Repository<PromoPackage>,
    @InjectRepository(PromoBankAccount)
    private readonly accounts: Repository<PromoBankAccount>,
    @InjectRepository(PromoSettings)
    private readonly settings: Repository<PromoSettings>,
    @InjectRepository(PromoRequest)
    private readonly requests: Repository<PromoRequest>,
    @InjectRepository(HomepagePlacement)
    private readonly placements: Repository<HomepagePlacement>,
    @InjectRepository(Listing)
    private readonly listings: Repository<Listing>,
    @InjectRepository(PartListing)
    private readonly partListings: Repository<PartListing>,
    private readonly listingsService: ListingsService,
    private readonly partListingsService: PartListingsService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
    private readonly payhere: PayHereService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listPublicPackages(kind: PromoSubjectType) {
    return this.packages.find({
      where: { kind, isActive: true },
      order: { sortOrder: 'ASC', priceLkr: 'ASC' },
    });
  }

  async paymentInfo() {
    const [bank, settings] = await Promise.all([
      this.accounts.findOne({ where: { isDefault: true, isActive: true } }),
      this.getSettings(),
    ]);
    return {
      bank: bank
        ? {
            id: bank.id,
            bankName: bank.bankName,
            accountName: bank.accountName,
            accountNumber: bank.accountNumber,
            branch: bank.branch,
          }
        : null,
      whatsapp: settings.whatsapp,
    };
  }

  async statusFor(
    sellerId: string,
    listingId?: string,
    partListingId?: string,
  ) {
    if (listingId || partListingId) {
      const subjectType: PromoSubjectType = listingId ? 'bike' : 'part';
      await this.assertOwnedActive(
        sellerId,
        subjectType,
        listingId ?? null,
        partListingId ?? null,
      );
    }
    const pending = await this.findPending(listingId ?? null, partListingId ?? null);
    const live = await this.findLive(listingId ?? null, partListingId ?? null);
    const latest = await this.requests.findOne({
      where: listingId ? { listingId, sellerId } : { partListingId, sellerId },
      order: { createdAt: 'DESC' },
    });
    const payhereRetryable =
      pending?.sellerId === sellerId &&
      pending.paymentProvider === 'payhere' &&
      (pending.paymentStatus === 'unpaid' || pending.paymentStatus === 'failed');
    return {
      pending: pending
        ? {
            id: pending.id,
            createdAt: pending.createdAt.toISOString(),
            paymentProvider: pending.paymentProvider,
            paymentStatus: pending.paymentStatus,
          }
        : null,
      live: live
        ? { id: live.id, endsAt: live.endsAt.toISOString() }
        : null,
      rejected:
        latest?.status === 'rejected'
          ? { reason: latest.rejectionReason }
          : null,
      canRequest: (!pending || payhereRetryable) && !live,
    };
  }

  async mineStatuses(sellerId: string) {
    const [pending, live] = await Promise.all([
      this.requests.find({ where: { sellerId, status: 'pending' } }),
      this.placements.find({
        where: { endsAt: MoreThan(new Date()) },
        relations: ['listing', 'partListing', 'partListing.partsDealer'],
      }),
    ]);
    const mineLive = live.filter(
      (row) =>
        row.listing?.sellerId === sellerId ||
        row.partListing?.partsDealer?.ownerUserId === sellerId,
    );
    return {
      pending: pending.map((row) => ({
        id: row.id,
        listingId: row.listingId,
        partListingId: row.partListingId,
      })),
      live: mineLive.map((row) => ({
        id: row.id,
        listingId: row.listingId,
        partListingId: row.partListingId,
        endsAt: row.endsAt.toISOString(),
      })),
    };
  }

  async createCheckout(seller: User, input: CreatePromoCheckoutInput) {
    assertEmailVerified(seller, 'requesting a homepage ad');
    const merchantId = this.payhere.requireMerchantId();
    const subjectType: PromoSubjectType = input.listingId ? 'bike' : 'part';
    const listingId = input.listingId ?? null;
    const partListingId = input.partListingId ?? null;
    await this.assertOwnedActive(seller.id, subjectType, listingId, partListingId);

    const pkg = await this.packages.findOne({ where: { id: input.packageId } });
    if (!pkg || !pkg.isActive || pkg.kind !== subjectType) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_PACKAGE', message: 'Package is not available' },
      });
    }
    const existingPending = await this.findPending(listingId, partListingId);
    if (existingPending) {
      const reclaimable =
        existingPending.sellerId === seller.id &&
        existingPending.paymentProvider === 'payhere' &&
        (existingPending.paymentStatus === 'unpaid' ||
          existingPending.paymentStatus === 'failed');
      if (!reclaimable) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'REQUEST_PENDING',
            message: 'A homepage request is already pending',
          },
        });
      }
    }
    if (await this.findLive(listingId, partListingId)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ALREADY_LIVE',
          message: 'This listing is already on the homepage',
        },
      });
    }

    const orderId = `promo_${randomUUID()}`;
    const currency = this.payhere.currency();
    const amount = this.payhere.formatAmount(pkg.priceLkr);
    const locale = input.locale === 'si' ? 'si' : 'en';
    const promotePath = listingId
      ? `/${locale}/account/listings/${listingId}/promote`
      : `/${locale}/account/parts-listings/${partListingId}/promote`;
    const webUrl = this.payhere.webUrl();
    const returnUrl = `${webUrl}${promotePath}?paid=1`;
    const cancelUrl = `${webUrl}${promotePath}?cancelled=1`;
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

    let saved: PromoRequest;
    try {
      if (existingPending) {
        existingPending.packageId = pkg.id;
        existingPending.payhereOrderId = orderId;
        existingPending.paymentStatus = 'unpaid';
        existingPending.paymentProvider = 'payhere';
        existingPending.bankAccountId = null;
        existingPending.slipStorageKey = null;
        existingPending.slipContentType = null;
        existingPending.slipOriginalName = null;
        existingPending.payherePaymentId = null;
        existingPending.paidAt = null;
        saved = await this.requests.save(existingPending);
      } else {
        saved = await this.requests.save(
          this.requests.create({
            sellerId: seller.id,
            subjectType,
            listingId,
            partListingId,
            packageId: pkg.id,
            bankAccountId: null,
            slipStorageKey: null,
            slipContentType: null,
            slipOriginalName: null,
            paymentProvider: 'payhere',
            payhereOrderId: orderId,
            paymentStatus: 'unpaid',
            status: 'pending',
          }),
        );
      }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'REQUEST_PENDING',
            message: 'A homepage request is already pending',
          },
        });
      }
      throw err;
    }
    this.cache.invalidateDashboard();

    const hash = this.payhere.buildCheckoutHash({
      merchantId,
      orderId,
      amount,
      currency,
    });
    const items = `ThrottleLK ${pkg.name} (${pkg.durationDays} days)`;

    return {
      checkoutUrl: this.payhere.checkoutUrl(),
      merchant_id: merchantId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      order_id: orderId,
      items,
      currency,
      amount,
      hash,
      first_name: seller.firstName || 'Seller',
      last_name: seller.lastName || 'ThrottleLK',
      email: seller.email,
      phone: seller.phone ?? undefined,
      custom_1: saved.id,
    };
  }

  async createRequest(
    seller: User,
    meta: CreatePromoRequestMetaInput,
    file?: Express.Multer.File,
  ) {
    assertEmailVerified(seller, 'requesting a homepage ad');
    this.wrapSlip(file);
    const subjectType: PromoSubjectType = meta.listingId ? 'bike' : 'part';
    const listingId = meta.listingId ?? null;
    const partListingId = meta.partListingId ?? null;
    await this.assertOwnedActive(seller.id, subjectType, listingId, partListingId);

    const pkg = await this.packages.findOne({ where: { id: meta.packageId } });
    if (!pkg || !pkg.isActive || pkg.kind !== subjectType) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_PACKAGE', message: 'Package is not available' },
      });
    }
    const bank = await this.accounts.findOne({
      where: { isDefault: true, isActive: true },
    });
    if (!bank) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NO_BANK_ACCOUNT',
          message: 'Homepage ads are not available yet',
        },
      });
    }
    if (await this.findPending(listingId, partListingId)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'REQUEST_PENDING',
          message: 'A homepage request is already pending',
        },
      });
    }
    if (await this.findLive(listingId, partListingId)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ALREADY_LIVE',
          message: 'This listing is already on the homepage',
        },
      });
    }

    const key = `promo-slips/${randomUUID()}/${randomUUID()}.${slipExtension(file!.mimetype)}`;
    await this.storage.putObject(key, file!.buffer, file!.mimetype, {
      access: 'private',
    });
    try {
      const saved = await this.requests.save(
        this.requests.create({
          sellerId: seller.id,
          subjectType,
          listingId,
          partListingId,
          packageId: pkg.id,
          bankAccountId: bank.id,
          slipStorageKey: key,
          slipContentType: file!.mimetype,
          slipOriginalName: file!.originalname || 'slip',
          paymentProvider: 'bank',
          paymentStatus: 'unpaid',
          status: 'pending',
        }),
      );
      this.cache.invalidateDashboard();
      return saved;
    } catch (err) {
      await this.storage.deleteObject(key).catch(() => undefined);
      if (isUniqueViolation(err)) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'REQUEST_PENDING',
            message: 'A homepage request is already pending',
          },
        });
      }
      throw err;
    }
  }

  async replaceSlip(seller: User, requestId: string, file?: Express.Multer.File) {
    this.wrapSlip(file);
    const request = await this.requests.findOne({ where: { id: requestId } });
    if (!request) this.notFound('Request');
    if (request.sellerId !== seller.id) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your request' },
      });
    }
    if (request.status !== 'pending') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'NOT_PENDING',
          message: 'Only pending requests can replace a slip',
        },
      });
    }
    if (request.paymentProvider === 'payhere') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PAYHERE_NO_SLIP',
          message: 'PayHere requests do not use payment slips',
        },
      });
    }
    const key = `promo-slips/${request.id}/${randomUUID()}.${slipExtension(file!.mimetype)}`;
    await this.storage.putObject(key, file!.buffer, file!.mimetype, {
      access: 'private',
    });
    if (request.slipStorageKey) {
      await this.storage.deleteObject(request.slipStorageKey).catch(() => undefined);
    }
    request.slipStorageKey = key;
    request.slipContentType = file!.mimetype;
    request.slipOriginalName = file!.originalname || 'slip';
    return this.requests.save(request);
  }

  /**
   * Shared activation used by PayHere notify and admin bank-slip approve.
   */
  async activatePaidRequest(
    requestId: string,
    opts?: { paymentId?: string; reviewedById?: string },
  ) {
    const { saved, title, endsAt, alreadyActive } =
      await this.dataSource.transaction(async (manager) => {
        const request = await manager
          .getRepository(PromoRequest)
          .createQueryBuilder('r')
          .setLock('pessimistic_write')
          .leftJoinAndSelect('r.package', 'package')
          .leftJoinAndSelect('r.listing', 'listing')
          .leftJoinAndSelect('r.partListing', 'partListing')
          .where('r.id = :id', { id: requestId })
          .getOne();
        if (!request) this.notFound('Request');

        if (
          request.status === 'approved' &&
          (request.paymentStatus === 'paid' ||
            request.paymentProvider === 'bank')
        ) {
          return {
            saved: request,
            title:
              request.listing?.title ??
              request.partListing?.title ??
              'Your listing',
            endsAt: null as Date | null,
            alreadyActive: true,
          };
        }

        if (request.status !== 'pending') {
          throw new BadRequestException({
            success: false,
            error: { code: 'NOT_PENDING', message: 'Request is not pending' },
          });
        }
        await this.assertStillActive(request);

        const live = await this.findLive(
          request.listingId,
          request.partListingId,
          manager.getRepository(HomepagePlacement),
        );
        if (live) {
          throw new BadRequestException({
            success: false,
            error: {
              code: 'ALREADY_LIVE',
              message: 'This listing is already on the homepage',
            },
          });
        }

        const startsAt = new Date();
        const placementEndsAt = addUtcDays(
          startsAt,
          request.package.durationDays,
        );
        const pkg = request.package;
        const tier: PromoTier = pkg.tier ?? 'featured';
        const tierDefaults = defaultsForTier(tier);
        await manager.getRepository(HomepagePlacement).save(
          manager.getRepository(HomepagePlacement).create({
            requestId: request.id,
            source: 'request',
            subjectType: request.subjectType,
            listingId: request.listingId,
            partListingId: request.partListingId,
            tier,
            surfaces: pkg.surfaces?.length
              ? pkg.surfaces
              : tierDefaults.surfaces,
            priority: pkg.priority ?? tierDefaults.priority,
            startsAt,
            endsAt: placementEndsAt,
          }),
        );
        request.status = 'approved';
        request.paymentStatus = 'paid';
        request.paidAt = new Date();
        if (opts?.paymentId) {
          request.payherePaymentId = opts.paymentId;
        }
        if (opts?.reviewedById) {
          request.reviewedById = opts.reviewedById;
          request.reviewedAt = new Date();
        } else {
          request.reviewedAt = new Date();
        }
        request.rejectionReason = null;
        const row = await manager.getRepository(PromoRequest).save(request);
        return {
          saved: row,
          title:
            request.listing?.title ??
            request.partListing?.title ??
            'Your listing',
          endsAt: placementEndsAt,
          alreadyActive: false,
        };
      });

    if (!alreadyActive && endsAt) {
      await this.notifications.promoApproved(saved.sellerId, {
        title,
        endsAt,
        listingId: saved.listingId,
        partListingId: saved.partListingId,
      });
      this.cache.invalidateDashboard();
    }
    return saved;
  }

  async approve(admin: User, requestId: string) {
    return this.activatePaidRequest(requestId, { reviewedById: admin.id });
  }

  async handlePayHereNotify(body: Record<string, string | undefined>) {
    const merchantId = body.merchant_id ?? '';
    const orderId = body.order_id ?? '';
    const payhereAmount = body.payhere_amount ?? '';
    const payhereCurrency = body.payhere_currency ?? '';
    const statusCode = String(body.status_code ?? '');
    const md5sig = body.md5sig ?? '';
    const paymentId = body.payment_id ?? undefined;
    const custom1 = body.custom_1 ?? undefined;

    const configuredMerchant = this.payhere.requireMerchantId();
    if (merchantId !== configuredMerchant) {
      this.logger.warn(`PayHere notify merchant mismatch for order ${orderId}`);
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
      this.logger.warn(`PayHere notify invalid hash for order ${orderId}`);
      return 'OK';
    }

    const request =
      (await this.requests.findOne({
        where: { payhereOrderId: orderId },
        relations: ['package'],
      })) ??
      (custom1
        ? await this.requests.findOne({
            where: { id: custom1 },
            relations: ['package'],
          })
        : null);

    if (!request) {
      this.logger.warn(`PayHere notify unknown order ${orderId}`);
      return 'OK';
    }

    if (request.status === 'approved' || request.paymentStatus === 'paid') {
      return 'OK';
    }

    if (statusCode === '2') {
      const expectedAmount = this.payhere.formatAmount(
        request.package?.priceLkr ?? 0,
      );
      const expectedCurrency = this.payhere.currency();
      if (
        payhereAmount !== expectedAmount ||
        payhereCurrency.toUpperCase() !== expectedCurrency
      ) {
        this.logger.warn(
          `PayHere notify amount/currency mismatch for order ${orderId}`,
        );
        request.paymentStatus = 'failed';
        await this.requests.save(request);
        return 'OK';
      }
      try {
        await this.activatePaidRequest(request.id, { paymentId });
      } catch (err) {
        this.logger.error(
          `PayHere activate failed for ${request.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      return 'OK';
    }

    if (statusCode === '-3') {
      request.paymentStatus = 'chargedback';
      await this.requests.save(request);
      return 'OK';
    }

    if (statusCode === '-1' || statusCode === '-2') {
      request.paymentStatus = 'failed';
      await this.requests.save(request);
    }

    return 'OK';
  }

  async reject(admin: User, requestId: string, reason: string) {
    const trimmed = reason.trim();
    if (!trimmed) {
      throw new BadRequestException({
        success: false,
        error: { code: 'REASON_REQUIRED', message: 'Rejection reason is required' },
      });
    }
    const request = await this.requests.findOne({
      where: { id: requestId },
      relations: ['listing', 'partListing'],
    });
    if (!request) this.notFound('Request');
    if (request.status !== 'pending') {
      throw new BadRequestException({
        success: false,
        error: { code: 'NOT_PENDING', message: 'Request is not pending' },
      });
    }
    request.status = 'rejected';
    request.rejectionReason = trimmed;
    request.reviewedById = admin.id;
    request.reviewedAt = new Date();
    const saved = await this.requests.save(request);
    await this.notifications.promoRejected(request.sellerId, {
      title: request.listing?.title ?? request.partListing?.title ?? 'Your listing',
      reason: trimmed,
      listingId: request.listingId,
      partListingId: request.partListingId,
    });
    this.cache.invalidateDashboard();
    return saved;
  }

  async listRequests(status?: string) {
    const qb = this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.package', 'package')
      .leftJoinAndSelect('r.bankAccount', 'bank')
      .leftJoinAndSelect('r.seller', 'seller')
      .leftJoinAndSelect('r.listing', 'listing')
      .leftJoinAndSelect('r.partListing', 'partListing')
      .orderBy('r.createdAt', 'DESC');
    if (status) qb.andWhere('r.status = :status', { status });
    const rows = await qb.getMany();
    return rows.map((row) => {
      const { slipStorageKey: _slipStorageKey, seller, ...rest } = row;
      return {
        ...rest,
        seller: seller
          ? {
              id: seller.id,
              firstName: seller.firstName,
              lastName: seller.lastName,
              email: seller.email,
              phone: seller.phone,
              avatarUrl: seller.avatarUrl,
              roles: (seller.roles ?? []).map((role) => role.name),
              status: seller.status,
              emailVerifiedAt: seller.emailVerifiedAt,
              createdAt: seller.createdAt,
            }
          : null,
      };
    });
  }

  async listLivePlacements() {
    return this.placements.find({
      where: { endsAt: MoreThan(new Date()) },
      relations: ['listing', 'partListing', 'request'],
      order: { startsAt: 'DESC' },
    });
  }

  async getSlip(requestId: string) {
    const request = await this.requests.findOne({ where: { id: requestId } });
    if (!request) this.notFound('Request');
    if (!request.slipStorageKey) {
      throw new NotFoundException({
        success: false,
        error: { code: 'NO_SLIP', message: 'No payment slip for this request' },
      });
    }
    const { buffer, contentType } = await this.storage.getObject(
      request.slipStorageKey,
    );
    return {
      buffer,
      contentType: contentType || request.slipContentType || 'application/octet-stream',
      filename: request.slipOriginalName || 'slip',
    };
  }

  async adminPlace(admin: User, input: AdminPlaceHomepageInput) {
    const listingId = input.listingId ?? null;
    const partListingId = input.partListingId ?? null;
    await this.assertStillActive({
      subjectType: input.subjectType,
      listingId,
      partListingId,
    });

    const pending = await this.findPending(listingId, partListingId);
    if (pending) {
      await this.reject(admin, pending.id, 'Placed by admin');
    }

    let tier: PromoTier = 'featured';
    let surfaces: PromoSurface[] = defaultsForTier('featured').surfaces;
    let priority = defaultsForTier('featured').priority;
    let durationDays = input.durationDays ?? 7;
    if (input.packageId) {
      const pkg = await this.packages.findOne({
        where: { id: input.packageId },
      });
      if (!pkg) this.notFound('Package');
      tier = pkg.tier;
      surfaces = [...pkg.surfaces];
      priority = pkg.priority;
      durationDays = input.durationDays ?? pkg.durationDays;
    }

    const endsAt = input.endsAt
      ? new Date(input.endsAt)
      : addUtcDays(new Date(), durationDays);
    const existing = await this.findLive(listingId, partListingId);
    if (existing) {
      existing.endsAt = endsAt;
      existing.source = 'admin_override';
      existing.tier = tier;
      existing.surfaces = surfaces;
      existing.priority = priority;
      return this.placements.save(existing);
    }
    return this.placements.save(
      this.placements.create({
        requestId: null,
        source: 'admin_override',
        subjectType: input.subjectType,
        listingId,
        partListingId,
        tier,
        surfaces,
        priority,
        startsAt: new Date(),
        endsAt,
      }),
    );
  }

  async updatePlacementEnds(id: string, endsAtIso: string) {
    const row = await this.placements.findOne({ where: { id } });
    if (!row) this.notFound('Placement');
    row.endsAt = new Date(endsAtIso);
    return this.placements.save(row);
  }

  async endPlacement(id: string) {
    const row = await this.placements.findOne({ where: { id } });
    if (!row) this.notFound('Placement');
    row.endsAt = new Date();
    return this.placements.save(row);
  }

  async marketplacePreview() {
    const now = new Date();
    const live = await this.placements
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.listing', 'listing')
      .leftJoinAndSelect('p.partListing', 'partListing')
      .where('p.endsAt > :now', { now })
      .andWhere(`p.surfaces @> :homeSurface::jsonb`, {
        homeSurface: JSON.stringify(['home']),
      })
      .orderBy('p.priority', 'DESC')
      .addOrderBy('p.startsAt', 'DESC')
      .getMany();
    const bikeFeatured = live
      .filter((row) => row.subjectType === 'bike' && row.listing?.status === 'active')
      .map((row) => row.listingId)
      .filter((id): id is string => Boolean(id));
    const partFeatured = live
      .filter(
        (row) => row.subjectType === 'part' && row.partListing?.status === 'active',
      )
      .map((row) => row.partListingId)
      .filter((id): id is string => Boolean(id));

    const [newestBikes, spare, modified] = await Promise.all([
      this.listingsService.listPublic({
        sort: 'newest',
        limit: String(PREVIEW_LIMIT * 2),
      }),
      this.partListingsService.listPublic({
        kind: 'spare',
        sort: 'newest',
        limit: String(PREVIEW_LIMIT),
      }),
      this.partListingsService.listPublic({
        kind: 'modified',
        sort: 'newest',
        limit: String(PREVIEW_LIMIT),
      }),
    ]);

    const bikeIds = buildPreviewIds(
      bikeFeatured,
      newestBikes.items.map((item) => item.id),
      PREVIEW_LIMIT,
    );
    const partFill = interleaveIds(
      spare.items.map((item) => item.id),
      modified.items.map((item) => item.id),
      PREVIEW_LIMIT * 2,
    );
    const partIds = buildPreviewIds(partFeatured, partFill, PREVIEW_LIMIT);

    const featuredBikeSet = new Set(bikeFeatured);
    const featuredPartSet = new Set(partFeatured);
    const bikeTierById = new Map(
      live
        .filter((row) => row.listingId)
        .map((row) => [row.listingId!, row.tier] as const),
    );
    const partTierById = new Map(
      live
        .filter((row) => row.partListingId)
        .map((row) => [row.partListingId!, row.tier] as const),
    );
    const [bikes, parts] = await Promise.all([
      this.listingsService.browseCardsByIds(bikeIds),
      this.partListingsService.browseCardsByIds(partIds),
    ]);
    return {
      bikes: bikes.map((card) => ({
        ...card,
        isTop: featuredBikeSet.has(card.id),
        tier: bikeTierById.get(card.id) ?? null,
      })),
      parts: parts.map((card) => ({
        ...card,
        isTop: featuredPartSet.has(card.id),
        tier: partTierById.get(card.id) ?? null,
      })),
    };
  }

  async listLiveForSurface(
    surface: PromoSurface,
    kind: PromoSubjectType,
    limit: number,
  ) {
    const capped = Math.min(Math.max(limit, 1), 24);
    const now = new Date();
    const live = await this.placements
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.listing', 'listing')
      .leftJoinAndSelect('p.partListing', 'partListing')
      .where('p.endsAt > :now', { now })
      .andWhere('p.subjectType = :kind', { kind })
      .andWhere(`p.surfaces @> :surface::jsonb`, {
        surface: JSON.stringify([surface]),
      })
      .orderBy('p.priority', 'DESC')
      .addOrderBy('p.startsAt', 'DESC')
      .getMany();

    if (kind === 'bike') {
      const rows = live
        .filter((row) => row.listing?.status === 'active')
        .slice(0, capped);
      const ids = rows
        .map((row) => row.listingId)
        .filter((id): id is string => Boolean(id));
      const tierById = new Map(
        rows.map((row) => [row.listingId!, row.tier] as const),
      );
      const cards = await this.listingsService.browseCardsByIds(ids);
      return cards.map((card) => ({
        ...card,
        isTop: true,
        tier: tierById.get(card.id) ?? 'featured',
      }));
    }

    const rows = live
      .filter((row) => row.partListing?.status === 'active')
      .slice(0, capped);
    const ids = rows
      .map((row) => row.partListingId)
      .filter((id): id is string => Boolean(id));
    const tierById = new Map(
      rows.map((row) => [row.partListingId!, row.tier] as const),
    );
    const cards = await this.partListingsService.browseCardsByIds(ids);
    return cards.map((card) => ({
      ...card,
      isTop: true,
      tier: tierById.get(card.id) ?? 'featured',
    }));
  }

  async createPackage(input: CreatePromoPackageInput) {
    const fields = this.resolvePackageTierFields(input);
    return this.packages.save(
      this.packages.create({
        ...input,
        ...fields,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      }),
    );
  }

  async updatePackage(id: string, input: UpdatePromoPackageInput) {
    const row = await this.packages.findOne({ where: { id } });
    if (!row) this.notFound('Package');
    const next = { ...input };
    if (next.tier !== undefined && next.surfaces === undefined) {
      const defaults = defaultsForTier(next.tier);
      next.surfaces = defaults.surfaces;
      if (next.priority === undefined) next.priority = defaults.priority;
    }
    Object.assign(row, next);
    return this.packages.save(row);
  }

  async listPackagesAdmin() {
    return this.packages.find({ order: { kind: 'ASC', sortOrder: 'ASC' } });
  }

  async createBank(input: CreatePromoBankAccountInput) {
    const row = this.accounts.create({
      ...input,
      branch: input.branch ?? null,
      isDefault: input.isDefault ?? false,
      isActive: input.isActive ?? true,
    });
    const saved: PromoBankAccount = await this.accounts.save(row);
    if (saved.isDefault) await this.unsetOtherDefaults(saved.id);
    return saved;
  }

  async updateBank(id: string, input: UpdatePromoBankAccountInput) {
    const row = await this.accounts.findOne({ where: { id } });
    if (!row) this.notFound('Bank account');
    Object.assign(row, input);
    const saved = await this.accounts.save(row);
    if (saved.isDefault) await this.unsetOtherDefaults(saved.id);
    return saved;
  }

  async listBanksAdmin() {
    return this.accounts.find({ order: { isDefault: 'DESC', createdAt: 'DESC' } });
  }

  async updateSettings(input: UpdatePromoSettingsInput) {
    const row = await this.getSettings();
    if (input.whatsapp !== undefined) row.whatsapp = input.whatsapp;
    return this.settings.save(row);
  }

  async searchSubjects(kind: PromoSubjectType, q?: string) {
    const term = q?.trim();
    if (kind === 'bike') {
      const { items } = await this.listingsService.listPublic({
        q: term,
        sort: 'newest',
        limit: '20',
      });
      return items;
    }
    const { items } = await this.partListingsService.listPublic({
      q: term,
      sort: 'newest',
      limit: '20',
    });
    return items;
  }

  async countPending() {
    return this.requests.count({ where: { status: 'pending' } });
  }

  private async getSettings() {
    const existing = await this.settings.findOne({ where: { id: 'default' } });
    if (existing) return existing;
    return this.settings.save(
      this.settings.create({ id: 'default', whatsapp: null }),
    );
  }

  private async unsetOtherDefaults(keepId: string) {
    const others = await this.accounts.find({ where: { isDefault: true } });
    for (const row of others) {
      if (row.id === keepId) continue;
      row.isDefault = false;
      await this.accounts.save(row);
    }
  }

  private async findPending(listingId: string | null, partListingId: string | null) {
    if (listingId) {
      return this.requests.findOne({
        where: { listingId, status: 'pending' },
      });
    }
    if (partListingId) {
      return this.requests.findOne({
        where: { partListingId, status: 'pending' },
      });
    }
    return null;
  }

  private async findLive(
    listingId: string | null,
    partListingId: string | null,
    repo: Repository<HomepagePlacement> = this.placements,
  ) {
    if (listingId) {
      return repo.findOne({
        where: { listingId, endsAt: MoreThan(new Date()) },
      });
    }
    if (partListingId) {
      return repo.findOne({
        where: { partListingId, endsAt: MoreThan(new Date()) },
      });
    }
    return null;
  }

  private async assertOwnedActive(
    sellerId: string,
    subjectType: PromoSubjectType,
    listingId: string | null,
    partListingId: string | null,
  ) {
    if (subjectType === 'bike') {
      const listing = await this.listings.findOne({ where: { id: listingId! } });
      if (!listing) this.notFound('Listing');
      if (listing.sellerId !== sellerId) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not your listing' },
        });
      }
      if (listing.status !== 'active') {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'LISTING_NOT_ACTIVE',
            message: 'Only active listings can be promoted',
          },
        });
      }
      return;
    }
    const listing = await this.partListings.findOne({
      where: { id: partListingId! },
      relations: ['partsDealer'],
    });
    if (!listing) this.notFound('Part listing');
    if (listing.partsDealer?.ownerUserId !== sellerId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your listing' },
      });
    }
    if (listing.status !== 'active') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'LISTING_NOT_ACTIVE',
          message: 'Only active listings can be promoted',
        },
      });
    }
  }

  private async assertStillActive(input: {
    subjectType: PromoSubjectType;
    listingId: string | null;
    partListingId: string | null;
  }) {
    if (input.subjectType === 'bike') {
      const listing = await this.listings.findOne({
        where: { id: input.listingId! },
      });
      if (!listing || listing.status !== 'active') {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'LISTING_NOT_ACTIVE',
            message: 'Listing is not active',
          },
        });
      }
      return;
    }
    const listing = await this.partListings.findOne({
      where: { id: input.partListingId! },
    });
    if (!listing || listing.status !== 'active') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'LISTING_NOT_ACTIVE',
          message: 'Listing is not active',
        },
      });
    }
  }

  private wrapSlip(file?: Express.Multer.File) {
    try {
      assertSlipFile(file);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'INVALID_FILE';
      const message =
        code === 'FILE_REQUIRED'
          ? 'Payment slip is required'
          : code === 'FILE_TOO_LARGE'
            ? 'Max slip size is 5MB'
            : 'Slip must be JPEG, PNG, WebP, or PDF';
      throw new BadRequestException({
        success: false,
        error: { code, message },
      });
    }
  }

  private resolvePackageTierFields(input: {
    tier?: PromoTier;
    surfaces?: PromoSurface[];
    priority?: number;
  }): { tier: PromoTier; surfaces: PromoSurface[]; priority: number } {
    const tier = input.tier ?? 'featured';
    const defaults = defaultsForTier(tier);
    return {
      tier,
      surfaces: input.surfaces ?? defaults.surfaces,
      priority: input.priority ?? defaults.priority,
    };
  }

  private notFound(label: string): never {
    throw new NotFoundException({
      success: false,
      error: { code: 'NOT_FOUND', message: `${label} not found` },
    });
  }
}
