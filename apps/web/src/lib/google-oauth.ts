import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const GOOGLE_OAUTH_COOKIE = 'tlk_google_oauth';
const COOKIE_MAX_AGE_SECONDS = 10 * 60;

export type GoogleOauthState = {
  state: string;
  nonce: string;
  codeVerifier: string;
  next?: string;
  locale: 'en' | 'si';
};

export function webBaseUrl(): string {
  return (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/** App redirects stay on WEB_URL so a bind address like 0.0.0.0 is not an open redirect. */
export function appUrl(path: string): URL {
  const base = webBaseUrl();
  if (!path.startsWith('/') || path.startsWith('//')) {
    return new URL('/', base);
  }
  return new URL(path, base);
}

/** Must match the redirect URI registered in Google Cloud. No locale prefix. */
export function googleRedirectUri(): string {
  return `${webBaseUrl()}/auth/google/callback`;
}

export function internalApiBase(): string {
  const raw =
    process.env.API_INTERNAL_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001';
  return raw.replace(/\/$/, '');
}

export function createOauthSecrets(): {
  state: string;
  nonce: string;
  codeVerifier: string;
  codeChallenge: string;
} {
  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { state, nonce, codeVerifier, codeChallenge };
}

export function encodeOauthCookie(value: GoogleOauthState): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeOauthCookie(raw: string | undefined): GoogleOauthState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    ) as Partial<GoogleOauthState>;
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.nonce !== 'string' ||
      typeof parsed.codeVerifier !== 'string' ||
      (parsed.locale !== 'en' && parsed.locale !== 'si')
    ) {
      return null;
    }
    return {
      state: parsed.state,
      nonce: parsed.nonce,
      codeVerifier: parsed.codeVerifier,
      next: typeof parsed.next === 'string' ? parsed.next : undefined,
      locale: parsed.locale,
    };
  } catch {
    return null;
  }
}

export function oauthCookieHeader(value: string, maxAge = COOKIE_MAX_AGE_SECONDS): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${GOOGLE_OAUTH_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearOauthCookieHeader(): string {
  return oauthCookieHeader('', 0);
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function parseLocale(value: string | null | undefined): 'en' | 'si' {
  return value === 'si' ? 'si' : 'en';
}

export function localeFromNextPath(next: string | undefined): 'en' | 'si' | null {
  if (!next) return null;
  if (next === '/si' || next.startsWith('/si/')) return 'si';
  if (next === '/en' || next.startsWith('/en/')) return 'en';
  return null;
}
