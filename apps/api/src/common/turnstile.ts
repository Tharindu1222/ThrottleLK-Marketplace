import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { clientIp } from './rate-limit';

/**
 * ASVS 2.4.1 — Cloudflare Turnstile on public write endpoints.
 * Skips when TURNSTILE_SECRET_KEY is unset (local/tests).
 * Production must set a secret at boot via requireTurnstileSecret().
 */
export function requireTurnstileSecret(
  env: Record<string, string | undefined>,
  options?: { production?: boolean },
) {
  const production =
    options?.production ??
    (env.NODE_ENV ?? process.env.NODE_ENV) === 'production';
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (production && !secret) {
    throw new Error('TURNSTILE_SECRET_KEY must be set in production');
  }
  return secret || undefined;
}

export async function assertTurnstile(opts: {
  token?: string;
  secret?: string;
  remoteIp?: string;
  production?: boolean;
}): Promise<void> {
  const production =
    opts.production ?? (process.env.NODE_ENV ?? '') === 'production';
  const secret = opts.secret?.trim();
  if (!secret) {
    if (production) {
      throw new Error('TURNSTILE_SECRET_KEY must be set in production');
    }
    return;
  }

  const token = opts.token?.trim();
  if (!token) {
    throw new ForbiddenException({
      success: false,
      error: {
        code: 'CAPTCHA_REQUIRED',
        message: 'Complete the CAPTCHA',
      },
    });
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (opts.remoteIp) body.set('remoteip', opts.remoteIp);

  const res = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  );
  const json = (await res.json()) as { success?: boolean };
  if (!json.success) {
    throw new ForbiddenException({
      success: false,
      error: {
        code: 'CAPTCHA_FAILED',
        message: 'CAPTCHA verification failed',
      },
    });
  }
}

export async function assertRequestCaptcha(req: Request, token?: string) {
  await assertTurnstile({
    token,
    secret: process.env.TURNSTILE_SECRET_KEY,
    remoteIp: clientIp(req),
  });
}
