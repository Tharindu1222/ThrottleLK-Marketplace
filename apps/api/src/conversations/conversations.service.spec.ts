import { ConversationsService } from './conversations.service';
import type { User } from '../users/user.entity';

describe('ConversationsService', () => {
  it('exports service class', () => {
    expect(ConversationsService).toBeDefined();
  });

  it('documents participant roles', () => {
    const roles = ['buyer', 'seller'];
    expect(roles).toContain('buyer');
    expect(roles).not.toContain('guest');
  });
});

describe('ConversationsService.start email verification', () => {
  it('rejects unverified buyers before opening a thread', async () => {
    const usersService = {
      findByIdOrThrow: jest.fn(async () => ({
        id: 'buyer-1',
        emailVerifiedAt: null,
      } as User)),
    };
    const listings = { findOne: jest.fn() };
    const service = new ConversationsService(
      {} as never,
      {} as never,
      listings as never,
      {} as never,
      {} as never,
      usersService as never,
    );

    await expect(
      service.start('buyer-1', {
        listingId: '11111111-1111-4111-8111-111111111111',
        message: 'Is this still available?',
      }),
    ).rejects.toMatchObject({
      response: { error: { code: 'EMAIL_UNVERIFIED' } },
    });
    expect(listings.findOne).not.toHaveBeenCalled();
  });
});
