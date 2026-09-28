import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { clientIp } from './rate-limit';

/**
 * ASVS 2.4.1 — Cloudflare Turnstile on public write endpoints.
 * Skips when TURNSTILE_SECRET_KEY is unset (local/tests).
 */
export async function assertTurnstile(opts: {
  token?: string;
  secret?: string;
  remoteIp?: string;
}): Promise<void> {
  const secret = opts.secret?.trim();
  if (!secret) return;

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
