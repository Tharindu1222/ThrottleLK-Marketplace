import { classifyRefreshSession } from './refresh-reuse';

describe('classifyRefreshSession', () => {
  const future = new Date(Date.now() + 60_000);

  it('returns ok for a live unused session owned by the subject', () => {
    expect(
      classifyRefreshSession({
        session: {
          userId: 'user-1',
          revokedAt: null,
          expiresAt: future,
        },
        payloadSub: 'user-1',
      }),
    ).toBe('ok');
  });

  it('returns reuse when the session was already revoked', () => {
    expect(
      classifyRefreshSession({
        session: {
          userId: 'user-1',
          revokedAt: new Date(),
          expiresAt: future,
        },
        payloadSub: 'user-1',
      }),
    ).toBe('reuse');
  });

  it('returns invalid when the session is missing or belongs to another user', () => {
    expect(
      classifyRefreshSession({
        session: null,
        payloadSub: 'user-1',
      }),
    ).toBe('invalid');
    expect(
      classifyRefreshSession({
        session: {
          userId: 'other',
          revokedAt: null,
          expiresAt: future,
        },
        payloadSub: 'user-1',
      }),
    ).toBe('invalid');
  });
});
