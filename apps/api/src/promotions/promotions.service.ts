import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { MoreThan, Repository } from 'typeorm';
import type {
  AdminPlaceHomepageInput,
  CreatePromoBankAccountInput,
  CreatePromoPackageInput,
  CreatePromoRequestMetaInput,
  UpdatePromoBankAccountInput,
  UpdatePromoPackageInput,
  UpdatePromoSettingsInput,
} from '@throttlelk/validation';
import { CacheService } from '../common/cache.service';
import { Listing } from '../listings/listing.entity';
import { ListingsService } from '../listings/listings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PartListing } from '../part-listings/part-listing.entity';
import { PartListingsService } from '../part-listings/part-listings.service';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.entity';
import { HomepagePlacement } from './homepage-placement.entity';
import { PromoBankAccount } from './promo-bank-account.entity';
import { PromoPackage, type PromoSubjectType } from './promo-package.entity';
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

@Injectable()
export class PromotionsService {
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
    const pending = await this.findPending(listingId ?? null, partListingId ?? null);
    const live = await this.findLive(listingId ?? null, partListingId ?? null);
    const latest = await this.requests.findOne({
      where: listingId ? { listingId, sellerId } : { partListingId, sellerId },
      order: { createdAt: 'DESC' },
    });
    return {
      pending: pending
        ? { id: pending.id, createdAt: pending.createdAt.toISOString() }
        : null,
      live: live
        ? { id: live.id, endsAt: live.endsAt.toISOString() }
        : null,
      rejected:
        latest?.status === 'rejected'
          ? { reason: latest.rejectionReason }
          : null,
      canRequest: !pending && !live,
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

  async createRequest(
    seller: User,
    meta: CreatePromoRequestMetaInput,
    file?: Express.Multer.File,
  ) {
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
    await this.storage.putObject(key, file!.buffer, file!.mimetype);
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
        status: 'pending',
      }),
    );
    this.cache.invalidateDashboard();
    return saved;
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
    const key = `promo-slips/${request.id}/${randomUUID()}.${slipExtension(file!.mimetype)}`;
    await this.storage.putObject(key, file!.buffer, file!.mimetype);
    await this.storage.deleteObject(request.slipStorageKey).catch(() => undefined);
    request.slipStorageKey = key;
    request.slipContentType = file!.mimetype;
    request.slipOriginalName = file!.originalname || 'slip';
    return this.requests.save(request);
  }

  async approve(admin: User, requestId: string) {
    const request = await this.requests.findOne({
      where: { id: requestId },
      relations: ['package', 'listing', 'partListing'],
    });
    if (!request) this.notFound('Request');
    if (request.status !== 'pending') {
      throw new BadRequestException({
        success: false,
        error: { code: 'NOT_PENDING', message: 'Request is not pending' },
      });
    }
    await this.assertStillActive(request);

    const startsAt = new Date();
    const endsAt = addUtcDays(startsAt, request.package.durationDays);
    await this.placements.save(
      this.placements.create({
        requestId: request.id,
        source: 'request',
        subjectType: request.subjectType,
        listingId: request.listingId,
        partListingId: request.partListingId,
        startsAt,
        endsAt,
      }),
    );
    request.status = 'approved';
    request.reviewedById = admin.id;
    request.reviewedAt = new Date();
    request.rejectionReason = null;
    const saved = await this.requests.save(request);
    const title =
      request.listing?.title ?? request.partListing?.title ?? 'Your listing';
    await this.notifications.promoApproved(request.sellerId, {
      title,
      endsAt,
      listingId: request.listingId,
      partListingId: request.partListingId,
    });
    this.cache.invalidateDashboard();
    return saved;
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
    return qb.getMany();
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
    const { buffer, contentType } = await this.storage.getObject(
      request.slipStorageKey,
    );
    return {
      buffer,
      contentType: contentType || request.slipContentType,
      filename: request.slipOriginalName,
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

    const endsAt = input.endsAt
      ? new Date(input.endsAt)
      : addUtcDays(new Date(), input.durationDays ?? 7);
    const existing = await this.findLive(listingId, partListingId);
    if (existing) {
      existing.endsAt = endsAt;
      existing.source = 'admin_override';
      return this.placements.save(existing);
    }
    return this.placements.save(
      this.placements.create({
        requestId: null,
        source: 'admin_override',
        subjectType: input.subjectType,
        listingId,
        partListingId,
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
    const live = await this.placements.find({
      where: { endsAt: MoreThan(now) },
      relations: ['listing', 'partListing'],
      order: { startsAt: 'DESC' },
    });
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
    const [bikes, parts] = await Promise.all([
      this.listingsService.browseCardsByIds(bikeIds),
      this.partListingsService.browseCardsByIds(partIds),
    ]);
    return {
      bikes: bikes.map((card) => ({
        ...card,
        isTop: featuredBikeSet.has(card.id),
      })),
      parts: parts.map((card) => ({
        ...card,
        isTop: featuredPartSet.has(card.id),
      })),
    };
  }

  async createPackage(input: CreatePromoPackageInput) {
    return this.packages.save(
      this.packages.create({
        ...input,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      }),
    );
  }

  async updatePackage(id: string, input: UpdatePromoPackageInput) {
    const row = await this.packages.findOne({ where: { id } });
    if (!row) this.notFound('Package');
    Object.assign(row, input);
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

  private async findLive(listingId: string | null, partListingId: string | null) {
    if (listingId) {
      return this.placements.findOne({
        where: { listingId, endsAt: MoreThan(new Date()) },
      });
    }
    if (partListingId) {
      return this.placements.findOne({
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

  private notFound(label: string): never {
    throw new NotFoundException({
      success: false,
      error: { code: 'NOT_FOUND', message: `${label} not found` },
    });
  }
}
