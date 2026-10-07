import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  RegisterInput,
  UpdateProfileInput,
} from '@throttlelk/validation';
import { Listing } from '../listings/listing.entity';
import { CacheService } from '../common/cache.service';
import { assertSafeImageFile } from '../common/image-bytes';
import { hashPassword } from '../common/password-hash';
import {
  deletePublicMarketplaceImage,
  storePublicMarketplaceImage,
} from '../common/image-variants';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { Dealer } from '../dealers/dealer.entity';
import { StorageService } from '../storage/storage.service';
import { RefreshSession } from '../auth/refresh-session.entity';
import { Role } from './role.entity';
import { User } from './user.entity';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Dealer) private readonly dealers: Repository<Dealer>,
    @InjectRepository(RefreshSession)
    private readonly refreshSessions: Repository<RefreshSession>,
    private readonly storage: StorageService,
    private readonly cache: CacheService,
  ) {}

  async ensureRoles(): Promise<void> {
    const names = [
      'buyer',
      'seller',
      'dealer',
      'parts_dealer',
      'admin',
    ] as const;
    for (const name of names) {
      const existing = await this.roles.findOne({ where: { name } });
      if (!existing) {
        await this.roles.save(this.roles.create({ name }));
      }
    }
  }

  async createUser(input: RegisterInput, roleNames: string[]): Promise<User> {
    const email = input.email.toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already registered' },
      });
    }

    const roles = await this.roles.find({ where: { name: In(roleNames) } });
    const passwordHash = await hashPassword(input.password);
    const user = this.users.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone: input.phone ?? null,
      passwordHash,
      roles,
    });
    const saved = await this.users.save(user);
    void this.cache.invalidateDashboard();
    return saved;
  }

  async adminCreate(input: AdminCreateUserInput) {
    const user = await this.createUser(input, input.roles);
    if (input.status && input.status !== 'active') {
      user.status = input.status;
      await this.users.save(user);
    }
    return this.toPublic(await this.findByIdOrThrow(user.id));
  }

  async adminUpdate(userId: string, input: AdminUpdateUserInput) {
    const user = await this.findByIdOrThrow(userId);

    if (input.email && input.email.toLowerCase() !== user.email) {
      const email = input.email.toLowerCase();
      const existing = await this.users.findOne({ where: { email } });
      if (existing && existing.id !== user.id) {
        throw new ConflictException({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'Email already registered' },
        });
      }
      user.email = email;
      user.emailVerifiedAt = null;
    }

    if (input.firstName) user.firstName = input.firstName;
    if (input.lastName) user.lastName = input.lastName;
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.status) user.status = input.status;
    if (input.emailVerified === true) {
      user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
    } else if (input.emailVerified === false) {
      user.emailVerifiedAt = null;
    }
    if (input.password) {
      user.passwordHash = await hashPassword(input.password);
      await this.revokeRefreshSessions(user.id);
    }
    if (input.roles) {
      const roleNames =
        input.roles.includes('dealer') || input.roles.includes('parts_dealer')
          ? input.roles.filter((name) => name !== 'seller')
          : input.roles;
      const roles = await this.roles.find({ where: { name: In(roleNames) } });
      if (roles.length !== roleNames.length) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'INVALID_ROLES',
            message: 'One or more roles are invalid',
          },
        });
      }
      user.roles = roles;
    }

    const saved = await this.users.save(user);
    if (input.status === 'suspended' || input.password) {
      await this.revokeRefreshSessions(user.id);
    }
    await this.cache.invalidatePublicListings?.();
    return this.toPublic(saved);
  }

  async adminDelete(userId: string) {
    const user = await this.findByIdOrThrow(userId);
    const listingCount = await this.listings.count({
      where: { sellerId: userId },
    });
    if (listingCount > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'USER_HAS_LISTINGS',
          message: `Cannot delete user with ${listingCount} listing(s). Suspend the account instead.`,
        },
      });
    }
    await this.users.remove(user);
    return { id: userId, deleted: true as const };
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.toLowerCase() } });
  }

  /** ASVS 6.8.1 — look up the Google user by (provider, sub), not by email. */
  findByGoogleSub(googleSub: string): Promise<User | null> {
    return this.users.findOne({ where: { googleSub } });
  }

  async createGoogleUser(input: {
    email: string;
    googleSub: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  }): Promise<User> {
    const email = input.email.toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already registered' },
      });
    }

    const roleNames = ['buyer', 'seller'];
    const roles = await this.roles.find({ where: { name: In(roleNames) } });
    const user = this.users.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone: null,
      passwordHash: null,
      googleSub: input.googleSub,
      avatarUrl: input.avatarUrl ?? null,
      emailVerifiedAt: new Date(),
      status: 'active',
      roles,
    });
    const saved = await this.users.save(user);
    void this.cache.invalidateDashboard();
    return saved;
  }

  /** Links Google onto an existing account. Does not change passwordHash. */
  async linkGoogleAccount(user: User, googleSub: string): Promise<User> {
    user.googleSub = googleSub;
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
    }
    return this.users.save(user);
  }

  /**
   * Stores the Google profile photo. A photo the user uploaded themselves
   * (avatarStorageKey) is left in place.
   */
  async applyGoogleAvatar(user: User, avatarUrl: string | null): Promise<User> {
    if (!avatarUrl || user.avatarStorageKey || user.avatarUrl === avatarUrl) {
      return user;
    }
    user.avatarUrl = avatarUrl;
    return this.users.save(user);
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
        'user.avatarUrl',
        'user.avatarStorageKey',
        'user.status',
        'user.emailVerifiedAt',
        'user.phoneVerifiedAt',
        'user.createdAt',
        'user.updatedAt',
        'roles.id',
        'roles.name',
      ])
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }
    return user;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.users.find({ where: { id: In(ids) } });
  }

  async addRole(user: User, roleName: string): Promise<User> {
    const role = await this.roles.findOne({ where: { name: roleName } });
    if (!role) {
      throw new NotFoundException({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: `Role ${roleName} missing` },
      });
    }
    if (!user.roles.some((r) => r.name === roleName)) {
      user.roles = [...user.roles, role];
      return this.users.save(user);
    }
    return user;
  }

  async removeRole(user: User, roleName: string): Promise<User> {
    if (!user.roles.some((r) => r.name === roleName)) return user;
    user.roles = user.roles.filter((r) => r.name !== roleName);
    return this.users.save(user);
  }

  toPublic(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      roles: (user.roles ?? []).map((r) => r.name),
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }

  /** Public seller card — no email/phone. */
  toSellerPublic(user: User) {
    return {
      id: user.id,
      displayName: `${user.firstName} ${user.lastName.charAt(0)}.`.trim(),
      avatarUrl: user.avatarUrl,
      memberSince: user.createdAt,
    };
  }

  async getSellerPublic(id: string) {
    const user = await this.findByIdOrThrow(id);
    if (user.status !== 'active') {
      throw new NotFoundException({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Seller not found' },
      });
    }
    const shop = await this.dealers.findOne({
      where: { ownerUserId: id, status: 'active' },
    });
    const base = this.toSellerPublic(user);
    return {
      ...base,
      displayName: shop?.name ?? base.displayName,
      dealerSlug: shop?.slug ?? null,
    };
  }

  async updateProfile(user: User, input: UpdateProfileInput) {
    if (input.firstName) user.firstName = input.firstName;
    if (input.lastName) user.lastName = input.lastName;
    if (input.phone !== undefined) user.phone = input.phone;

    if (input.newPassword) {
      const currentHash = await this.loadPasswordHash(user.id);
      const ok = await bcrypt.compare(input.currentPassword ?? '', currentHash);
      if (!ok) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect',
          },
        });
      }
      user.passwordHash = await hashPassword(input.newPassword);
    }

    const saved = await this.users.save(user);
    if (input.newPassword) {
      await this.revokeRefreshSessions(user.id);
    }
    return this.toPublic(saved);
  }

  private async loadPasswordHash(userId: string): Promise<string> {
    const row = await this.users
      .createQueryBuilder('user')
      .select('user.id')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!row?.passwordHash) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect',
        },
      });
    }
    return row.passwordHash;
  }

  async uploadAvatar(user: User, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'Image file is required' },
      });
    }
    assertSafeImageFile(file);
    if (file.size > AVATAR_MAX_BYTES) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'Max image size is 5MB' },
      });
    }

    if (user.avatarStorageKey) {
      await deletePublicMarketplaceImage(this.storage, user.avatarStorageKey);
    }

    const stored = await storePublicMarketplaceImage(
      this.storage,
      `avatars/${user.id}/${randomUUID()}`,
      file.buffer,
      'avatar',
    );

    user.avatarStorageKey = stored.storageKey;
    user.avatarUrl = stored.imageUrl;
    return this.toPublic(await this.users.save(user));
  }

  async removeAvatar(user: User) {
    if (user.avatarStorageKey) {
      await deletePublicMarketplaceImage(this.storage, user.avatarStorageKey);
    }
    user.avatarStorageKey = null;
    user.avatarUrl = null;
    return this.toPublic(await this.users.save(user));
  }

  async setPassword(userId: string, password: string) {
    const user = await this.findByIdOrThrow(userId);
    user.passwordHash = await hashPassword(password);
    const saved = await this.users.save(user);
    await this.revokeRefreshSessions(userId);
    return saved;
  }

  async markEmailVerified(userId: string) {
    const user = await this.findByIdOrThrow(userId);
    user.emailVerifiedAt = new Date();
    return this.users.save(user);
  }

  async listUsers(paging?: {
    page?: string | number;
    limit?: string | number;
    q?: string;
    role?: string;
    status?: string;
  }) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const qb = this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .orderBy('user.createdAt', 'DESC');
    if (paging?.q?.trim()) {
      const q = `%${paging.q.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(user.email) LIKE :q OR LOWER(user.firstName) LIKE :q OR LOWER(user.lastName) LIKE :q OR LOWER(COALESCE(user.phone, '')) LIKE :q)",
        { q },
      );
    }
    if (paging?.role?.trim()) {
      qb.andWhere('roles.name = :role', { role: paging.role.trim() });
    }
    if (paging?.status?.trim()) {
      qb.andWhere('user.status = :status', { status: paging.status.trim() });
    }
    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((u) => this.toPublic(u)),
      meta: paginationMeta(total, page, limit),
    };
  }

  async setStatus(userId: string, status: 'active' | 'suspended') {
    const user = await this.findByIdOrThrow(userId);
    user.status = status;
    const saved = await this.users.save(user);
    if (status === 'suspended') {
      await this.revokeRefreshSessions(userId);
    }
    await this.cache.invalidatePublicListings?.();
    return this.toPublic(saved);
  }

  async revokeRefreshSessions(userId: string) {
    await this.refreshSessions
      .createQueryBuilder()
      .update(RefreshSession)
      .set({ revokedAt: () => 'NOW()' })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async countUsers() {
    return this.users.count();
  }

  async findActiveAdminIds(): Promise<string[]> {
    const rows = await this.users
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'admin' })
      .andWhere('user.status = :status', { status: 'active' })
      .select(['user.id'])
      .getMany();
    return rows.map((user) => user.id);
  }
}
