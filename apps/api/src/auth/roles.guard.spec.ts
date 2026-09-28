import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '../users/user.entity';
import { RolesGuard } from './roles.guard';

function contextFor(user: Partial<User> | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(() => ['admin']),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  it('allows an admin', () => {
    expect(
      guard.canActivate(
        contextFor({
          roles: [{ name: 'admin' } as never],
        }),
      ),
    ).toBe(true);
  });

  it('rejects a non-admin', () => {
    expect(() =>
      guard.canActivate(
        contextFor({
          roles: [{ name: 'buyer' } as never],
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
