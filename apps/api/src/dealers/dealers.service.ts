import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AdminCreateDealerInput,
  AdminUpdateDealerInput,
  CreateDealerInput,
  UpdateDealerProfileInput,
} from '@throttlelk/validation';
import { Repository } from 'typeorm';
import { CacheService } from '../common/cache.service';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { slugify } from '../common/slugify';
import { Listing } from '../listings/listing.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { DealerImage } from './dealer-image.entity';
import { Dealer } from './dealer.entity';

@Injectable()
export class DealersService {
  constructor(
    @InjectRepository(Dealer) private readonly dealers: Repository<Dealer>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    private readonly usersService: UsersService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
  ) {}

  async create(owner: User, input: CreateDealerInput): Promise<Dealer> {
    if (owner.roles.some((role) => role.name === 'dealer')) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DEALER_EXISTS',
          message: 'You already have a dealer profile',
        },
      });
    }
    const existingActiveOrPending = await this.dealers.findOne({
      where: [
        { ownerUserId: owner.id, status: 'pending' },
        { ownerUserId: owner.id, status: 'active' },
      ],
    });
    if (existingActiveOrPending) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DEALER_EXISTS',
          message: 'You already have a dealer profile',
        },
      });
    }
    const base = slugify(input.name) || 'dealer';
    const slug = `${base}-${Date.now().toString(36)}`;
    const dealer = this.dealers.create({
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
    const saved = await this.dealers.save(dealer);
    void this.cache.invalidateDashboard();
    return saved;
  }

  listMine(ownerUserId: string) {
    return this.dealers
      .find({
        where: { ownerUserId },
        order: { createdAt: 'DESC' },
        take: 20,
      })
      .then(async (rows) => {
        const active = rows.find((row) => row.status === 'active');
        if (active) {
          const owner = await this.usersService.findByIdOrThrow(ownerUserId);
          if (owner.roles.some((role) => role.name === 'seller')) {
            await this.promoteOwnerToDealer(owner, active);
          }
        }
        return rows;
      });
  }

  async updateMine(
    owner: User,
    input: UpdateDealerProfileInput,
  ): Promise<Dealer> {
    const dealer = await this.findActiveOwned(owner.id);
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DEALER_NOT_FOUND',
          message: 'No active dealer showroom found',
        },
      });
    }
    this.applyProfileFields(dealer, input);
    await this.dealers.save(dealer);
    const fresh = await this.dealers.findOne({
      where: { id: dealer.id },
      relations: ['images', 'district', 'city'],
    });
    return this.withCover(fresh!);
  }

  private applyProfileFields(
    dealer: Dealer,
    input: UpdateDealerProfileInput &
      Partial<
        Pick<
          Dealer,
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
    const qb = this.dealers
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
    const qb = this.dealers
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
    const [rows, total] = await this.dealers.findAndCount({
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
    const qb = this.dealers
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
    return {
      items: rows.map((row) => this.withCover(row)),
      meta: paginationMeta(total, page, limit),
    };
  }

  async adminGet(id: string) {
    const dealer = await this.dealers.findOne({
      where: { id },
      relations: ['owner', 'district', 'city', 'images'],
    });
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DEALER_NOT_FOUND', message: 'Dealer not found' },
      });
    }
    return this.withCover(dealer);
  }

  async adminCreate(input: AdminCreateDealerInput): Promise<Dealer> {
    const owner = await this.usersService.findByIdOrThrow(input.ownerUserId);
    const base = slugify(input.name) || 'dealer';
    const slug = `${base}-${Date.now().toString(36)}`;
    const status = input.status ?? 'pending';
    const dealer = this.dealers.create({
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
      verifiedAt: status === 'active' ? new Date() : null,
    });
    const saved = await this.dealers.save(dealer);
    void this.cache.invalidateDashboard();
    if (status === 'active') {
      await this.promoteOwnerToDealer(owner, saved);
    }
    return this.adminGet(saved.id);
  }

  async adminUpdate(id: string, input: AdminUpdateDealerInput): Promise<Dealer> {
    const dealer = await this.getById(id);
    const prevStatus = dealer.status;

    if (input.ownerUserId) {
      await this.usersService.findByIdOrThrow(input.ownerUserId);
      dealer.ownerUserId = input.ownerUserId;
    }
    this.applyProfileFields(dealer, input);

    if (input.status) {
      dealer.status = input.status;
      if (input.status === 'active' && !dealer.verifiedAt) {
        dealer.verifiedAt = new Date();
      }
    }

    const saved = await this.dealers.save(dealer);
    if (input.status && input.status !== prevStatus) {
      void this.cache.invalidateDashboard();
    }

    if (input.status === 'active' && prevStatus !== 'active') {
      const owner = await this.usersService.findByIdOrThrow(saved.ownerUserId);
      await this.promoteOwnerToDealer(owner, saved);
    }

    return this.adminGet(saved.id);
  }

  async adminDelete(id: string) {
    const dealer = await this.getById(id);
    const listingCount = await this.listings.count({
      where: { dealerId: id },
    });
    if (listingCount > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DEALER_HAS_LISTINGS',
          message: `Cannot delete dealer with ${listingCount} listing(s). Suspend instead.`,
        },
      });
    }
    await this.dealers.remove(dealer);
    return { id, deleted: true as const };
  }

  async getPublicBySlug(slug: string) {
    const dealer = await this.dealers.findOne({
      where: { slug, status: 'active' },
      relations: ['images', 'district', 'city', 'owner'],
    });
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DEALER_NOT_FOUND', message: 'Dealer not found' },
      });
    }
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

  private withCover(dealer: Dealer) {
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

  private async attachDealerCovers(dealers: Dealer[]) {
    const ids = dealers.map((row) => row.id);
    if (ids.length === 0) return [];
    const images = await this.dealers.manager
      .getRepository(DealerImage)
      .createQueryBuilder('img')
      .where('img.dealerId IN (:...ids)', { ids })
      .orderBy('img.isCover', 'DESC')
      .addOrderBy('img.sortOrder', 'ASC')
      .getMany();
    const coverByDealer = new Map<string, string>();
    for (const img of images) {
      if (!coverByDealer.has(img.dealerId)) {
        coverByDealer.set(img.dealerId, img.imageUrl);
      }
    }
    return dealers.map((row) => ({
      ...row,
      images: [],
      coverImageUrl: coverByDealer.get(row.id) ?? null,
    }));
  }

  async approve(id: string): Promise<Dealer> {
    const dealer = await this.getById(id);
    if (dealer.status !== 'pending') {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Dealer is not pending' },
      });
    }
    dealer.status = 'active';
    dealer.verifiedAt = new Date();
    await this.dealers.save(dealer);
    void this.cache.invalidateDashboard();
    const owner = await this.usersService.findByIdOrThrow(dealer.ownerUserId);
    await this.promoteOwnerToDealer(owner, dealer);
    void this.notifications.dealerApproved(dealer.ownerUserId, {
      id: dealer.id,
      name: dealer.name,
      slug: dealer.slug,
    });
    return dealer;
  }

  async reject(id: string, reason: string): Promise<Dealer> {
    const dealer = await this.getById(id);
    if (dealer.status !== 'pending') {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Dealer is not pending' },
      });
    }
    dealer.status = 'rejected';
    await this.dealers.save(dealer);
    void this.cache.invalidateDashboard();
    void this.notifications.dealerRejected(dealer.ownerUserId, {
      id: dealer.id,
      name: dealer.name,
      reason,
    });
    return dealer;
  }

  async findActiveOwned(ownerUserId: string): Promise<Dealer | null> {
    return this.dealers.findOne({
      where: { ownerUserId, status: 'active' },
    });
  }

  async findActiveById(id: string): Promise<Dealer | null> {
    return this.dealers.findOne({
      where: { id, status: 'active' },
    });
  }

  /** Approved dealers keep buyer access but are no longer private sellers. */
  async promoteOwnerToDealer(owner: User, dealer: Dealer): Promise<void> {
    let user = await this.usersService.addRole(owner, 'dealer');
    user = await this.usersService.removeRole(user, 'seller');
    await this.attachOrphanListings(dealer);
  }

  /** Link the owner's listings that still have no dealer_id to this showroom. */
  async attachOrphanListings(dealer: Dealer): Promise<void> {
    await this.listings
      .createQueryBuilder()
      .update(Listing)
      .set({ dealerId: dealer.id })
      .where('seller_id = :ownerId', { ownerId: dealer.ownerUserId })
      .andWhere('dealer_id IS NULL')
      .execute();
  }

  async assertOwnedActiveDealer(ownerUserId: string, dealerId: string) {
    const dealer = await this.getById(dealerId);
    if (dealer.ownerUserId !== ownerUserId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your dealer profile' },
      });
    }
    if (dealer.status !== 'active') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DEALER_NOT_ACTIVE',
          message: 'Dealer must be approved before attaching listings',
        },
      });
    }
    return dealer;
  }

  private async getById(id: string): Promise<Dealer> {
    const dealer = await this.dealers.findOne({ where: { id } });
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DEALER_NOT_FOUND', message: 'Dealer not found' },
      });
    }
    return dealer;
  }
}
