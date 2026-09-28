import {
  computeExpiresAt,
  isPastExpiry,
  isPubliclyListed,
  listingActiveDays,
} from './listing-expiry';

describe('listing expiry helpers', () => {
  it('defaults to 60 days and rejects invalid env', () => {
    expect(listingActiveDays({})).toBe(60);
    expect(listingActiveDays({ LISTING_ACTIVE_DAYS: '90' })).toBe(90);
    expect(listingActiveDays({ LISTING_ACTIVE_DAYS: '0' })).toBe(60);
  });

  it('computes expiry from a start date', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    expect(computeExpiresAt(from, 30).toISOString()).toBe(
      '2026-01-31T00:00:00.000Z',
    );
  });

  it('detects past expiry', () => {
    const now = new Date('2026-03-01T00:00:00.000Z');
    expect(isPastExpiry(new Date('2026-02-01T00:00:00.000Z'), now)).toBe(true);
    expect(isPastExpiry(new Date('2026-03-02T00:00:00.000Z'), now)).toBe(false);
    expect(isPastExpiry(null, now)).toBe(false);
  });

  it('hides active listings that have already expired', () => {
    const now = new Date('2026-03-01T00:00:00.000Z');
    expect(
      isPubliclyListed('active', new Date('2026-02-01T00:00:00.000Z'), now),
    ).toBe(false);
    expect(
      isPubliclyListed('active', new Date('2026-03-02T00:00:00.000Z'), now),
    ).toBe(true);
    expect(isPubliclyListed('sold', new Date('2026-02-01T00:00:00.000Z'), now)).toBe(
      true,
    );
    expect(isPubliclyListed('draft', null, now)).toBe(false);
  });
});
