export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export function parsePageLimit(input: {
  page?: string | number;
  limit?: string | number;
  defaultLimit?: number;
  maxLimit?: number;
}): { page: number; limit: number; skip: number } {
  const defaultLimit = input.defaultLimit ?? 20;
  const maxLimit = input.maxLimit ?? 100;
  const rawPage = Number(input.page ?? 1);
  const rawLimit = Number(input.limit ?? defaultLimit);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(maxLimit, Math.max(1, Math.floor(rawLimit)))
    : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(Math.max(total, 0) / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages && total > 0,
    hasPreviousPage: page > 1 && total > 0,
  };
}

/** Page to load after a mutation if the requested page is now empty/beyond the end. */
export function clampedPage(
  meta: PaginationMeta,
  itemCount: number,
): number {
  if (itemCount === 0 && meta.page > 1) {
    return Math.max(1, Math.min(meta.page - 1, meta.totalPages));
  }
  if (meta.page > meta.totalPages) return meta.totalPages;
  return meta.page;
}
