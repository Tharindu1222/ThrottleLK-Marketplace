import { ForbiddenException } from '@nestjs/common';
import { assertTurnstile, requireTurnstileSecret } from './turnstile';

describe('requireTurnstileSecret', () => {
  it('allows an unset secret outside production', () => {
    expect(
      requireTurnstileSecret({}, { production: false }),
    ).toBeUndefined();
  });

  it('refuses to boot in production when TURNSTILE_SECRET_KEY is unset', () => {
    expect(() =>
      requireTurnstileSecret({ NODE_ENV: 'production' }, { production: true }),
    ).toThrow(/TURNSTILE_SECRET_KEY/);
    expect(() =>
      requireTurnstileSecret(
        { NODE_ENV: 'production', TURNSTILE_SECRET_KEY: '   ' },
        { production: true },
      ),
    ).toThrow(/TURNSTILE_SECRET_KEY/);
  });

  it('returns the trimmed secret in production', () => {
    expect(
      requireTurnstileSecret(
        { TURNSTILE_SECRET_KEY: ' site-secret ' },
        { production: true },
      ),
    ).toBe('site-secret');
  });
});

describe('assertTurnstile', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('skips verification when no secret is configured outside production', async () => {
    await expect(
      assertTurnstile({
        token: undefined,
        secret: undefined,
        production: false,
      }),
    ).resolves.toBeUndefined();
  });

  it('fails closed in production when no secret is configured', async () => {
    await expect(
      assertTurnstile({
        token: 'any',
        secret: undefined,
        production: true,
      }),
    ).rejects.toThrow(/TURNSTILE_SECRET_KEY/);
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
