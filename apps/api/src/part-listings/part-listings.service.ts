import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AdminCreatePartListingInput,
  AdminUpdatePartListingInput,
  ContactListingInput,
  CreatePartListingInput,
  MarkSoldInput,
  UpdatePartListingInput,
} from '@throttlelk/validation';
import type { ListingStatus, PartListingKind } from '@throttlelk/types';
import { In, Repository } from 'typeorm';
import { CacheService } from '../common/cache.service';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { slugify } from '../common/slugify';
import {
  escapeLikePattern,
  searchTokens,
} from '../listings/listings.service';
import { Listing } from '../listings/listing.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PartsDealersService } from '../parts-dealers/parts-dealers.service';
import { Brand } from '../taxonomy/brand.entity';
import { BikeModel } from '../taxonomy/bike-model.entity';
import { User } from '../users/user.entity';
import { PartFavourite } from './part-favourite.entity';
import { PartListingEngagementEvent } from './part-listing-engagement-event.entity';
import { PartListingFitment } from './part-listing-fitment.entity';
import { PartListingImage } from './part-listing-image.entity';
import { PartListingInquiry } from './part-listing-inquiry.entity';
import { PartListing } from './part-listing.entity';

@Injectable()
export class PartListingsService {
  constructor(
    @InjectRepository(PartListing)
    private readonly partListings: Repository<PartListing>,
    @InjectRepository(PartListingFitment)
    private readonly fitments: Repository<PartListingFitment>,
    @InjectRepository(PartListingInquiry)
    private readonly inquiries: Repository<PartListingInquiry>,
    @InjectRepository(PartListingImage)
    private readonly listingImages: Repository<PartListingImage>,
    @InjectRepository(PartListingEngagementEvent)
    private readonly engagementEvents: Repository<PartListingEngagementEvent>,
    @InjectRepository(PartFavourite)
    private readonly favourites: Repository<PartFavourite>,
    @InjectRepository(Listing)
    private readonly bikeListings: Repository<Listing>,
    @InjectRepository(Brand) private readonly brands: Repository<Brand>,
    @InjectRepository(BikeModel) private readonly models: Repository<BikeModel>,
    private readonly partsDealersService: PartsDealersService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
  ) {}

  async create(owner: User, input: CreatePartListingInput): Promise<any> {
    if (!owner.roles?.some((r) => r.name === 'parts_dealer')) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only approved parts dealers can create part listings',
        },
      });
    }
    const dealer = await this.partsDealersService.findActiveOwned(owner.id);
    if (!dealer) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PARTS_DEALER_NOT_ACTIVE',
          message: 'Parts dealer must be approved before creating listings',
        },
      });
    }

    await this.validateFitments(input.fitments);
    const slug = await this.allocateSlug(input.title);
    const listing = this.partListings.create({
      partsDealerId: dealer.id,
      kind: input.kind,
      categoryId: input.categoryId,
      districtId: input.districtId,
      cityId: input.cityId,
      title: input.title,
      slug,
      description: input.description,
      priceLkr: input.priceLkr,
      negotiable: input.negotiable ?? true,
      condition: input.condition,
      phone: input.phone,
      whatsapp: input.whatsapp ?? null,
      status: 'draft',
    });
    const saved = await this.partListings.save(listing);
    await this.replaceFitments(saved.id, input.fitments);
    return this.getOwnedDetail(owner.id, saved.id);
  }

  async update(
    owner: User,
    id: string,
    input: UpdatePartListingInput,
  ): Promise<any> {
    const listing = await this.getOwned(owner.id, id);
    const { fitments, ...fields } = input;
    if (fitments) await this.validateFitments(fitments);

    if (!['draft', 'rejected', 'paused', 'pending_review'].includes(listing.status)) {
      if (listing.status === 'active') {
        const keys = (Object.keys(fields) as (keyof typeof fields)[]).filter(
          (k) => fields[k] !== undefined,
        );
        const fitmentsChanged = fitments !== undefined;
        if (keys.length === 0 && !fitmentsChanged) {
          return this.getOwnedDetail(owner.id, listing.id);
        }
        const priceOnly =
          !fitmentsChanged &&
          keys.every((k) => k === 'priceLkr' || k === 'negotiable');
        if (priceOnly && fields.priceLkr != null) {
          listing.priceLkr = fields.priceLkr;
          if (fields.negotiable != null) listing.negotiable = fields.negotiable;
          await this.partListings.save(listing);
          return this.getOwnedDetail(owner.id, listing.id);
        }
        Object.assign(listing, fields);
        listing.status = 'pending_review';
        listing.publishedAt = null;
        listing.rejectionReason = null;
        await this.partListings.save(listing);
        if (fitments) await this.replaceFitments(listing.id, fitments);
        this.bumpDashboard();
        void this.notifications.partListingPendingReview({
          id: listing.id,
          title: listing.title,
          slug: listing.slug,
          kind: listing.kind,
        });
        return this.getOwnedDetail(owner.id, listing.id);
      }
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot edit listing in status ${listing.status}`,
        },
      });
    }

    Object.assign(listing, fields);
    if (listing.status === 'rejected') {
      listing.status = 'draft';
      listing.rejectionReason = null;
    }
    await this.partListings.save(listing);
    if (fitments) await this.replaceFitments(listing.id, fitments);
    return this.getOwnedDetail(owner.id, listing.id);
  }

  async submit(owner: User, id: string): Promise<any> {
    const listing = await this.getOwned(owner.id, id);
    if (!['draft', 'rejected'].includes(listing.status)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Only draft or rejected listings can be submitted',
        },
      });
    }
    listing.status = 'pending_review';
    listing.rejectionReason = null;
    const saved = await this.partListings.save(listing);
    this.bumpDashboard();
    void this.notifications.partListingPendingReview({
      id: saved.id,
      title: saved.title,
      slug: saved.slug,
      kind: saved.kind,
    });
    return this.getOwnedDetail(owner.id, saved.id);
  }

  async pause(owner: User, id: string): Promise<any> {
    const listing = await this.getOwned(owner.id, id);
    if (listing.status !== 'active') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Only active listings can be paused',
        },
      });
    }
    listing.status = 'paused';
    await this.partListings.save(listing);
    this.bumpDashboard();
    return this.getOwnedDetail(owner.id, listing.id);
  }

  async resume(owner: User, id: string): Promise<any> {
    const listing = await this.getOwned(owner.id, id);
    if (listing.status !== 'paused') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Only paused listings can be resumed',
        },
      });
    }
    listing.status = 'active';
    if (!listing.publishedAt) listing.publishedAt = new Date();
    await this.partListings.save(listing);
    this.bumpDashboard();
    return this.getOwnedDetail(owner.id, listing.id);
  }

  async markSold(
    owner: User,
    id: string,
    input: MarkSoldInput,
  ): Promise<any> {
    const listing = await this.getOwned(owner.id, id);
    if (!['active', 'paused'].includes(listing.status)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Cannot mark sold from this status',
        },
      });
    }
    listing.status = 'sold';
    listing.soldPriceLkr = input.soldPriceLkr;
    listing.soldAt = input.soldAt
      ? new Date(`${input.soldAt}T12:00:00.000Z`)
      : new Date();
    await this.partListings.save(listing);
    this.bumpDashboard();
    return this.getOwnedDetail(owner.id, listing.id);
  }

  async listMine(
    ownerUserId: string,
    paging?: { page?: string | number; limit?: string | number },
  ) {
    const dealer = await this.partsDealersService.findActiveOwned(ownerUserId);
    if (!dealer) {
      return {
        items: [],
        meta: paginationMeta(0, 1, 20),
      };
    }
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const [rows, total] = await this.partListings.findAndCount({
      where: { partsDealerId: dealer.id },
      relations: ['category', 'district', 'city', 'partsDealer', 'fitments'],
      order: { updatedAt: 'DESC' },
      skip,
      take: limit,
    });
    const covers = await this.coverUrlsByListingId(rows.map((row) => row.id));
    const verified = Boolean(dealer.verifiedAt);
    const favCounts = await this.favouriteCounts(rows.map((row) => row.id));
    return {
      items: rows.map((row) => ({
        ...this.toBrowseCard(row, covers.get(row.id) ?? null, verified),
        status: row.status,
        phoneClickCount: row.phoneClickCount ?? 0,
        whatsappClickCount: row.whatsappClickCount ?? 0,
        favouriteCount: favCounts.get(row.id) ?? 0,
        soldPriceLkr: row.soldPriceLkr,
        soldAt: row.soldAt?.toISOString() ?? null,
      })),
      meta: paginationMeta(total, page, limit),
    };
  }

  async listPublic(filters: {
    kind?: PartListingKind | string;
    q?: string;
    categoryId?: string;
    brandId?: string;
    modelId?: string;
    districtId?: string;
    cityId?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    sort?: string;
    partsDealerId?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip } = parsePageLimit({
      page: filters.page,
      limit: filters.limit,
      defaultLimit: 50,
      maxLimit: 50,
    });
    const qb = this.partListings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.category', 'category')
      .leftJoinAndSelect('l.district', 'district')
      .leftJoinAndSelect('l.city', 'city')
      .leftJoinAndSelect('l.partsDealer', 'partsDealer')
      .leftJoinAndSelect('l.fitments', 'fitments')
      .leftJoinAndSelect('fitments.brand', 'fitBrand')
      .leftJoinAndSelect('fitments.model', 'fitModel')
      .where('l.status = :status', { status: 'active' });

    if (filters.kind) {
      qb.andWhere('l.kind = :kind', { kind: filters.kind });
    }
    if (filters.categoryId) {
      qb.andWhere('l.category_id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }
    if (filters.districtId) {
      qb.andWhere('l.district_id = :districtId', {
        districtId: filters.districtId,
      });
    }
    if (filters.cityId) {
      qb.andWhere('l.city_id = :cityId', { cityId: filters.cityId });
    }
    if (filters.partsDealerId) {
      qb.andWhere('l.parts_dealer_id = :partsDealerId', {
        partsDealerId: filters.partsDealerId,
      });
    }
    if (filters.minPrice != null) {
      qb.andWhere('l.price_lkr >= :minPrice', { minPrice: filters.minPrice });
    }
    if (filters.maxPrice != null) {
      qb.andWhere('l.price_lkr <= :maxPrice', { maxPrice: filters.maxPrice });
    }
    if (filters.condition) {
      qb.andWhere('l.condition = :condition', { condition: filters.condition });
    }
    if (filters.brandId || filters.modelId) {
      qb.innerJoin('l.fitments', 'fFilter');
      if (filters.brandId) {
        qb.andWhere('fFilter.brand_id = :brandId', {
          brandId: filters.brandId,
        });
      }
      if (filters.modelId) {
        qb.andWhere(
          '(fFilter.model_id = :modelId OR fFilter.model_id IS NULL)',
          { modelId: filters.modelId },
        );
      }
      qb.distinct(true);
    }
    if (filters.q?.trim()) {
      const tokens = searchTokens(filters.q);
      for (let i = 0; i < tokens.length; i++) {
        const key = `q${i}`;
        qb.andWhere(`l.title ILIKE :${key} ESCAPE '\\'`, {
          [key]: `%${escapeLikePattern(tokens[i])}%`,
        });
      }
    }

    switch (filters.sort) {
      case 'oldest':
        qb.orderBy('l.publishedAt', 'ASC', 'NULLS LAST');
        break;
      case 'price_asc':
        qb.orderBy('l.priceLkr', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('l.priceLkr', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('l.publishedAt', 'DESC', 'NULLS LAST');
        break;
    }

    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const covers = await this.coverUrlsByListingId(rows.map((row) => row.id));
    const verifiedIds = await this.partsDealersService.activeVerifiedIds(
      rows.map((row) => row.partsDealerId),
    );
    return {
      items: rows.map((row) =>
        this.toBrowseCard(
          row,
          covers.get(row.id) ?? null,
          verifiedIds.has(row.partsDealerId),
        ),
      ),
      meta: paginationMeta(total, page, limit),
    };
  }

  async getPublicBySlug(
    slug: string,
    viewer?: User | null,
    kind?: PartListingKind,
  ) {
    const data = await this.getPublicByIdOrSlug(slug, viewer);
    if (kind && (data as { kind?: string }).kind !== kind) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }
    return data;
  }

  async getPublicByIdOrSlug(idOrSlug: string, viewer?: User | null) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const listing = await this.partListings.findOne({
      where: isUuid
        ? [{ id: idOrSlug }, { slug: idOrSlug }]
        : { slug: idOrSlug },
      relations: [
        'images',
        'category',
        'district',
        'city',
        'partsDealer',
        'fitments',
        'fitments.brand',
        'fitments.model',
      ],
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }

    const dealer = listing.partsDealer;
    const isOwner = viewer?.id && dealer?.ownerUserId === viewer.id;
    const isAdmin = viewer?.roles?.some((r) => r.name === 'admin');
    if (listing.status !== 'active' && !isOwner && !isAdmin) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }

    const images = [...(listing.images ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const cover = images[0] ?? null;
    const payload = {
      ...listing,
      images,
      coverImageUrl: cover?.imageUrl ?? null,
      categoryName: listing.category?.name ?? null,
      districtName: listing.district?.name ?? null,
      cityName: listing.city?.name ?? null,
      listedAt:
        (listing.publishedAt ?? listing.createdAt)?.toISOString?.() ?? null,
      dealerVerified: Boolean(dealer?.verifiedAt),
      partsDealer: dealer
        ? {
            id: dealer.id,
            name: dealer.name,
            slug: dealer.slug,
            verifiedAt: dealer.verifiedAt,
          }
        : null,
      fitments: (listing.fitments ?? []).map((f) => ({
        id: f.id,
        brandId: f.brandId,
        modelId: f.modelId,
        brandName: f.brand?.name ?? null,
        modelName: f.model?.name ?? null,
      })),
    };

    if (!isOwner && !isAdmin) {
      const {
        phoneClickCount: _p,
        whatsappClickCount: _w,
        soldPriceLkr: _s,
        ...safe
      } = payload;
      return safe;
    }

    const favCounts = await this.favouriteCounts([listing.id]);
    return {
      ...payload,
      favouriteCount: favCounts.get(listing.id) ?? 0,
    };
  }

  async contact(id: string, input: ContactListingInput) {
    const listing = await this.partListings.findOne({
      where: { id, status: 'active' as ListingStatus },
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }
    const inquiry = this.inquiries.create({
      partListingId: listing.id,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      buyerEmail: input.buyerEmail ?? null,
      message: input.message,
    });
    return this.inquiries.save(inquiry);
  }

  async recordView(idOrSlug: string, viewer?: User | null) {
    const listing = await this.findActiveForEngagement(idOrSlug);
    if (!listing) return { recorded: false as const };
    if (viewer?.id && viewer.id === listing.ownerUserId) {
      return { recorded: false as const };
    }
    await this.partListings.increment({ id: listing.id }, 'viewCount', 1);
    await this.engagementEvents.save(
      this.engagementEvents.create({
        partListingId: listing.id,
        type: 'view',
      }),
    );
    return { recorded: true as const };
  }

  async recordContactClick(
    idOrSlug: string,
    type: 'phone' | 'whatsapp',
    viewer?: User | null,
  ) {
    const listing = await this.findActiveForEngagement(idOrSlug);
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }
    if (viewer?.id && viewer.id === listing.ownerUserId) {
      return { recorded: false as const };
    }
    const column = type === 'phone' ? 'phoneClickCount' : 'whatsappClickCount';
    await this.partListings.increment({ id: listing.id }, column, 1);
    await this.engagementEvents.save(
      this.engagementEvents.create({
        partListingId: listing.id,
        type,
      }),
    );
    return { recorded: true as const };
  }

  async relatedForBikeListing(
    listingId: string,
    opts?: { kind?: PartListingKind | string; limit?: number },
  ) {
    const bike = await this.bikeListings.findOne({
      where: { id: listingId },
      select: ['id', 'brandId', 'modelId'],
    });
    if (!bike) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    const limit = Math.min(Math.max(opts?.limit ?? 12, 1), 50);
    const qb = this.partListings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.category', 'category')
      .leftJoinAndSelect('l.district', 'district')
      .leftJoinAndSelect('l.city', 'city')
      .leftJoinAndSelect('l.partsDealer', 'partsDealer')
      .innerJoin('l.fitments', 'f')
      .where('l.status = :status', { status: 'active' })
      .andWhere('f.brand_id = :brandId', { brandId: bike.brandId })
      .andWhere('(f.model_id = :modelId OR f.model_id IS NULL)', {
        modelId: bike.modelId,
      })
      .orderBy('l.publishedAt', 'DESC', 'NULLS LAST')
      .take(limit)
      .distinct(true);

    if (opts?.kind) {
      qb.andWhere('l.kind = :kind', { kind: opts.kind });
    }

    const rows = await qb.getMany();
    const covers = await this.coverUrlsByListingId(rows.map((row) => row.id));
    const verifiedIds = await this.partsDealersService.activeVerifiedIds(
      rows.map((row) => row.partsDealerId),
    );
    return rows.map((row) =>
      this.toBrowseCard(
        row,
        covers.get(row.id) ?? null,
        verifiedIds.has(row.partsDealerId),
      ),
    );
  }

  async listSeoSlugs(
    kind?: PartListingKind | string,
    paging?: { page?: string | number; limit?: string | number },
  ) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 50,
      maxLimit: 100,
    });
    const where: { status: ListingStatus; kind?: PartListingKind } = {
      status: 'active',
    };
    if (kind === 'spare' || kind === 'modified') {
      where.kind = kind;
    }
    const [rows, total] = await this.partListings.findAndCount({
      where,
      select: ['id', 'slug', 'kind', 'updatedAt'],
      order: { updatedAt: 'DESC' },
      skip,
      take: limit,
    });
    return {
      items: rows.map((row) => ({
        slug: row.slug,
        kind: row.kind,
        updatedAt: row.updatedAt?.toISOString?.() ?? null,
      })),
      meta: paginationMeta(total, page, limit),
    };
  }

  async listAllAdmin(filters?: {
    status?: string;
    kind?: string;
    q?: string;
    partsDealerId?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip } = parsePageLimit({
      page: filters?.page,
      limit: filters?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const qb = this.partListings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.partsDealer', 'partsDealer')
      .leftJoinAndSelect('l.category', 'category')
      .leftJoinAndSelect('l.district', 'district')
      .leftJoinAndSelect('l.city', 'city')
      .orderBy('l.updatedAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('l.status = :status', { status: filters.status });
    }
    if (filters?.kind) {
      qb.andWhere('l.kind = :kind', { kind: filters.kind });
    }
    if (filters?.partsDealerId) {
      qb.andWhere('l.partsDealerId = :partsDealerId', {
        partsDealerId: filters.partsDealerId,
      });
    }
    if (filters?.q?.trim()) {
      const q = `%${filters.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(l.title) LIKE :q OR LOWER(l.slug) LIKE :q OR LOWER(partsDealer.name) LIKE :q)',
        { q },
      );
    }

    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const covers = await this.coverUrlsByListingId(rows.map((row) => row.id));
    return {
      items: rows.map((row) => ({
        ...row,
        images: [],
        coverImageUrl: covers.get(row.id) ?? null,
      })),
      meta: paginationMeta(total, page, limit),
    };
  }

  async adminGet(id: string) {
    const listing = await this.partListings.findOne({
      where: { id },
      relations: [
        'partsDealer',
        'category',
        'district',
        'city',
        'fitments',
        'images',
      ],
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }
    const covers = await this.coverUrlsByListingId([listing.id]);
    return {
      ...listing,
      coverImageUrl: covers.get(listing.id) ?? null,
    };
  }

  async adminCreate(input: AdminCreatePartListingInput) {
    await this.partsDealersService.adminGet(input.partsDealerId);
    await this.validateFitments(input.fitments);
    const slug = await this.allocateSlug(input.title);
    const status = input.status ?? 'draft';
    const listing = this.partListings.create({
      partsDealerId: input.partsDealerId,
      kind: input.kind,
      categoryId: input.categoryId,
      districtId: input.districtId,
      cityId: input.cityId,
      title: input.title,
      slug,
      description: input.description,
      priceLkr: input.priceLkr,
      negotiable: input.negotiable ?? true,
      condition: input.condition,
      phone: input.phone,
      whatsapp: input.whatsapp ?? null,
      status,
      publishedAt: status === 'active' ? new Date() : null,
    });
    const saved = await this.partListings.save(listing);
    await this.replaceFitments(saved.id, input.fitments);
    this.bumpDashboard();
    if (status === 'pending_review') {
      void this.notifications.partListingPendingReview({
        id: saved.id,
        title: saved.title,
        slug: saved.slug,
        kind: saved.kind,
      });
    }
    return this.adminGet(saved.id);
  }

  async adminUpdate(id: string, input: AdminUpdatePartListingInput) {
    const listing = await this.getById(id);
    const { fitments, status, partsDealerId, ...fields } = input;
    if (fitments) {
      await this.validateFitments(fitments);
      await this.replaceFitments(listing.id, fitments);
    }
    if (partsDealerId) {
      await this.partsDealersService.adminGet(partsDealerId);
      listing.partsDealerId = partsDealerId;
    }
    Object.assign(listing, fields);
    if (status) {
      listing.status = status;
      if (status === 'active' && !listing.publishedAt) {
        listing.publishedAt = new Date();
      }
      if (status === 'sold' && !listing.soldAt) {
        listing.soldAt = new Date();
      }
      if (status !== 'rejected') {
        listing.rejectionReason = null;
      }
    }
    await this.partListings.save(listing);
    this.bumpDashboard();
    return this.adminGet(id);
  }

  async adminDelete(id: string): Promise<{ id: string; deleted: true }> {
    const listing = await this.getById(id);
    await this.partListings.softRemove(listing);
    this.bumpDashboard();
    return { id, deleted: true };
  }

  async listPending(paging?: {
    page?: string | number;
    limit?: string | number;
    q?: string;
  }) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const qb = this.partListings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.partsDealer', 'partsDealer')
      .where('l.status = :status', { status: 'pending_review' })
      .orderBy('l.updatedAt', 'ASC');
    if (paging?.q?.trim()) {
      const q = `%${paging.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(l.title) LIKE :q OR LOWER(partsDealer.name) LIKE :q)',
        { q },
      );
    }
    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const covers = await this.coverUrlsByListingId(rows.map((row) => row.id));
    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        kind: row.kind,
        priceLkr: row.priceLkr,
        updatedAt: row.updatedAt,
        coverImageUrl: covers.get(row.id) ?? null,
        partsDealer: row.partsDealer
          ? {
              id: row.partsDealer.id,
              name: row.partsDealer.name,
              slug: row.partsDealer.slug,
            }
          : null,
      })),
      meta: paginationMeta(total, page, limit),
    };
  }

  async approve(id: string): Promise<any> {
    const listing = await this.getById(id);
    if (listing.status !== 'pending_review') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Listing is not pending review',
        },
      });
    }
    listing.status = 'active';
    listing.publishedAt = new Date();
    listing.rejectionReason = null;
    const saved = await this.partListings.save(listing);
    this.bumpDashboard();
    const dealer = await this.partsDealersService.adminGet(saved.partsDealerId);
    void this.notifications.partListingApproved(dealer.ownerUserId, {
      id: saved.id,
      title: saved.title,
      slug: saved.slug,
      kind: saved.kind,
    });
    return saved;
  }

  async reject(id: string, reason: string): Promise<any> {
    const listing = await this.getById(id);
    if (listing.status !== 'pending_review') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Listing is not pending review',
        },
      });
    }
    listing.status = 'rejected';
    listing.rejectionReason = reason;
    const saved = await this.partListings.save(listing);
    this.bumpDashboard();
    const dealer = await this.partsDealersService.adminGet(saved.partsDealerId);
    void this.notifications.partListingRejected(
      dealer.ownerUserId,
      {
        id: saved.id,
        title: saved.title,
        slug: saved.slug,
        kind: saved.kind,
      },
      reason,
    );
    return saved;
  }

  async browseCardsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.partListings.find({
      where: { id: In(ids), status: 'active' as ListingStatus },
      relations: ['category', 'district', 'city', 'partsDealer', 'fitments'],
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const covers = await this.coverUrlsByListingId(ids);
    const verifiedIds = await this.partsDealersService.activeVerifiedIds(
      rows.map((row) => row.partsDealerId),
    );
    return ids
      .map((id) => byId.get(id))
      .filter((row): row is PartListing => Boolean(row))
      .map((row) =>
        this.toBrowseCard(
          row,
          covers.get(row.id) ?? null,
          verifiedIds.has(row.partsDealerId),
        ),
      );
  }

  private toBrowseCard(
    listing: PartListing,
    coverImageUrl: string | null,
    dealerVerified: boolean,
  ) {
    const fitments = (listing.fitments ?? []).map((f) => ({
      brandId: f.brandId,
      modelId: f.modelId,
      brandName: f.brand?.name ?? null,
      modelName: f.model?.name ?? null,
    }));
    return {
      id: listing.id,
      slug: listing.slug,
      kind: listing.kind,
      title: listing.title,
      priceLkr: listing.priceLkr,
      negotiable: listing.negotiable,
      condition: listing.condition,
      categoryId: listing.categoryId,
      categoryName: listing.category?.name ?? null,
      districtId: listing.districtId,
      districtName: listing.district?.name ?? null,
      cityId: listing.cityId,
      cityName: listing.city?.name ?? null,
      partsDealerId: listing.partsDealerId,
      partsDealerName: listing.partsDealer?.name ?? null,
      partsDealerSlug: listing.partsDealer?.slug ?? null,
      dealerVerified,
      coverImageUrl,
      fitmentsSummary: fitments.slice(0, 5),
      listedAt:
        (listing.publishedAt ?? listing.createdAt)?.toISOString() ?? null,
      viewCount: listing.viewCount ?? 0,
    };
  }

  private async coverUrlsByListingId(ids: string[]) {
    const map = new Map<string, string>();
    if (ids.length === 0) return map;
    const images = await this.listingImages
      .createQueryBuilder('img')
      .select([
        'img.partListingId',
        'img.imageUrl',
        'img.sortOrder',
        'img.isCover',
      ])
      .where('img.partListingId IN (:...ids)', { ids })
      .orderBy('img.isCover', 'DESC')
      .addOrderBy('img.sortOrder', 'ASC')
      .getMany();
    for (const img of images) {
      if (!map.has(img.partListingId)) map.set(img.partListingId, img.imageUrl);
    }
    return map;
  }

  private async favouriteCounts(ids: string[]) {
    const map = new Map<string, number>();
    if (ids.length === 0) return map;
    const rows = await this.favourites
      .createQueryBuilder('f')
      .select('f.part_listing_id', 'partListingId')
      .addSelect('COUNT(*)', 'count')
      .where('f.part_listing_id IN (:...ids)', { ids })
      .groupBy('f.part_listing_id')
      .getRawMany<{ partListingId: string; count: string }>();
    for (const row of rows) {
      map.set(row.partListingId, Number(row.count));
    }
    return map;
  }

  private async validateFitments(
    fitments: { brandId: string; modelId?: string | null }[],
  ) {
    const brandIds = [...new Set(fitments.map((f) => f.brandId))];
    const brands = await this.brands.find({ where: { id: In(brandIds) } });
    if (brands.length !== brandIds.length) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_BRAND',
          message: 'One or more brands not found',
        },
      });
    }
    const modelIds = [
      ...new Set(
        fitments
          .map((f) => f.modelId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (modelIds.length === 0) return;
    const models = await this.models.find({ where: { id: In(modelIds) } });
    if (models.length !== modelIds.length) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_MODEL',
          message: 'One or more models not found',
        },
      });
    }
    const byId = new Map(models.map((m) => [m.id, m]));
    for (const f of fitments) {
      if (!f.modelId) continue;
      const model = byId.get(f.modelId);
      if (!model || model.brandId !== f.brandId) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'INVALID_FITMENT',
            message: 'Model does not belong to the selected brand',
          },
        });
      }
    }
  }

  private async replaceFitments(
    partListingId: string,
    fitments: { brandId: string; modelId?: string | null }[],
  ) {
    await this.fitments.delete({ partListingId });
    if (fitments.length === 0) return;
    const rows = fitments.map((f) =>
      this.fitments.create({
        partListingId,
        brandId: f.brandId,
        modelId: f.modelId ?? null,
      }),
    );
    await this.fitments.save(rows);
  }

  private async allocateSlug(title: string) {
    const base = slugify(title) || 'part';
    const candidate = `${base}-${Date.now().toString(36)}`;
    return candidate;
  }

  private async findActiveForEngagement(idOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const listing = await this.partListings.findOne({
      where: isUuid
        ? [{ id: idOrSlug }, { slug: idOrSlug }]
        : { slug: idOrSlug },
      relations: ['partsDealer'],
    });
    if (!listing || listing.status !== 'active') return null;
    return {
      id: listing.id,
      ownerUserId: listing.partsDealer?.ownerUserId ?? null,
    };
  }

  private async getOwnedDetail(ownerUserId: string, id: string) {
    await this.getOwned(ownerUserId, id);
    return this.getPublicByIdOrSlug(id, { id: ownerUserId } as User);
  }

  private async getOwned(ownerUserId: string, id: string): Promise<any> {
    const listing = await this.getById(id);
    await this.partsDealersService.assertOwnedActivePartsDealer(
      ownerUserId,
      listing.partsDealerId,
    );
    return listing;
  }

  private async getById(id: string): Promise<any> {
    const listing = await this.partListings.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }
    return listing;
  }

  private bumpDashboard() {
    void this.cache.invalidateDashboard();
  }
}
