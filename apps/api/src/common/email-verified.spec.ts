import { ForbiddenException } from '@nestjs/common';
import { assertEmailVerified } from './email-verified';

describe('assertEmailVerified', () => {
  it('allows a verified user', () => {
    expect(() =>
      assertEmailVerified(
        { emailVerifiedAt: new Date() },
        'starting a conversation',
      ),
    ).not.toThrow();
  });

  it('rejects an unverified user', () => {
    expect(() =>
      assertEmailVerified({ emailVerifiedAt: null }, 'starting a conversation'),
    ).toThrow(ForbiddenException);
    try {
      assertEmailVerified({ emailVerifiedAt: null }, 'starting a conversation');
    } catch (err) {
      expect(err).toMatchObject({
        response: { error: { code: 'EMAIL_UNVERIFIED' } },
      });
    }
  });
});
