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
import { StorageService } from '../storage/storage.service';
import { Role } from './role.entity';
import { User } from './user.entity';

const AVATAR_ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    private readonly storage: StorageService,
  ) {}

  async ensureRoles(): Promise<void> {
    const names = ['buyer', 'seller', 'dealer', 'admin'] as const;
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
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = this.users.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone: input.phone ?? null,
      passwordHash,
      roles,
    });
    return this.users.save(user);
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
    }

    if (input.firstName) user.firstName = input.firstName;
    if (input.lastName) user.lastName = input.lastName;
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.status) user.status = input.status;
    if (input.password) {
      user.passwordHash = await bcrypt.hash(input.password, 10);
    }
    if (input.roles) {
      const roles = await this.roles.find({ where: { name: In(input.roles) } });
      if (roles.length !== input.roles.length) {
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

    return this.toPublic(await this.users.save(user));
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

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
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

  toPublic(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      roles: user.roles.map((r) => r.name),
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
    return this.toSellerPublic(user);
  }

  async updateProfile(user: User, input: UpdateProfileInput) {
    if (input.firstName) user.firstName = input.firstName;
    if (input.lastName) user.lastName = input.lastName;
    if (input.phone !== undefined) user.phone = input.phone;

    if (input.newPassword) {
      const ok = await bcrypt.compare(
        input.currentPassword ?? '',
        user.passwordHash,
      );
      if (!ok) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect',
          },
        });
      }
      user.passwordHash = await bcrypt.hash(input.newPassword, 10);
    }

    return this.toPublic(await this.users.save(user));
  }

  async uploadAvatar(user: User, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'Image file is required' },
      });
    }
    if (!AVATAR_ALLOWED.has(file.mimetype)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Only JPEG, PNG, or WebP images are allowed',
        },
      });
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'Max image size is 5MB' },
      });
    }

    if (user.avatarStorageKey) {
      await this.storage
        .deleteObject(user.avatarStorageKey)
        .catch(() => undefined);
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const storageKey = `avatars/${user.id}/${randomUUID()}.${ext}`;
    const stored = await this.storage.putObject(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    user.avatarStorageKey = stored.storageKey;
    user.avatarUrl = stored.publicUrl;
    return this.toPublic(await this.users.save(user));
  }

  async removeAvatar(user: User) {
    if (user.avatarStorageKey) {
      await this.storage
        .deleteObject(user.avatarStorageKey)
        .catch(() => undefined);
    }
    user.avatarStorageKey = null;
    user.avatarUrl = null;
    return this.toPublic(await this.users.save(user));
  }

  async setPassword(userId: string, password: string) {
    const user = await this.findByIdOrThrow(userId);
    user.passwordHash = await bcrypt.hash(password, 10);
    return this.users.save(user);
  }

  async markEmailVerified(userId: string) {
    const user = await this.findByIdOrThrow(userId);
    user.emailVerifiedAt = new Date();
    return this.users.save(user);
  }

  async listUsers(limit = 100) {
    const rows = await this.users.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map((u) => this.toPublic(u));
  }

  async setStatus(userId: string, status: 'active' | 'suspended') {
    const user = await this.findByIdOrThrow(userId);
    user.status = status;
    return this.toPublic(await this.users.save(user));
  }

  async countUsers() {
    return this.users.count();
  }
}
