export type QuotaAudience = 'private' | 'dealer' | 'parts';
export type PackageAudience = 'bike' | 'parts';

export type FreeQuota = {
  privateFreeListings: number;
  dealerFreeListings: number;
  partsFreeListings: number;
};

export const DEFAULT_FREE_QUOTA: FreeQuota = {
  privateFreeListings: 5,
  dealerFreeListings: 10,
  partsFreeListings: 10,
};

export function freeListingsFor(audience: QuotaAudience, quota: FreeQuota): number {
  if (audience === 'dealer') return quota.dealerFreeListings;
  if (audience === 'parts') return quota.partsFreeListings;
  return quota.privateFreeListings;
}

export function listingsRemaining(free: number, purchased: number, used: number): number {
  return Math.max(0, free + purchased - used);
}

/** Normal sellers use the private free quota. An active dealer uses the dealer quota. */
export function bikeQuotaAudience(isDealer: boolean): QuotaAudience {
  return isDealer ? 'dealer' : 'private';
}
