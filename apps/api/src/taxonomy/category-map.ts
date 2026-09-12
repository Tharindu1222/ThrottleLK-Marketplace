/**
 * Maps seed/defaultCategory labels → public marketplace category names.
 * Source taxonomy (e.g. Commuter) is preserved on bike_models.default_category.
 */
export const PUBLIC_CATEGORY_MAP: Record<string, string> = {
  Scooters: 'Scooters',
  Scooter: 'Scooters',
  'Street Bikes': 'Street Bikes',
  'High Capacity Bikes': 'High Capacity Bikes',
  'Trail Bikes': 'Trail Bikes',
  'Classic Bikes': 'Classic Bikes',
  'Electric Bikes': 'Electric Bikes',
  Electric: 'Electric Bikes',
  Commuter: 'Street Bikes',
  Sports: 'Street Bikes',
  Cruiser: 'Classic Bikes',
  Adventure: 'Trail Bikes',
  'Dual-sport': 'Trail Bikes',
  Other: 'Street Bikes',
};

export const PUBLIC_CATEGORY_SEEDS = [
  'Scooters',
  'Street Bikes',
  'High Capacity Bikes',
  'Trail Bikes',
  'Classic Bikes',
  'Electric Bikes',
] as const;

/** Kept in DB for seed taxonomy / admin; not shown on homepage or sell form */
export const INTERNAL_CATEGORY_SEEDS = ['Commuter', 'Other'] as const;

export const PUBLIC_CATEGORY_SLUGS = [
  'scooters',
  'street-bikes',
  'high-capacity-bikes',
  'trail-bikes',
  'classic-bikes',
  'electric-bikes',
] as const;

export function mapToPublicCategory(defaultCategory: string | null | undefined): string | null {
  if (!defaultCategory) return null;
  return PUBLIC_CATEGORY_MAP[defaultCategory] ?? defaultCategory;
}

export function normalizeFuelType(
  fuel: string | null | undefined,
): 'petrol' | 'electric' | 'other' | null {
  if (!fuel) return null;
  const n = fuel.trim().toLowerCase();
  if (n === 'petrol' || n === 'gasoline') return 'petrol';
  if (n === 'electric') return 'electric';
  return 'other';
}
