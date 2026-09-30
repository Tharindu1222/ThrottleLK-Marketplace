import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import type { User } from './user.entity';

describe('UsersService.updateProfile', () => {
  it('revokes refresh sessions after a password change', async () => {
    const passwordHash = await bcrypt.hash('old-password', 4);
    const user = {
      id: 'user-1',
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      phone: null,
      avatarUrl: null,
      passwordHash,
      roles: [{ name: 'buyer' }],
      status: 'active',
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
    } as unknown as User;

    const users = {
      save: jest.fn(async (saved: User) => saved),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => ({
          id: user.id,
          passwordHash,
        })),
      })),
    };
    const refreshSessions = {
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn(async () => ({ affected: 2 })),
      })),
    };

    const service = new UsersService(
      users as never,
      {} as never,
      {} as never,
      {} as never,
      refreshSessions as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
    );

    await service.updateProfile(user, {
      currentPassword: 'old-password',
      newPassword: 'new-password-1',
    });

    expect(refreshSessions.createQueryBuilder).toHaveBeenCalled();
  });

  it('does not revoke sessions for a name-only update', async () => {
    const user = {
      id: 'user-1',
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      phone: null,
      avatarUrl: null,
      passwordHash: 'hash',
      roles: [{ name: 'buyer' }],
      status: 'active',
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
    } as unknown as User;

    const users = {
      save: jest.fn(async (saved: User) => saved),
    };
    const refreshSessions = {
      createQueryBuilder: jest.fn(),
    };

    const service = new UsersService(
      users as never,
      {} as never,
      {} as never,
      {} as never,
      refreshSessions as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
    );

    await service.updateProfile(user, { firstName: 'Nimal' });

    expect(refreshSessions.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects a wrong current password', async () => {
    const passwordHash = await bcrypt.hash('old-password', 4);
    const user = {
      id: 'user-1',
      passwordHash,
      roles: [],
    } as unknown as User;

    const service = new UsersService(
      {
        createQueryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn(async () => ({ id: 'user-1', passwordHash })),
        })),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      { createQueryBuilder: jest.fn() } as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
    );

    await expect(
      service.updateProfile(user, {
        currentPassword: 'wrong',
        newPassword: 'new-password-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('UsersService.adminUpdate email verification', () => {
  it('turns email verification on and off', async () => {
    const user = {
      id: 'user-1',
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      phone: null,
      avatarUrl: null,
      roles: [{ name: 'buyer' }],
      status: 'active',
      emailVerifiedAt: null,
      createdAt: new Date(),
    } as unknown as User;
    const users = {
      findOne: jest.fn(async () => user),
      save: jest.fn(async (saved: User) => saved),
    };
    const service = new UsersService(
      users as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
    );

    const verified = await service.adminUpdate('user-1', { emailVerified: true });
    expect(verified.emailVerifiedAt).toBeInstanceOf(Date);
    const cleared = await service.adminUpdate('user-1', { emailVerified: false });
    expect(cleared.emailVerifiedAt).toBeNull();
  });
});
