import type { PaginationMeta } from '@throttlelk/types';

export type DealerKind = 'bike' | 'parts';
export type DealerDirectoryType = 'all' | DealerKind;

export type DealerCard = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  coverImageUrl: string | null;
  verifiedAt?: string | null;
  city?: { name: string } | null;
  district?: { name: string } | null;
  kind: DealerKind;
};

export function parseDealerDirectoryType(
  value: string | undefined,
): DealerDirectoryType {
  if (value === 'parts' || value === 'bike') return value;
  return 'all';
}

export function dealerTypeQuery(
  type: DealerDirectoryType,
): string | undefined {
  return type === 'all' ? undefined : type;
}

export function mergeDealerCards(
  bikes: Omit<DealerCard, 'kind'>[],
  parts: Omit<DealerCard, 'kind'>[],
): DealerCard[] {
  return [
    ...bikes.map((dealer) => ({ ...dealer, kind: 'bike' as const })),
    ...parts.map((dealer) => ({ ...dealer, kind: 'parts' as const })),
  ].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function paginateDealerCards(
  items: DealerCard[],
  page: number,
  limit: number,
): { data: DealerCard[]; meta: PaginationMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages && total > 0,
      hasPreviousPage: safePage > 1 && total > 0,
    },
  };
}
