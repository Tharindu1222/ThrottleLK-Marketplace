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
  UpdateListingInput,
} from '@throttlelk/validation';
import type { ListingStatus } from '@throttlelk/types';
import { In, Repository } from 'typeorm';
import { slugify } from '../common/slugify';
import { User } from '../users/user.entity';
import { DealersService } from '../dealers/dealers.service';
import { FavouritesService } from '../favourites/favourites.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { ListingInquiry } from './listing-inquiry.entity';
import { Listing } from './listing.entity';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(ListingInquiry)
    private readonly inquiries: Repository<ListingInquiry>,
    private readonly dealersService: DealersService,
    private readonly notifications: NotificationsService,
    private readonly favourites: FavouritesService,
    private readonly usersService: UsersService,
  ) {}

  async create(seller: User, input: CreateListingInput): Promise<Listing> {
    if (input.dealerId) {
      await this.dealersService.assertOwnedActiveDealer(
        seller.id,
        input.dealerId,
      );
    }
    const baseSlug = slugify(input.title) || 'listing';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const listing = this.listings.create({
      sellerId: seller.id,
      dealerId: input.dealerId ?? null,
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
    });
    return this.listings.save(listing);
  }

  async update(
    seller: User,
    id: string,
    input: UpdateListingInput,
  ): Promise<Listing> {
    const listing = await this.getOwned(seller.id, id);
    if (!['draft', 'rejected', 'paused', 'pending_review'].includes(listing.status)) {
      if (listing.status === 'active') {
        const keys = (
          Object.keys(input) as (keyof UpdateListingInput)[]
        ).filter((k) => input[k] !== undefined);
        const priceOnly = keys.every(
          (k) => k === 'priceLkr' || k === 'negotiable',
        );
        if (priceOnly && input.priceLkr != null) {
          const oldPrice = listing.priceLkr;
          listing.priceLkr = input.priceLkr;
          if (input.negotiable != null) listing.negotiable = input.negotiable;
          const saved = await this.listings.save(listing);
          if (input.priceLkr < oldPrice) {
            void this.notifyFavouritesPriceDrop(saved, oldPrice, input.priceLkr);
          }
          return saved;
        }
        Object.assign(listing, input);
        listing.status = 'pending_review';
        listing.publishedAt = null;
        listing.rejectionReason = null;
        return this.listings.save(listing);
      }
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot edit listing in status ${listing.status}`,
        },
      });
    }
    Object.assign(listing, input);
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
    return this.listings.save(listing);
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
    return this.listings.save(listing);
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
    return this.listings.save(listing);
  }

  async markSold(seller: User, id: string): Promise<Listing> {
    const listing = await this.getOwned(seller.id, id);
    if (!['active', 'paused'].includes(listing.status)) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Cannot mark sold from this status' },
      });
    }
    listing.status = 'sold';
    listing.soldAt = new Date();
    return this.listings.save(listing);
  }

  listMine(sellerId: string) {
    return this.listings.find({
      where: { sellerId },
      relations: ['images'],
      order: { updatedAt: 'DESC' },
    }).then((rows) => rows.map((row) => this.withCover(row)));
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
  }) {
    const qb = this.listings
      .createQueryBuilder('l')
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
    if (filters.q) {
      qb.andWhere('(l.title ILIKE :q OR l.description ILIKE :q)', {
        q: `%${filters.q}%`,
      });
    }

    switch (filters.sort) {
      case 'oldest':
        qb.orderBy('l.published_at', 'ASC', 'NULLS LAST');
        break;
      case 'price_asc':
        qb.orderBy('l.price_lkr', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('l.price_lkr', 'DESC');
        break;
      case 'mileage_asc':
        qb.orderBy('l.mileage', 'ASC', 'NULLS LAST');
        break;
      case 'mileage_desc':
        qb.orderBy('l.mileage', 'DESC', 'NULLS LAST');
        break;
      case 'year_asc':
        qb.orderBy('l.manufacture_year', 'ASC');
        break;
      case 'year_desc':
        qb.orderBy('l.manufacture_year', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('l.published_at', 'DESC', 'NULLS LAST');
        break;
    }

    const rows = await qb.take(50).getMany();
    if (rows.length === 0) return [];

    const withImages = await this.listings.find({
      where: { id: In(rows.map((r) => r.id)) },
      relations: ['images'],
    });
    const byId = new Map(withImages.map((row) => [row.id, row]));
    return rows.map((row) => this.withCover(byId.get(row.id) ?? row));
  }

  async getPublicOrOwned(idOrSlug: string, viewer?: User | null) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const listing = await this.listings.findOne({
      where: isUuid ? [{ id: idOrSlug }, { slug: idOrSlug }] : { slug: idOrSlug },
      relations: ['images'],
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

    const showContact = Boolean(viewer) || isOwner || isAdmin;
    const seller = await this.usersService
      .findByIdOrThrow(listing.sellerId)
      .then((u) => this.usersService.toSellerPublic(u))
      .catch(() => null);
    const base = { ...this.withCover(listing), seller };
    if (!showContact) {
      return {
        ...base,
        phone: null,
        whatsapp: null,
        contactHidden: true as const,
      };
    }
    return { ...base, contactHidden: false as const };
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

  listPending() {
    return this.listings.find({
      where: { status: 'pending_review' as ListingStatus },
      order: { updatedAt: 'ASC' },
    });
  }

  async listAllAdmin(filters?: { status?: string; q?: string }) {
    const qb = this.listings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.brand', 'brand')
      .leftJoinAndSelect('l.model', 'model')
      .leftJoinAndSelect('l.district', 'district')
      .leftJoinAndSelect('l.city', 'city')
      .leftJoinAndSelect('l.seller', 'seller')
      .leftJoinAndSelect('l.images', 'images')
      .orderBy('l.updatedAt', 'DESC')
      .take(200);

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

    const rows = await qb.getMany();
    return rows.map((row) => this.withCover(row));
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
    if (input.dealerId) {
      await this.dealersService.assertOwnedActiveDealer(
        seller.id,
        input.dealerId,
      );
    }
    const baseSlug = slugify(input.title) || 'listing';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const status = (input.status ?? 'draft') as ListingStatus;
    const listing = this.listings.create({
      sellerId: seller.id,
      dealerId: input.dealerId ?? null,
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

    return this.listings.save(listing);
  }

  async adminDelete(id: string): Promise<{ id: string; deleted: true }> {
    const listing = await this.getById(id);
    await this.listings.softRemove(listing);
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
