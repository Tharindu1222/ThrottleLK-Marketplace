import type { PaginationMeta } from '@throttlelk/types';

export function parsePageParam(value: string | string[] | null | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export function hrefWithPage(
  pathname: string,
  current: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (key === 'page') continue;
    if (value) params.set(key, value);
  }
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function clampedPage(
  meta: PaginationMeta | undefined,
  itemCount: number,
): number | null {
  if (!meta) return null;
  if (itemCount === 0 && meta.page > 1) {
    return Math.max(1, Math.min(meta.page - 1, meta.totalPages));
  }
  if (meta.page > meta.totalPages) return meta.totalPages;
  return null;
}

export const emptyMeta: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};
