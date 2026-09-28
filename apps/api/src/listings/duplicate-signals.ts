export type DuplicateListingRef = {
  id: string;
  sellerId: string;
  modelId: string;
  manufactureYear: number | null;
  phone: string | null;
  title: string;
};

export type DuplicateReason =
  | 'same_seller_model_year'
  | 'same_phone_model'
  | 'same_title'
  | 'similar_title';

export function normalizeListingTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s\u0d80-\u0dff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function digits(phone: string | null): string {
  return (phone ?? '').replace(/\D/g, '').slice(-9);
}

function titleOverlap(a: string, b: string): boolean {
  const left = new Set(normalizeListingTitle(a).split(' ').filter((w) => w.length > 2));
  const right = normalizeListingTitle(b).split(' ').filter((w) => w.length > 2);
  if (left.size === 0 || right.length === 0) return false;
  const hits = right.filter((w) => left.has(w)).length;
  return hits / Math.max(left.size, right.length) >= 0.7;
}

export function duplicateReasons(
  current: DuplicateListingRef,
  other: DuplicateListingRef,
): DuplicateReason[] {
  if (current.id === other.id) return [];
  const reasons: DuplicateReason[] = [];
  if (
    current.sellerId === other.sellerId &&
    current.modelId === other.modelId &&
    current.manufactureYear != null &&
    current.manufactureYear === other.manufactureYear
  ) {
    reasons.push('same_seller_model_year');
  }
  const phone = digits(current.phone);
  if (
    phone.length >= 9 &&
    phone === digits(other.phone) &&
    current.modelId === other.modelId
  ) {
    reasons.push('same_phone_model');
  }
  const a = normalizeListingTitle(current.title);
  const b = normalizeListingTitle(other.title);
  if (a && a === b) {
    reasons.push('same_title');
  } else if (titleOverlap(current.title, other.title)) {
    reasons.push('similar_title');
  }
  return reasons;
}
