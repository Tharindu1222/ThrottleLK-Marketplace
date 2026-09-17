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
  return Boolean(provided && provided === key);
}

export function clientIp(
  req: {
    ip?: string;
    ips?: string[];
    headers?: Record<string, unknown>;
    socket?: { remoteAddress?: string };
  },
  trustProxy = process.env.TRUST_PROXY === 'true',
): string {
  if (trustProxy) {
    const forwarded = req.headers?.['x-forwarded-for'];
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const first =
      typeof raw === 'string' ? raw.split(',')[0]?.trim() : undefined;
    if (first) return first;
    if (req.ips?.[0]) return req.ips[0];
  }
  return req.ip || req.ips?.[0] || req.socket?.remoteAddress || 'unknown';
}
