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
} from '@throttlelk/validation';
import { Repository } from 'typeorm';
import { slugify } from '../common/slugify';
import { Listing } from '../listings/listing.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Dealer } from './dealer.entity';

@Injectable()
export class DealersService {
  constructor(
    @InjectRepository(Dealer) private readonly dealers: Repository<Dealer>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    private readonly usersService: UsersService,
    private readonly notifications: NotificationsService,
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
    return this.dealers.save(dealer);
  }

  listMine(ownerUserId: string) {
    return this.dealers
      .find({
        where: { ownerUserId },
        order: { createdAt: 'DESC' },
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

  listPending() {
    return this.dealers.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }

  listActive() {
    return this.dealers
      .find({
        where: { status: 'active' },
        relations: ['images', 'district', 'city'],
        order: { name: 'ASC' },
      })
      .then((rows) => rows.map((row) => this.withCover(row)));
  }

  async listAllAdmin(filters?: { status?: string; q?: string }) {
    const qb = this.dealers
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.owner', 'owner')
      .leftJoinAndSelect('d.district', 'district')
      .leftJoinAndSelect('d.city', 'city')
      .leftJoinAndSelect('d.images', 'images')
      .orderBy('d.updatedAt', 'DESC')
      .addOrderBy('images.sortOrder', 'ASC')
      .take(200);

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

    const rows = await qb.getMany();
    return rows.map((row) => this.withCover(row));
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
    if (input.name) {
      dealer.name = input.name;
    }
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

    if (input.status) {
      dealer.status = input.status;
      if (input.status === 'active' && !dealer.verifiedAt) {
        dealer.verifiedAt = new Date();
      }
    }

    const saved = await this.dealers.save(dealer);

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
      relations: ['images', 'district', 'city'],
    });
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DEALER_NOT_FOUND', message: 'Dealer not found' },
      });
    }
    return this.withCover(dealer);
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

  /** Approved dealers keep buyer access but are no longer private sellers. */
  async promoteOwnerToDealer(owner: User, dealer: Dealer): Promise<void> {
    let user = await this.usersService.addRole(owner, 'dealer');
    user = await this.usersService.removeRole(user, 'seller');
    await this.listings
      .createQueryBuilder()
      .update(Listing)
      .set({ dealerId: dealer.id })
      .where('seller_id = :ownerId', { ownerId: user.id })
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
