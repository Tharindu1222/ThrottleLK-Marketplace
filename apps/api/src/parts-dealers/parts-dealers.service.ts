import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AdminCreatePartsDealerInput,
  AdminUpdatePartsDealerInput,
  CreatePartsDealerInput,
  PerformanceRange,
  UpdatePartsDealerProfileInput,
} from '@throttlelk/validation';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { CacheService } from '../common/cache.service';
import { resolveMapLocation } from '../common/map-location';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { slugify } from '../common/slugify';
import { NotificationsService } from '../notifications/notifications.service';
import { PartFavourite } from '../part-listings/part-favourite.entity';
import { PartListingEngagementEvent } from '../part-listings/part-listing-engagement-event.entity';
import { PartListing } from '../part-listings/part-listing.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { PartsDealerImage } from './parts-dealer-image.entity';
import { PartsDealer } from './parts-dealer.entity';

export type PartsDealerPerformance = {
  range: 'all' | '7d' | '30d';
  activeListings: number;
  views: number;
  phoneClicks: number;
  whatsappClicks: number;
  favourites: number;
};

function rangeStart(range: 'all' | '7d' | '30d'): Date | null {
  if (range === 'all') return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (range === '7d' ? 7 : 30));
  return d;
}

@Injectable()
export class PartsDealersService {
  constructor(
    @InjectRepository(PartsDealer)
    private readonly partsDealers: Repository<PartsDealer>,
    @InjectRepository(PartListing)
    private readonly partListings: Repository<PartListing>,
    @InjectRepository(PartListingEngagementEvent)
    private readonly engagementEvents: Repository<PartListingEngagementEvent>,
    @InjectRepository(PartFavourite)
    private readonly favourites: Repository<PartFavourite>,
    private readonly usersService: UsersService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
  ) {}

  async create(owner: User, input: CreatePartsDealerInput): Promise<PartsDealer> {
    if (owner.roles.some((role) => role.name === 'parts_dealer')) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PARTS_DEALER_EXISTS',
          message: 'You already have a parts dealer profile',
        },
      });
    }
    const existingActiveOrPending = await this.partsDealers.findOne({
      where: [
        { ownerUserId: owner.id, status: 'pending' },
        { ownerUserId: owner.id, status: 'active' },
      ],
    });
    if (existingActiveOrPending) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PARTS_DEALER_EXISTS',
          message: 'You already have a parts dealer profile',
        },
      });
    }
    const slug = await this.allocateUniqueSlug(input.name);
    const dealer = this.partsDealers.create({
      ownerUserId: owner.id,
      name: input.name,
      slug,
      description: input.description ?? null,
      phone: input.phone,
      whatsapp: input.whatsapp ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      address: input.address ?? null,
      districtId: input.districtId,
      cityId: input.cityId,
      status: 'pending',
    });
    const saved = await this.partsDealers.save(dealer);
    void this.cache.invalidateDashboard();
    void this.notifications.partsDealerPendingReview({
      id: saved.id,
      name: saved.name,
      slug: saved.slug,
    });
    return saved;
  }

  listMine(ownerUserId: string) {
    return this.partsDealers
      .find({
        where: { ownerUserId },
        order: { createdAt: 'DESC' },
        take: 20,
      })
      .then(async (rows) => {
        const active = rows.find((row) => row.status === 'active');
        if (active) {
          await this.ensureSlugMatchesName(active);
          const owner = await this.usersService.findByIdOrThrow(ownerUserId);
          if (owner.roles.some((role) => role.name === 'seller')) {
            await this.promoteOwnerToPartsDealer(owner);
          }
        }
        return rows;
      });
  }

  async updateMine(
    owner: User,
    input: UpdatePartsDealerProfileInput,
  ): Promise<PartsDealer> {
    const dealer = await this.findActiveOwned(owner.id);
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PARTS_DEALER_NOT_FOUND',
          message: 'No active parts dealer shop found',
        },
      });
    }
    this.applyProfileFields(dealer, input);
    dealer.slug = await this.allocateUniqueSlug(dealer.name, dealer.id);
    await this.partsDealers.save(dealer);
    const fresh = await this.partsDealers.findOne({
      where: { id: dealer.id },
      relations: ['images', 'district', 'city'],
    });
    return this.withCover(fresh!);
  }

  private applyProfileFields(
    dealer: PartsDealer,
    input: UpdatePartsDealerProfileInput &
      Partial<
        Pick<
          PartsDealer,
          'latitude' | 'longitude' | 'facebookUrl' | 'tiktokUrl'
        >
      >,
  ) {
    if (input.name) dealer.name = input.name;
    if (input.description !== undefined) {
      dealer.description = input.description ?? null;
    }
    if (input.phone) dealer.phone = input.phone;
    if (input.whatsapp !== undefined) dealer.whatsapp = input.whatsapp ?? null;
    if (input.email !== undefined) dealer.email = input.email ?? null;
    if (input.website !== undefined) dealer.website = input.website ?? null;
    if (input.address !== undefined) dealer.address = input.address ?? null;
    if (input.districtId) dealer.districtId = input.districtId;
    if (input.cityId) dealer.cityId = input.cityId;
    if (input.latitude !== undefined) dealer.latitude = input.latitude;
    if (input.longitude !== undefined) dealer.longitude = input.longitude;
    if (input.facebookUrl !== undefined) {
      dealer.facebookUrl = input.facebookUrl;
    }
    if (input.tiktokUrl !== undefined) dealer.tiktokUrl = input.tiktokUrl;
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
    const qb = this.partsDealers
      .createQueryBuilder('d')
      .where('d.status = :status', { status: 'pending' })
      .orderBy('d.createdAt', 'ASC');
    if (paging?.q?.trim()) {
      const q = `%${paging.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(d.name) LIKE :q OR LOWER(d.phone) LIKE :q OR LOWER(d.slug) LIKE :q)',
        { q },
      );
    }
    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return { items: rows, meta: paginationMeta(total, page, limit) };
  }

  async listActive(paging?: {
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
    const qb = this.partsDealers
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.district', 'district')
      .leftJoinAndSelect('d.city', 'city')
      .where('d.status = :status', { status: 'active' })
      .orderBy('d.name', 'ASC');
    if (paging?.q?.trim()) {
      const q = `%${paging.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(d.name) LIKE :q OR LOWER(d.slug) LIKE :q OR LOWER(city.name) LIKE :q OR LOWER(district.name) LIKE :q)',
        { q },
      );
    }
    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const withImages = await this.attachDealerCovers(rows);
    return {
      items: withImages,
      meta: paginationMeta(total, page, limit),
    };
  }

  async listForMap() {
    const rows = await this.partsDealers
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.district', 'district')
      .leftJoinAndSelect('d.city', 'city')
      .where('d.status = :status', { status: 'active' })
      .orderBy('d.name', 'ASC')
      .getMany();

    const withCovers = await this.attachDealerCovers(rows);
    return withCovers
      .map((row) => {
        const loc = resolveMapLocation(row);
        if (!loc) return null;
        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          latitude: loc.latitude,
          longitude: loc.longitude,
          approximate: loc.approximate,
          coverImageUrl: row.coverImageUrl ?? null,
          verifiedAt: row.verifiedAt ?? null,
          city: row.city ? { name: row.city.name } : null,
          district: row.district ? { name: row.district.name } : null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
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
    const [rows, total] = await this.partsDealers.findAndCount({
      where: { status: 'active' },
      select: ['id', 'slug'],
      order: { name: 'ASC' },
      skip,
      take: limit,
    });
    return {
      items: rows.map((row) => ({ slug: row.slug })),
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
    const qb = this.partsDealers
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.owner', 'owner')
      .leftJoinAndSelect('d.district', 'district')
      .leftJoinAndSelect('d.city', 'city')
      .orderBy('d.updatedAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('d.status = :status', { status: filters.status });
    }
    if (filters?.q?.trim()) {
      const q = `%${filters.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(d.name) LIKE :q OR LOWER(d.slug) LIKE :q OR LOWER(d.phone) LIKE :q OR LOWER(owner.email) LIKE :q)',
        { q },
      );
    }

    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const counts = await this.partsCountsByDealerId(rows.map((r) => r.id));
    return {
      items: rows.map((row) => ({
        ...this.withCover(row),
        partsCount: counts.get(row.id) ?? 0,
      })),
      meta: paginationMeta(total, page, limit),
    };
  }

  async adminGet(id: string) {
    const dealer = await this.partsDealers.findOne({
      where: { id },
      relations: ['owner', 'district', 'city', 'images'],
    });
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PARTS_DEALER_NOT_FOUND',
          message: 'Parts dealer not found',
        },
      });
    }
    const covered = this.withCover(dealer);
    const counts = await this.partsCountsByDealerId([dealer.id]);
    const byStatusRows: Array<{ status: string; count: string }> =
      await this.partListings
        .createQueryBuilder('l')
        .select('l.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('l.parts_dealer_id = :id', { id: dealer.id })
        .andWhere('l.deleted_at IS NULL')
        .groupBy('l.status')
        .getRawMany();
    const partsByStatus: Record<string, number> = {};
    for (const row of byStatusRows) {
      partsByStatus[row.status] = Number(row.count);
    }
    return {
      ...covered,
      partsCount: counts.get(dealer.id) ?? 0,
      partsByStatus,
    };
  }

  async adminCreate(input: AdminCreatePartsDealerInput): Promise<PartsDealer> {
    const owner = await this.usersService.findByIdOrThrow(input.ownerUserId);
    const slug = await this.allocateUniqueSlug(input.name);
    const status = input.status ?? 'pending';
    const dealer = this.partsDealers.create({
      ownerUserId: owner.id,
      name: input.name,
      slug,
      description: input.description ?? null,
      phone: input.phone,
      whatsapp: input.whatsapp ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      address: input.address ?? null,
      districtId: input.districtId,
      cityId: input.cityId,
      status,
      verifiedAt: null,
    });
    this.applyVerification(dealer, status, input.verified);
    const saved = await this.partsDealers.save(dealer);
    void this.cache.invalidateDashboard();
    if (status === 'active') {
      await this.promoteOwnerToPartsDealer(owner);
    }
    return this.adminGet(saved.id);
  }

  async adminUpdate(
    id: string,
    input: AdminUpdatePartsDealerInput,
  ): Promise<PartsDealer> {
    const dealer = await this.getById(id);
    const prevStatus = dealer.status;

    if (input.ownerUserId) {
      await this.usersService.findByIdOrThrow(input.ownerUserId);
      dealer.ownerUserId = input.ownerUserId;
    }
    this.applyProfileFields(dealer, input);
    if (input.name) {
      dealer.slug = await this.allocateUniqueSlug(dealer.name, dealer.id);
    }

    if (input.status) {
      dealer.status = input.status;
    }

    const nextStatus = input.status ?? dealer.status;
    this.applyVerification(dealer, nextStatus, input.verified);

    const saved = await this.partsDealers.save(dealer);
    if (input.status && input.status !== prevStatus) {
      void this.cache.invalidateDashboard();
    }

    if (input.status === 'active' && prevStatus !== 'active') {
      const owner = await this.usersService.findByIdOrThrow(saved.ownerUserId);
      await this.promoteOwnerToPartsDealer(owner);
    }

    return this.adminGet(saved.id);
  }

  async adminDelete(id: string) {
    const dealer = await this.getById(id);
    const listingCount = await this.partListings.count({
      where: { partsDealerId: id },
    });
    if (listingCount > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PARTS_DEALER_HAS_LISTINGS',
          message: `Cannot delete parts dealer with ${listingCount} listing(s). Suspend instead.`,
        },
      });
    }
    await this.partsDealers.remove(dealer);
    return { id, deleted: true as const };
  }

  async getPublicBySlug(slug: string) {
    const dealer = await this.partsDealers.findOne({
      where: { slug, status: 'active' },
      relations: ['images', 'district', 'city', 'owner'],
    });
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PARTS_DEALER_NOT_FOUND',
          message: 'Parts dealer not found',
        },
      });
    }
    await this.ensureSlugMatchesName(dealer);
    const owner = dealer.owner;
    const covered = this.withCover(dealer);
    const { owner: _owner, ...safe } = covered as typeof covered & {
      owner?: unknown;
    };
    return {
      ...safe,
      ownerAvatarUrl: owner?.avatarUrl ?? null,
      ownerDisplayName: owner
        ? `${owner.firstName} ${owner.lastName}`.trim()
        : null,
    };
  }

  private async partsCountsByDealerId(
    dealerIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (dealerIds.length === 0) return map;
    const rows: Array<{ partsDealerId: string; count: string }> =
      await this.partListings
        .createQueryBuilder('l')
        .select('l.parts_dealer_id', 'partsDealerId')
        .addSelect('COUNT(*)', 'count')
        .where('l.parts_dealer_id IN (:...dealerIds)', { dealerIds })
        .andWhere('l.deleted_at IS NULL')
        .groupBy('l.parts_dealer_id')
        .getRawMany();
    for (const row of rows) {
      map.set(row.partsDealerId, Number(row.count));
    }
    return map;
  }

  private withCover(dealer: PartsDealer) {
    const images = [...(dealer.images ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const cover = images[0] ?? null;
    return {
      ...dealer,
      images,
      coverImageUrl: cover?.imageUrl ?? null,
    };
  }

  private async attachDealerCovers(dealers: PartsDealer[]) {
    const ids = dealers.map((row) => row.id);
    if (ids.length === 0) return [];
    const images = await this.partsDealers.manager
      .getRepository(PartsDealerImage)
      .createQueryBuilder('img')
      .where('img.partsDealerId IN (:...ids)', { ids })
      .orderBy('img.isCover', 'DESC')
      .addOrderBy('img.sortOrder', 'ASC')
      .getMany();
    const coverByDealer = new Map<string, string>();
    for (const img of images) {
      if (!coverByDealer.has(img.partsDealerId)) {
        coverByDealer.set(img.partsDealerId, img.imageUrl);
      }
    }
    return dealers.map((row) => ({
      ...row,
      images: [],
      coverImageUrl: coverByDealer.get(row.id) ?? null,
    }));
  }

  async approve(id: string): Promise<PartsDealer> {
    const dealer = await this.getById(id);
    if (dealer.status !== 'pending') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Parts dealer is not pending',
        },
      });
    }
    dealer.status = 'active';
    await this.partsDealers.save(dealer);
    void this.cache.invalidateDashboard();
    const owner = await this.usersService.findByIdOrThrow(dealer.ownerUserId);
    await this.promoteOwnerToPartsDealer(owner);
    void this.notifications.partsDealerApproved(dealer.ownerUserId, {
      id: dealer.id,
      name: dealer.name,
      slug: dealer.slug,
    });
    return dealer;
  }

  async reject(id: string, reason: string): Promise<PartsDealer> {
    const dealer = await this.getById(id);
    if (dealer.status !== 'pending') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Parts dealer is not pending',
        },
      });
    }
    dealer.status = 'rejected';
    dealer.verifiedAt = null;
    await this.partsDealers.save(dealer);
    void this.cache.invalidateDashboard();
    void this.notifications.partsDealerRejected(dealer.ownerUserId, {
      id: dealer.id,
      name: dealer.name,
      reason,
    });
    return dealer;
  }

  async findActiveOwned(ownerUserId: string): Promise<PartsDealer | null> {
    return this.partsDealers.findOne({
      where: { ownerUserId, status: 'active' },
    });
  }

  async performance(
    ownerUserId: string,
    range: PerformanceRange,
  ): Promise<PartsDealerPerformance> {
    const dealer = await this.findActiveOwned(ownerUserId);
    if (!dealer) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'No active parts dealer shop found',
        },
      });
    }

    const activeListings = await this.partListings.count({
      where: { partsDealerId: dealer.id, status: 'active' },
    });

    const listingRows = await this.partListings.find({
      where: { partsDealerId: dealer.id },
      select: ['id', 'viewCount', 'phoneClickCount', 'whatsappClickCount'],
    });
    const ids = listingRows.map((row) => row.id);
    if (ids.length === 0) {
      return {
        range,
        activeListings,
        views: 0,
        phoneClicks: 0,
        whatsappClicks: 0,
        favourites: 0,
      };
    }

    if (range === 'all') {
      const favourites = await this.favourites.count({
        where: { partListingId: In(ids) },
      });
      return {
        range,
        activeListings,
        views: listingRows.reduce((sum, row) => sum + (row.viewCount ?? 0), 0),
        phoneClicks: listingRows.reduce(
          (sum, row) => sum + (row.phoneClickCount ?? 0),
          0,
        ),
        whatsappClicks: listingRows.reduce(
          (sum, row) => sum + (row.whatsappClickCount ?? 0),
          0,
        ),
        favourites,
      };
    }

    const start = rangeStart(range);
    const [views, phoneClicks, whatsappClicks, favourites] = await Promise.all([
      this.countEvents(ids, 'view', start),
      this.countEvents(ids, 'phone', start),
      this.countEvents(ids, 'whatsapp', start),
      this.favourites.count({
        where: {
          partListingId: In(ids),
          ...(start ? { createdAt: MoreThanOrEqual(start) } : {}),
        },
      }),
    ]);

    return {
      range,
      activeListings,
      views,
      phoneClicks,
      whatsappClicks,
      favourites,
    };
  }

  private countEvents(
    partListingIds: string[],
    type: PartListingEngagementEvent['type'],
    start: Date | null,
  ) {
    return this.engagementEvents.count({
      where: {
        partListingId: In(partListingIds),
        type,
        ...(start ? { createdAt: MoreThanOrEqual(start) } : {}),
      },
    });
  }

  async findActiveById(id: string): Promise<PartsDealer | null> {
    return this.partsDealers.findOne({
      where: { id, status: 'active' },
    });
  }

  async activeVerifiedIds(ids: string[]): Promise<Set<string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return new Set();
    const rows = await this.partsDealers
      .createQueryBuilder('d')
      .select(['d.id'])
      .where('d.id IN (:...ids)', { ids: unique })
      .andWhere('d.status = :status', { status: 'active' })
      .andWhere('d.verifiedAt IS NOT NULL')
      .getMany();
    return new Set(rows.map((row) => row.id));
  }

  private applyVerification(
    dealer: PartsDealer,
    status: string,
    verified?: boolean,
  ) {
    if (status !== 'active') {
      dealer.verifiedAt = null;
      return;
    }
    if (verified === true) {
      if (!dealer.verifiedAt) dealer.verifiedAt = new Date();
    } else if (verified === false) {
      dealer.verifiedAt = null;
    }
  }

  /** Approved parts dealers keep buyer access but are no longer private sellers. */
  async promoteOwnerToPartsDealer(owner: User): Promise<void> {
    let user = await this.usersService.addRole(owner, 'parts_dealer');
    await this.usersService.removeRole(user, 'seller');
  }

  async assertOwnedActivePartsDealer(
    ownerUserId: string,
    partsDealerId: string,
  ) {
    const dealer = await this.getById(partsDealerId);
    if (dealer.ownerUserId !== ownerUserId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your parts dealer profile' },
      });
    }
    if (dealer.status !== 'active') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PARTS_DEALER_NOT_ACTIVE',
          message: 'Parts dealer must be approved before creating listings',
        },
      });
    }
    return dealer;
  }

  private async getById(id: string): Promise<PartsDealer> {
    const dealer = await this.partsDealers.findOne({ where: { id } });
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PARTS_DEALER_NOT_FOUND',
          message: 'Parts dealer not found',
        },
      });
    }
    return dealer;
  }

  private async ensureSlugMatchesName(dealer: PartsDealer): Promise<void> {
    const desired = await this.allocateUniqueSlug(dealer.name, dealer.id);
    if (desired === dealer.slug) return;
    dealer.slug = desired;
    await this.partsDealers.save(dealer);
  }

  private async allocateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const base = slugify(name) || 'parts-dealer';
    let candidate = base;
    let n = 1;
    for (;;) {
      const existing = await this.partsDealers.findOne({
        where: { slug: candidate },
        select: ['id'],
      });
      if (!existing || existing.id === excludeId) return candidate;
      n += 1;
      candidate = `${base}-${n}`;
    }
  }
}
