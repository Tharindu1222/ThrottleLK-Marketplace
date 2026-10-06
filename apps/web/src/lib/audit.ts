export function auditActionLabel(action: string) {
  const words = action.replaceAll(/[._]/g, ' ').trim();
  if (!words) return 'Action';
  return words.replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

export function auditActorLabel(name?: string | null) {
  const trimmed = name?.trim();
  return trimmed || 'Unknown admin';
}

export const AUDIT_AREA_FILTERS = [
  { id: '', label: 'All' },
  { id: 'listings', label: 'Listings' },
  { id: 'parts', label: 'Parts' },
  { id: 'taxonomy', label: 'Taxonomy' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'monetize', label: 'Monetize' },
  { id: 'reports', label: 'Reports' },
  { id: 'users', label: 'Users' },
] as const;

const AREA_LABEL: Record<string, string> = {
  listings: 'Listings',
  parts: 'Parts',
  taxonomy: 'Taxonomy',
  promotions: 'Promotions',
  monetize: 'Monetize',
  users: 'Users',
  reports: 'Reports',
};

const AREA_TYPES: Record<string, readonly string[]> = {
  listings: ['listing', 'dealer'],
  parts: ['part_listing', 'parts_dealer', 'part_category'],
  taxonomy: ['brand', 'model', 'district', 'city', 'category'],
  promotions: ['promo_request', 'promo_placement'],
  monetize: ['promo_package', 'promo_bank_account', 'promo_settings', 'listing_package'],
  users: ['user'],
  reports: ['report'],
};

export function auditAreaId(entityType?: string | null, area?: string | null) {
  if (area && AREA_LABEL[area]) return area;
  if (!entityType) return 'other';
  for (const [id, types] of Object.entries(AREA_TYPES)) {
    if (types.includes(entityType)) return id;
  }
  return 'other';
}

export function auditAreaLabel(area?: string | null, entityType?: string | null) {
  return AREA_LABEL[auditAreaId(entityType, area)] ?? 'Other';
}
