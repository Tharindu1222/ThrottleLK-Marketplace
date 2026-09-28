import type { CookieOptions } from 'express';

export function authCookieNames(production: boolean) {
  return {
    access: production ? '__Host-tlk_access' : 'tlk_access',
    refresh: production ? '__Host-tlk_refresh' : 'tlk_refresh',
  };
}

export function authCookieOptions(input: {
  production: boolean;
  maxAgeMs: number;
}): CookieOptions {
  return {
    httpOnly: true,
    secure: input.production,
    sameSite: 'lax',
    path: '/',
    maxAge: input.maxAgeMs,
  };
}

export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

export function isProductionEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV === 'production';
}
