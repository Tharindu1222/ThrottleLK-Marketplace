import { ForbiddenException } from '@nestjs/common';
import { assertTurnstile } from './turnstile';

describe('assertTurnstile', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('skips verification when no secret is configured', async () => {
    await expect(
      assertTurnstile({ token: undefined, secret: undefined }),
    ).resolves.toBeUndefined();
  });

  it('rejects a missing token when a secret is set', async () => {
    await expect(
      assertTurnstile({ token: undefined, secret: 'secret' }),
    ).rejects.toMatchObject({
      response: { error: { code: 'CAPTCHA_REQUIRED' } },
    });
  });

  it('rejects a failed siteverify response', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ success: false }),
    })) as unknown as typeof fetch;

    await expect(
      assertTurnstile({ token: 'bad', secret: 'secret' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts a successful siteverify response', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ success: true }),
    })) as unknown as typeof fetch;

    await expect(
      assertTurnstile({ token: 'ok-token', secret: 'secret', remoteIp: '1.1.1.1' }),
    ).resolves.toBeUndefined();
  });
});
