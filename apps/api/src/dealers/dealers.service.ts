import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateDealerInput } from '@throttlelk/validation';
import { Repository } from 'typeorm';
import { slugify } from '../common/slugify';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Dealer } from './dealer.entity';

@Injectable()
export class DealersService {
  constructor(
    @InjectRepository(Dealer) private readonly dealers: Repository<Dealer>,
    private readonly usersService: UsersService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(owner: User, input: CreateDealerInput): Promise<Dealer> {
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
    return this.dealers.find({
      where: { ownerUserId },
      order: { createdAt: 'DESC' },
    });
  }

  listPending() {
    return this.dealers.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }

  listActive() {
    return this.dealers.find({
      where: { status: 'active' },
      order: { name: 'ASC' },
    });
  }

  async getPublicBySlug(slug: string): Promise<Dealer> {
    const dealer = await this.dealers.findOne({ where: { slug, status: 'active' } });
    if (!dealer) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DEALER_NOT_FOUND', message: 'Dealer not found' },
      });
    }
    return dealer;
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
    await this.usersService.addRole(owner, 'dealer');
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
