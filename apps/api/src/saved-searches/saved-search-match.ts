export type SavedSearchMatchQuery = {
  q?: string;
  brandId?: string;
  modelId?: string;
  categoryId?: string;
  districtId?: string;
  cityId?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  condition?: string;
  fuelType?: string;
  transmission?: string;
  minMileage?: number;
  maxMileage?: number;
  minEngineCc?: number;
  maxEngineCc?: number;
  sellerType?: 'dealer' | 'private';
  negotiable?: boolean;
};

export type SavedSearchMatchListing = {
  title: string;
  brandId: string;
  modelId: string;
  categoryId: string;
  districtId: string;
  cityId: string;
  priceLkr: number;
  manufactureYear: number;
  condition: string;
  fuelType?: string | null;
  transmission?: string | null;
  mileage?: number | null;
  engineCc?: number | null;
  dealerId?: string | null;
  negotiable?: boolean;
};

function tokens(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

export function savedSearchMatchesListing(
  query: SavedSearchMatchQuery,
  listing: SavedSearchMatchListing,
): boolean {
  if (query.brandId && query.brandId !== listing.brandId) return false;
  if (query.modelId && query.modelId !== listing.modelId) return false;
  if (query.categoryId && query.categoryId !== listing.categoryId) return false;
  if (query.districtId && query.districtId !== listing.districtId) return false;
  if (query.cityId && query.cityId !== listing.cityId) return false;
  if (query.condition && query.condition !== listing.condition) return false;
  if (query.fuelType && query.fuelType !== listing.fuelType) return false;
  if (query.transmission && query.transmission !== listing.transmission) {
    return false;
  }
  if (query.minPrice != null && listing.priceLkr < query.minPrice) return false;
  if (query.maxPrice != null && listing.priceLkr > query.maxPrice) return false;
  if (query.minYear != null && listing.manufactureYear < query.minYear) {
    return false;
  }
  if (query.maxYear != null && listing.manufactureYear > query.maxYear) {
    return false;
  }
  if (query.minMileage != null && (listing.mileage ?? 0) < query.minMileage) {
    return false;
  }
  if (
    query.maxMileage != null &&
    (listing.mileage == null || listing.mileage > query.maxMileage)
  ) {
    return false;
  }
  if (
    query.minEngineCc != null &&
    (listing.engineCc ?? 0) < query.minEngineCc
  ) {
    return false;
  }
  if (
    query.maxEngineCc != null &&
    (listing.engineCc == null || listing.engineCc > query.maxEngineCc)
  ) {
    return false;
  }
  if (query.sellerType === 'dealer' && !listing.dealerId) return false;
  if (query.sellerType === 'private' && listing.dealerId) return false;
  if (query.negotiable != null && listing.negotiable !== query.negotiable) {
    return false;
  }
  if (query.q?.trim()) {
    const title = listing.title.toLowerCase();
    if (!tokens(query.q).every((token) => title.includes(token))) return false;
  }
  return true;
}
