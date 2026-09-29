import { timingSafeEqual } from 'node:crypto';
import { Throttle } from '@nestjs/throttler';

/**
 * ASVS 2.4.1 / 6.3.1 — per-client-IP buckets (60s window).
 * Auth is tight against stuffing; writes/uploads are lower than public reads.
 */
export const RATE_LIMITS = {
  default: { ttl: 60_000, limit: 180 },
  auth: { ttl: 60_000, limit: 5 },
  login: { ttl: 60_000, limit: 8 },
  refresh: { ttl: 60_000, limit: 30 },
  write: { ttl: 60_000, limit: 30 },
  favourite: { ttl: 60_000, limit: 40 },
  upload: { ttl: 60_000, limit: 15 },
  contact: { ttl: 60_000, limit: 10 },
  messageStart: { ttl: 60_000, limit: 20 },
  messageReply: { ttl: 60_000, limit: 40 },
  report: { ttl: 60_000, limit: 5 },
  views: { ttl: 60_000, limit: 60 },
  dealerApply: { ttl: 60_000, limit: 8 },
  admin: { ttl: 60_000, limit: 90 },
} as const;

export type RateLimitKind = keyof typeof RATE_LIMITS;

export const INTERNAL_RATE_LIMIT_HEADER = 'x-throttlelk-internal';

export function RateLimit(kind: RateLimitKind) {
  return Throttle({ default: RATE_LIMITS[kind] });
}

export function isInternalApiRequest(
  headerValue: string | string[] | undefined,
  expected = process.env.INTERNAL_API_KEY,
): boolean {
  const key = expected?.trim();
  if (!key) return false;
  const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(key);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function headerString(
  headers: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  const raw = headers?.[name] ?? headers?.[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * True when the request looks like it passed Cloudflare's edge.
 * CF-Connecting-IP alone is forgeable; require CF-RAY as well, and only when
 * TRUST_PROXY is enabled (origin behind a reverse proxy).
 */
export function isCloudflareEdgeRequest(
  headers: Record<string, unknown> | undefined,
  trustProxy = process.env.TRUST_PROXY === 'true',
): boolean {
  if (!trustProxy) return false;
  return Boolean(
    headerString(headers, 'cf-connecting-ip') &&
      headerString(headers, 'cf-ray'),
  );
}

/**
 * Client IP for rate buckets. Prefer Cloudflare's connecting IP only when the
 * request carries CF-RAY under TRUST_PROXY; otherwise use Express `req.ip`.
 * Never take the leftmost XFF hop — clients can rotate that freely.
 */
export function clientIp(
  req: {
    ip?: string;
    ips?: string[];
    headers?: Record<string, unknown>;
    socket?: { remoteAddress?: string };
  },
  trustProxy = process.env.TRUST_PROXY === 'true',
): string {
  if (isCloudflareEdgeRequest(req.headers, trustProxy)) {
    const cf = headerString(req.headers, 'cf-connecting-ip');
    if (cf) return cf.split(',')[0]!.trim();
  }

  if (trustProxy) {
    if (req.ip?.trim()) return req.ip.trim();
    if (req.ips?.length) {
      return req.ips[0] ?? req.ips[req.ips.length - 1]!;
    }
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}
