import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  ContactListingInput,
  CreateListingInput,
  MarkSoldInput,
  UpdateListingInput,
} from '@throttlelk/validation';
import type { ListingStatus } from '@throttlelk/types';
import { Repository } from 'typeorm';
import { CacheService } from '../common/cache.service';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { slugify } from '../common/slugify';
import { composeListingTitle } from '../common/listing-title';
import { User } from '../users/user.entity';
import { DealersService } from '../dealers/dealers.service';
import { FavouritesService } from '../favourites/favourites.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { ListingEngagementEvent } from './listing-engagement-event.entity';
import { ListingImage } from './listing-image.entity';
import { ListingInquiry } from './listing-inquiry.entity';
import { Listing } from './listing.entity';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(ListingInquiry)
    private readonly inquiries: Repository<ListingInquiry>,
    @InjectRepository(ListingImage)
    private readonly listingImages: Repository<ListingImage>,
    @InjectRepository(ListingEngagementEvent)
    private readonly engagementEvents: Repository<ListingEngagementEvent>,
    private readonly dealersService: DealersService,
    private readonly notifications: NotificationsService,
    private readonly favourites: FavouritesService,
    private readonly usersService: UsersService,
    private readonly cache: CacheService,
  ) {}

  async create(seller: User, input: CreateListingInput): Promise<Listing> {
    const dealerId = await this.resolveListingDealerId(seller, input.dealerId);
    const baseSlug = slugify(input.title) || 'listing';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const listing = this.listings.create({
      sellerId: seller.id,
      dealerId,
      brandId: input.brandId,
      modelId: input.modelId,
      categoryId: input.categoryId,
      districtId: input.districtId,
      cityId: input.cityId,
      title: input.title,
      slug,
      description: input.description,
      priceLkr: input.priceLkr,
      negotiable: input.negotiable ?? true,
      manufactureYear: input.manufactureYear,
      registrationYear: input.registrationYear ?? null,
      engineCc: input.engineCc ?? null,
      mileage: input.mileage ?? null,
      fuelType: input.fuelType,
      transmission: input.transmission,
      condition: input.condition,
      colour: input.colour ?? null,
      phone: input.phone ?? seller.phone,
      whatsapp: input.whatsapp ?? null,
      status: 'draft',
      costPriceLkr: dealerId ? (input.costPriceLkr ?? null) : null,
      purchaseDate: dealerId ? (input.purchaseDate ?? null) : null,
    });
    return this.listings.save(listing);
  }

  async update(
    seller: User,
    id: string,
    input: UpdateListingInput,
  ): Promise<Listing> {
    const listing = await this.getOwned(seller.id, id);
    const { costPriceLkr, purchaseDate, ...listingFields } = input;
    if (listing.dealerId) {
      if (costPriceLkr !== undefined) listing.costPriceLkr = costPriceLkr ?? null;
      if (purchaseDate !== undefined) listing.purchaseDate = purchaseDate ?? null;
    }
    if (!['draft', 'rejected', 'paused', 'pending_review'].includes(listing.status)) {
      if (listing.status === 'active') {
        const keys = (
          Object.keys(listingFields) as (keyof typeof listingFields)[]
        ).filter((k) => listingFields[k] !== undefined);
        if (keys.length === 0) {
          return this.listings.save(listing);
        }
        const priceOnly = keys.every(
          (k) => k === 'priceLkr' || k === 'negotiable',
        );
        if (priceOnly && listingFields.priceLkr != null) {
          const oldPrice = listing.priceLkr;
          listing.priceLkr = listingFields.priceLkr;
          if (listingFields.negotiable != null) {
            listing.negotiable = listingFields.negotiable;
          }
          const saved = await this.listings.save(listing);
          if (listingFields.priceLkr < oldPrice) {
            void this.notifyFavouritesPriceDrop(
              saved,
              oldPrice,
              listingFields.priceLkr,
            );
          }
          return saved;
        }
        Object.assign(listing, listingFields);
        listing.status = 'pending_review';
        listing.publishedAt = null;
        listing.rejectionReason = null;
        const saved = await this.listings.save(listing);
        this.bumpDashboard();
        void this.notifications.listingPendingReview({
          id: saved.id,
          title: saved.title,
          slug: saved.slug,
        });
        return saved;
      }
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot edit listing in status ${listing.status}`,
        },
      });
    }
    Object.assign(listing, listingFields);
    if (listing.status === 'rejected') {
      listing.status = 'draft';
      listing.rejectionReason = null;
    }
    return this.listings.save(listing);
  }

  async submit(seller: User, id: string): Promise<Listing> {
    const listing = await this.getOwned(seller.id, id);
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
    const saved = await this.listings.save(listing);
    this.bumpDashboard();
    void this.notifications.listingPendingReview({
      id: saved.id,
      title: saved.title,
      slug: saved.slug,
    });
    return saved;
  }

  async pause(seller: User, id: string): Promise<Listing> {
    const listing = await this.getOwned(seller.id, id);
    if (listing.status !== 'active') {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Only active listings can be paused' },
      });
    }
    listing.status = 'paused';
    const saved = await this.listings.save(listing);
    this.bumpDashboard();
    return saved;
  }

  async resume(seller: User, id: string): Promise<Listing> {
    const listing = await this.getOwned(seller.id, id);
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
    const saved = await this.listings.save(listing);
    this.bumpDashboard();
    return saved;
  }

  async markSold(
    seller: User,
    id: string,
    input: MarkSoldInput,
  ): Promise<Listing> {
    const listing = await this.getOwned(seller.id, id);
    if (!['active', 'paused'].includes(listing.status)) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Cannot mark sold from this status' },
      });
    }
    listing.status = 'sold';
    listing.soldPriceLkr = input.soldPriceLkr;
    listing.soldAt = input.soldAt
      ? new Date(`${input.soldAt}T12:00:00.000Z`)
      : new Date();
    const saved = await this.listings.save(listing);
    this.bumpDashboard();
    return saved;
  }

  async listMine(
    sellerId: string,
    paging?: { page?: string | number; limit?: string | number },
  ) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const [rows, total] = await this.listings.findAndCount({
      where: { sellerId },
      relations: ['brand', 'model', 'district', 'city'],
      order: { updatedAt: 'DESC' },
      skip,
      take: limit,
    });
    const covers = await this.coverUrlsByListingId(rows.map((row) => row.id));
    const verifiedIds = await this.dealersService.activeVerifiedIds(
      rows.map((row) => row.dealerId).filter((id): id is string => Boolean(id)),
    );
    const favCounts = await this.favourites.countsByListingIds(
      rows.map((row) => row.id),
    );
    return {
      items: rows.map((row) => ({
        ...this.toBrowseCard(row, covers.get(row.id) ?? null, {
          dealerVerified: row.dealerId
            ? verifiedIds.has(row.dealerId)
            : false,
        }),
        status: row.status,
        ...this.ownerInventoryFields(row, favCounts.get(row.id) ?? 0),
      })),
      meta: paginationMeta(total, page, limit),
    };
  }

  async createInquiry(listingId: string, input: ContactListingInput) {
    const listing = await this.listings.findOne({
      where: { id: listingId, status: 'active' as ListingStatus },
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    const inquiry = this.inquiries.create({
      listingId: listing.id,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      buyerEmail: input.buyerEmail ?? null,
      message: input.message,
    });
    return this.inquiries.save(inquiry);
  }

  async listPublic(filters: {
    brandId?: string;
    modelId?: string;
    categoryId?: string;
    districtId?: string;
    dealerId?: string;
    sellerId?: string;
    minPrice?: number;
    maxPrice?: number;
    minYear?: number;
    maxYear?: number;
    condition?: string;
    q?: string;
    sort?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip } = parsePageLimit({
      page: filters.page,
      limit: filters.limit,
      defaultLimit: 50,
      maxLimit: 50,
    });
    const qb = this.listings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.brand', 'brand')
      .leftJoinAndSelect('l.model', 'model')
      .leftJoinAndSelect('l.district', 'district')
      .leftJoinAndSelect('l.city', 'city')
      .where('l.status = :status', { status: 'active' });

    if (filters.brandId) qb.andWhere('l.brand_id = :brandId', { brandId: filters.brandId });
    if (filters.modelId) qb.andWhere('l.model_id = :modelId', { modelId: filters.modelId });
    if (filters.categoryId) {
      qb.andWhere('l.category_id = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters.districtId) {
      qb.andWhere('l.district_id = :districtId', { districtId: filters.districtId });
    }
    if (filters.dealerId) {
      const dealer = await this.dealersService.findActiveById(filters.dealerId);
      if (dealer) {
        await this.dealersService.attachOrphanListings(dealer);
      }
      qb.andWhere('l.dealer_id = :dealerId', { dealerId: filters.dealerId });
    }
    if (filters.sellerId) {
      qb.andWhere('l.seller_id = :sellerId', { sellerId: filters.sellerId });
    }
    if (filters.minPrice != null) {
      qb.andWhere('l.price_lkr >= :minPrice', { minPrice: filters.minPrice });
    }
    if (filters.maxPrice != null) {
      qb.andWhere('l.price_lkr <= :maxPrice', { maxPrice: filters.maxPrice });
    }
    if (filters.minYear != null) {
      qb.andWhere('l.manufacture_year >= :minYear', { minYear: filters.minYear });
    }
    if (filters.maxYear != null) {
      qb.andWhere('l.manufacture_year <= :maxYear', { maxYear: filters.maxYear });
    }
    if (filters.condition) {
      qb.andWhere('l.condition = :condition', { condition: filters.condition });
    }
    if (filters.q?.trim()) {
      // Title-only: description ILIKE cannot use indexes and scans every active row.
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
      case 'mileage_asc':
        qb.orderBy('l.mileage', 'ASC', 'NULLS LAST');
        break;
      case 'mileage_desc':
        qb.orderBy('l.mileage', 'DESC', 'NULLS LAST');
        break;
      case 'year_asc':
        qb.orderBy('l.manufactureYear', 'ASC');
        break;
      case 'year_desc':
        qb.orderBy('l.manufactureYear', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('l.publishedAt', 'DESC', 'NULLS LAST');
        break;
    }

    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const covers = await this.coverUrlsByListingId(rows.map((row) => row.id));
    const verifiedIds = await this.dealersService.activeVerifiedIds(
      rows.map((row) => row.dealerId).filter((id): id is string => Boolean(id)),
    );
    return {
      items: rows.map((row) =>
        this.toBrowseCard(row, covers.get(row.id) ?? null, {
          dealerVerified: row.dealerId
            ? verifiedIds.has(row.dealerId)
            : false,
        }),
      ),
      meta: paginationMeta(total, page, limit),
    };
  }

  async getPublicOrOwned(idOrSlug: string, viewer?: User | null) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const listing = await this.listings.findOne({
      where: isUuid ? [{ id: idOrSlug }, { slug: idOrSlug }] : { slug: idOrSlug },
      relations: ['images', 'brand', 'model', 'category', 'district', 'city'],
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    const isOwner = viewer?.id === listing.sellerId;
    const isAdmin = viewer?.roles?.some((r) => r.name === 'admin');
    if (listing.status !== 'active' && !isOwner && !isAdmin) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }

    const sellerUser = await this.usersService
      .findByIdOrThrow(listing.sellerId)
      .catch(() => null);
    const shop = listing.dealerId
      ? await this.dealersService.findActiveById(listing.dealerId)
      : null;
    const sellerBase = sellerUser
      ? this.usersService.toSellerPublic(sellerUser)
      : null;
    const seller = sellerBase
      ? {
          ...sellerBase,
          displayName: shop?.name ?? sellerBase.displayName,
          dealerSlug: shop?.slug ?? null,
        }
      : null;
    const {
      costPriceLkr: _costPriceLkr,
      purchaseDate: _purchaseDate,
      soldPriceLkr: _soldPriceLkr,
      phoneClickCount: _phoneClickCount,
      whatsappClickCount: _whatsappClickCount,
      ...safeListing
    } = this.withCover(listing);

    // Phone / WhatsApp are public on active listings; messaging still requires auth.
    const payload = {
      ...safeListing,
      title: composeListingTitle({
        title: listing.title,
        brandName: listing.brand?.name,
        modelName: listing.model?.name,
        manufactureYear: listing.manufactureYear,
      }),
      brandName: listing.brand?.name ?? null,
      modelName: listing.model?.name ?? null,
      categoryName: listing.category?.name ?? null,
      districtName: listing.district?.name ?? null,
      cityName: listing.city?.name ?? null,
      listedAt:
        (listing.publishedAt ?? listing.createdAt)?.toISOString?.() ?? null,
      sellerType: listing.dealerId ? 'dealer' : 'private',
      dealerVerified: Boolean(shop?.verifiedAt),
      seller,
      contactHidden: false as const,
    };

    if (!isOwner && !isAdmin) {
      return payload;
    }

    const favCounts = await this.favourites.countsByListingIds([listing.id]);
    return {
      ...payload,
      ...this.ownerInventoryFields(listing, favCounts.get(listing.id) ?? 0),
    };
  }

  /** Count a public detail view (skips seller’s own views). */
  async recordView(idOrSlug: string, viewer?: User | null) {
    const listing = await this.findActiveListingForEngagement(idOrSlug);
    if (!listing) {
      return { recorded: false as const };
    }
    if (viewer?.id && viewer.id === listing.sellerId) {
      return { recorded: false as const };
    }
    await this.listings.increment({ id: listing.id }, 'viewCount', 1);
    await this.engagementEvents.save(
      this.engagementEvents.create({ listingId: listing.id, type: 'view' }),
    );
    return { recorded: true as const };
  }

  async recordContactClick(
    idOrSlug: string,
    type: 'phone' | 'whatsapp',
    viewer?: User | null,
  ) {
    const listing = await this.findActiveListingForEngagement(idOrSlug);
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    if (viewer?.id && viewer.id === listing.sellerId) {
      return { recorded: false as const };
    }
    const column = type === 'phone' ? 'phoneClickCount' : 'whatsappClickCount';
    await this.listings.increment({ id: listing.id }, column, 1);
    await this.engagementEvents.save(
      this.engagementEvents.create({ listingId: listing.id, type }),
    );
    return { recorded: true as const };
  }

  private async findActiveListingForEngagement(idOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const listing = await this.listings.findOne({
      where: isUuid ? [{ id: idOrSlug }, { slug: idOrSlug }] : { slug: idOrSlug },
      select: ['id', 'sellerId', 'status'],
    });
    if (!listing || listing.status !== 'active') {
      return null;
    }
    return listing;
  }

  private withCover(listing: Listing) {
    const images = [...(listing.images ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const cover = images[0] ?? null;
    return {
      ...listing,
      images,
      coverImageUrl: cover?.imageUrl ?? null,
    };
  }

  private ownerInventoryFields(listing: Listing, favouriteCount: number) {
    return {
      costPriceLkr: listing.costPriceLkr,
      purchaseDate: listing.purchaseDate,
      soldPriceLkr: listing.soldPriceLkr,
      soldAt: listing.soldAt?.toISOString() ?? null,
      phoneClickCount: listing.phoneClickCount ?? 0,
      whatsappClickCount: listing.whatsappClickCount ?? 0,
      favouriteCount,
      daysInStock: this.daysInStock(listing),
      ...this.marginFields(listing),
    };
  }

  private daysInStock(listing: Listing, asOf = new Date()): number {
    const start = listing.purchaseDate
      ? new Date(listing.purchaseDate)
      : listing.publishedAt ?? listing.createdAt;
    if (!start || Number.isNaN(new Date(start).getTime())) {
      return 0;
    }
    const end = listing.soldAt ?? asOf;
    return Math.max(
      0,
      Math.floor((end.getTime() - new Date(start).getTime()) / 86_400_000),
    );
  }

  private marginFields(listing: Listing): {
    marginLkr: number | null;
    marginPercent: number | null;
  } {
    if (listing.costPriceLkr == null) {
      return { marginLkr: null, marginPercent: null };
    }
    const sell =
      listing.soldPriceLkr != null ? listing.soldPriceLkr : listing.priceLkr;
    const marginLkr = sell - listing.costPriceLkr;
    const marginPercent =
      listing.costPriceLkr > 0
        ? Math.round((marginLkr / listing.costPriceLkr) * 1000) / 10
        : null;
    return { marginLkr, marginPercent };
  }

  /** Compact public card payload for browse grids. */
  private toBrowseCard(
    listing: Listing,
    coverImageUrl?: string | null,
    extras?: { dealerVerified?: boolean },
  ) {
    const covered =
      coverImageUrl !== undefined
        ? coverImageUrl
        : this.withCover(listing).coverImageUrl;
    return {
      id: listing.id,
      slug: listing.slug,
      title: composeListingTitle({
        title: listing.title,
        brandName: listing.brand?.name,
        modelName: listing.model?.name,
        manufactureYear: listing.manufactureYear,
      }),
      priceLkr: listing.priceLkr,
      manufactureYear: listing.manufactureYear,
      engineCc: listing.engineCc,
      mileage: listing.mileage,
      condition: listing.condition,
      districtId: listing.districtId,
      brandId: listing.brandId,
      modelId: listing.modelId,
      sellerId: listing.sellerId,
      brandName: listing.brand?.name ?? null,
      modelName: listing.model?.name ?? null,
      districtName: listing.district?.name ?? null,
      cityName: listing.city?.name ?? null,
      sellerType: listing.dealerId ? 'dealer' : 'private',
      dealerVerified: extras?.dealerVerified ?? false,
      coverImageUrl: covered,
      listedAt: (listing.publishedAt ?? listing.createdAt)?.toISOString() ?? null,
      viewCount: listing.viewCount ?? 0,
    };
  }

  private async coverUrlsByListingId(ids: string[]) {
    const map = new Map<string, string>();
    if (ids.length === 0) return map;
    const images = await this.listingImages
      .createQueryBuilder('img')
      .select(['img.listingId', 'img.imageUrl', 'img.sortOrder', 'img.isCover'])
      .where('img.listingId IN (:...ids)', { ids })
      .orderBy('img.isCover', 'DESC')
      .addOrderBy('img.sortOrder', 'ASC')
      .getMany();
    for (const img of images) {
      if (!map.has(img.listingId)) map.set(img.listingId, img.imageUrl);
    }
    return map;
  }

  private bumpDashboard() {
    void this.cache.invalidateDashboard();
  }

  async listSeoSlugs(paging?: {
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 50,
      maxLimit: 100,
    });
    const [rows, total] = await this.listings.findAndCount({
      where: { status: 'active' as ListingStatus },
      select: ['id', 'slug', 'sellerId', 'updatedAt'],
      order: { updatedAt: 'DESC' },
      skip,
      take: limit,
    });
    return {
      items: rows.map((row) => ({
        slug: row.slug,
        sellerId: row.sellerId,
        updatedAt: row.updatedAt?.toISOString?.() ?? null,
      })),
      meta: paginationMeta(total, page, limit),
    };
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
    const qb = this.listings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.seller', 'seller')
      .where('l.status = :status', { status: 'pending_review' })
      .orderBy('l.updatedAt', 'ASC');
    if (paging?.q?.trim()) {
      const q = `%${paging.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(l.title) LIKE :q OR LOWER(seller.firstName) LIKE :q OR LOWER(seller.lastName) LIKE :q OR LOWER(seller.email) LIKE :q)',
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
        priceLkr: row.priceLkr,
        manufactureYear: row.manufactureYear,
        updatedAt: row.updatedAt,
        coverImageUrl: covers.get(row.id) ?? null,
        seller: row.seller
          ? {
              id: row.seller.id,
              firstName: row.seller.firstName,
              lastName: row.seller.lastName,
            }
          : null,
      })),
      meta: paginationMeta(total, page, limit),
    };
  }

  async listAllAdmin(filters?: {
    status?: string;
    q?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const { page, limit, skip } = parsePageLimit({
      page: filters?.page,
      limit: filters?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const qb = this.listings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.brand', 'brand')
      .leftJoinAndSelect('l.model', 'model')
      .leftJoinAndSelect('l.district', 'district')
      .leftJoinAndSelect('l.city', 'city')
      .leftJoinAndSelect('l.seller', 'seller')
      .orderBy('l.updatedAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('l.status = :status', { status: filters.status });
    }
    if (filters?.q?.trim()) {
      const q = `%${filters.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(l.title) LIKE :q OR LOWER(l.slug) LIKE :q OR LOWER(seller.email) LIKE :q)',
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
    const listing = await this.listings.findOne({
      where: { id },
      relations: ['brand', 'model', 'district', 'city', 'seller', 'images', 'category'],
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    return this.withCover(listing);
  }

  async adminCreate(input: {
    sellerId: string;
    status?: ListingStatus;
  } & CreateListingInput): Promise<Listing> {
    const seller = await this.usersService.findByIdOrThrow(input.sellerId);
    const dealerId = await this.resolveListingDealerId(seller, input.dealerId);
    const baseSlug = slugify(input.title) || 'listing';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const status = (input.status ?? 'draft') as ListingStatus;
    const listing = this.listings.create({
      sellerId: seller.id,
      dealerId,
      brandId: input.brandId,
      modelId: input.modelId,
      categoryId: input.categoryId,
      districtId: input.districtId,
      cityId: input.cityId,
      title: input.title,
      slug,
      description: input.description,
      priceLkr: input.priceLkr,
      negotiable: input.negotiable ?? true,
      manufactureYear: input.manufactureYear,
      registrationYear: input.registrationYear ?? null,
      engineCc: input.engineCc ?? null,
      mileage: input.mileage ?? null,
      fuelType: input.fuelType,
      transmission: input.transmission,
      condition: input.condition,
      colour: input.colour ?? null,
      phone: input.phone ?? seller.phone,
      whatsapp: input.whatsapp ?? null,
      status,
      publishedAt: status === 'active' ? new Date() : null,
    });
    return this.listings.save(listing);
  }

  async adminUpdate(
    id: string,
    input: UpdateListingInput & {
      sellerId?: string;
      status?: ListingStatus;
    },
  ): Promise<Listing> {
    const listing = await this.getById(id);
    const {
      sellerId,
      status,
      dealerId,
      brandId,
      modelId,
      categoryId,
      districtId,
      cityId,
      title,
      description,
      priceLkr,
      negotiable,
      manufactureYear,
      registrationYear,
      engineCc,
      mileage,
      fuelType,
      transmission,
      condition,
      colour,
      phone,
      whatsapp,
    } = input;

    if (sellerId) listing.sellerId = sellerId;
    if (dealerId !== undefined) listing.dealerId = dealerId ?? null;
    if (brandId) listing.brandId = brandId;
    if (modelId) listing.modelId = modelId;
    if (categoryId) listing.categoryId = categoryId;
    if (districtId) listing.districtId = districtId;
    if (cityId) listing.cityId = cityId;
    if (title) listing.title = title;
    if (description) listing.description = description;
    if (priceLkr != null) listing.priceLkr = priceLkr;
    if (negotiable != null) listing.negotiable = negotiable;
    if (manufactureYear != null) listing.manufactureYear = manufactureYear;
    if (registrationYear !== undefined) {
      listing.registrationYear = registrationYear ?? null;
    }
    if (engineCc !== undefined) listing.engineCc = engineCc ?? null;
    if (mileage !== undefined) listing.mileage = mileage ?? null;
    if (fuelType) listing.fuelType = fuelType;
    if (transmission) listing.transmission = transmission;
    if (condition) listing.condition = condition;
    if (colour !== undefined) listing.colour = colour ?? null;
    if (phone !== undefined) listing.phone = phone ?? null;
    if (whatsapp !== undefined) listing.whatsapp = whatsapp ?? null;

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

    const saved = await this.listings.save(listing);
    this.bumpDashboard();
    return saved;
  }

  async adminDelete(id: string): Promise<{ id: string; deleted: true }> {
    const listing = await this.getById(id);
    await this.listings.softRemove(listing);
    this.bumpDashboard();
    return { id, deleted: true };
  }

  async approve(id: string): Promise<Listing> {
    const listing = await this.getById(id);
    if (listing.status !== 'pending_review') {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Listing is not pending review' },
      });
    }
    listing.status = 'active';
    listing.publishedAt = new Date();
    listing.rejectionReason = null;
    const saved = await this.listings.save(listing);
    this.bumpDashboard();
    void this.notifications.listingApproved(saved.sellerId, {
      id: saved.id,
      title: saved.title,
      slug: saved.slug,
    });
    return saved;
  }

  async reject(id: string, reason: string): Promise<Listing> {
    const listing = await this.getById(id);
    if (listing.status !== 'pending_review') {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Listing is not pending review' },
      });
    }
    listing.status = 'rejected';
    listing.rejectionReason = reason;
    const saved = await this.listings.save(listing);
    this.bumpDashboard();
    void this.notifications.listingRejected(
      saved.sellerId,
      { id: saved.id, title: saved.title },
      reason,
    );
    return saved;
  }

  /** Admin take-down from report queue (active / paused / pending review). */
  async takeDownForModeration(id: string, reason: string): Promise<Listing> {
    const listing = await this.getById(id);
    if (!['active', 'paused', 'pending_review'].includes(listing.status)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot remove listing in status "${listing.status}"`,
        },
      });
    }
    listing.status = 'rejected';
    listing.rejectionReason = reason;
    const saved = await this.listings.save(listing);
    this.bumpDashboard();
    void this.notifications.listingRejected(
      saved.sellerId,
      { id: saved.id, title: saved.title },
      reason,
    );
    return saved;
  }

  private async notifyFavouritesPriceDrop(
    listing: Listing,
    oldPrice: number,
    newPrice: number,
  ) {
    const userIds = await this.favourites.userIdsForListing(listing.id);
    await Promise.all(
      userIds
        .filter((uid) => uid !== listing.sellerId)
        .map((uid) =>
          this.notifications.priceDrop(
            uid,
            { id: listing.id, title: listing.title, slug: listing.slug },
            oldPrice,
            newPrice,
          ),
        ),
    );
  }

  private async resolveListingDealerId(
    seller: User,
    requested?: string | null,
  ): Promise<string | null> {
    const isDealer = seller.roles?.some((role) => role.name === 'dealer') ?? false;
    if (isDealer) {
      if (requested) {
        await this.dealersService.assertOwnedActiveDealer(seller.id, requested);
        return requested;
      }
      const owned = await this.dealersService.findActiveOwned(seller.id);
      if (!owned) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'DEALER_NOT_ACTIVE',
            message: 'Dealer must be approved before attaching listings',
          },
        });
      }
      return owned.id;
    }
    if (requested) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PRIVATE_SELLER_ONLY',
          message: 'Private sellers cannot list under a dealer',
        },
      });
    }
    return null;
  }

  private async getOwned(sellerId: string, id: string): Promise<Listing> {
    const listing = await this.getById(id);
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your listing' },
      });
    }
    return listing;
  }

  private async getById(id: string): Promise<Listing> {
    const listing = await this.listings.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    return listing;
  }
}

/** Split query so "d tracker" can match titles like "D-Tracker". */
export function searchTokens(q: string): string[] {
  return q
    .trim()
    .split(/[\s\-_/.,+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Escape LIKE wildcards in user input. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
