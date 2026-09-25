export type OwnedDealer = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type OwnedDealerKind = 'bike' | 'parts';

const STATUS_RANK: Record<string, number> = {
  active: 0,
  pending: 1,
  suspended: 2,
  rejected: 3,
};

export function pickOwnedDealer<T extends { status: string }>(
  rows: T[] | null | undefined,
): T | null {
  if (!rows?.length) return null;
  return [...rows].sort(
    (a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9),
  )[0];
}

function publicBase(kind: OwnedDealerKind) {
  return kind === 'parts' ? 'parts-dealers' : 'dealers';
}

export function ownedDealerHref(
  locale: string,
  kind: OwnedDealerKind,
  dealer: Pick<OwnedDealer, 'slug' | 'status'>,
): string {
  if (dealer.status === 'active') {
    return `/${locale}/${publicBase(kind)}/${dealer.slug}`;
  }
  return `/${locale}/${publicBase(kind)}/apply`;
}

export function ownedDealerManageHref(
  locale: string,
  kind: OwnedDealerKind,
  dealer: Pick<OwnedDealer, 'status'>,
): string {
  if (dealer.status === 'active') {
    return kind === 'parts'
      ? `/${locale}/account/parts-showroom`
      : `/${locale}/account/showroom`;
  }
  return `/${locale}/${publicBase(kind)}/apply`;
}
