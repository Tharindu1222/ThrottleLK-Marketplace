import { BadRequestException } from '@nestjs/common';
import type { Role } from '../users/role.entity';
import type { User } from '../users/user.entity';
import type { Dealer } from './dealer.entity';
import { DealersService } from './dealers.service';

function role(name: string) {
  return { id: `${name}-id`, name } as Role;
}

function makeService(dealer: Partial<Dealer>, owner: User) {
  const row = { ...dealer } as Dealer;
  const dealersRepo = {
    findOne: jest.fn(async () => row),
    find: jest.fn(async () => [row]),
    save: jest.fn(async (saved: Dealer) => saved),
  };
  const execute = jest.fn(async () => ({ affected: 1 }));
  const listingsRepo = {
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute,
    })),
    count: jest.fn(),
  };
  const usersService = {
    findByIdOrThrow: jest.fn(async () => owner),
    addRole: jest.fn(async (user: User, name: string) => {
      if (!user.roles.some((r) => r.name === name)) {
        user.roles = [...user.roles, role(name)];
      }
      return user;
    }),
    removeRole: jest.fn(async (user: User, name: string) => {
      user.roles = user.roles.filter((r) => r.name !== name);
      return user;
    }),
  };
  const notifications = {
    dealerApproved: jest.fn(),
    dealerRejected: jest.fn(),
  };
  const service = new DealersService(
    dealersRepo as never,
    listingsRepo as never,
    usersService as never,
    notifications as never,
  );
  return { service, usersService, listingsRepo, execute, notifications, row };
}

describe('DealersService.approve', () => {
  it('converts a private seller into a dealer-only account and moves listings', async () => {
    const owner = {
      id: 'user-1',
      roles: [role('buyer'), role('seller')],
    } as User;
    const { service, usersService, execute, notifications } = makeService(
      {
        id: 'dealer-1',
        ownerUserId: 'user-1',
        name: 'Island Motos',
        slug: 'island-motos',
        status: 'pending',
      },
      owner,
    );

    const approved = await service.approve('dealer-1');

    expect(approved.status).toBe('active');
    expect(usersService.addRole).toHaveBeenCalledWith(owner, 'dealer');
    expect(usersService.removeRole).toHaveBeenCalledWith(owner, 'seller');
    expect(owner.roles.map((r) => r.name).sort()).toEqual(['buyer', 'dealer']);
    expect(execute).toHaveBeenCalled();
    expect(notifications.dealerApproved).toHaveBeenCalledWith('user-1', {
      id: 'dealer-1',
      name: 'Island Motos',
      slug: 'island-motos',
    });
  });

  it('keeps buyer access after dealer approval', async () => {
    const owner = {
      id: 'user-1',
      roles: [role('buyer'), role('seller')],
    } as User;
    const { service } = makeService(
      {
        id: 'dealer-1',
        ownerUserId: 'user-1',
        name: 'Island Motos',
        slug: 'island-motos',
        status: 'pending',
      },
      owner,
    );

    await service.approve('dealer-1');

    expect(owner.roles.some((r) => r.name === 'buyer')).toBe(true);
    expect(owner.roles.some((r) => r.name === 'seller')).toBe(false);
  });

  it('rejects approval when the dealer is not pending', async () => {
    const owner = { id: 'user-1', roles: [role('dealer')] } as User;
    const { service } = makeService(
      {
        id: 'dealer-1',
        ownerUserId: 'user-1',
        status: 'active',
      },
      owner,
    );

    await expect(service.approve('dealer-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
