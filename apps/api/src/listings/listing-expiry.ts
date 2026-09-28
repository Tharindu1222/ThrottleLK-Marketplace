const DEFAULT_ACTIVE_DAYS = 60;

export function listingActiveDays(env = process.env): number {
  const raw = Number(env.LISTING_ACTIVE_DAYS ?? DEFAULT_ACTIVE_DAYS);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_ACTIVE_DAYS;
  return Math.floor(raw);
}

export function computeExpiresAt(from: Date, days = listingActiveDays()): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isPastExpiry(expiresAt: Date | null | undefined, now = new Date()) {
  return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}

/** Active ads past expiresAt are treated as gone; sold ads stay public. */
export function isPubliclyListed(
  status: string,
  expiresAt?: Date | null,
  now = new Date(),
) {
  if (status === 'sold') return true;
  return status === 'active' && !isPastExpiry(expiresAt, now);
}
