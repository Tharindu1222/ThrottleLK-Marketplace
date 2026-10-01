const SKIP_KEYS = new Set(['sort', 'page', 'limit', 'kind']);

/** Cache only the default browse pages. Filtered and deep pages stay live. */
export function browseCacheKey(
  prefix: string,
  filters: object,
  page: number,
  limit: number,
): string | null {
  if (page > 3) return null;
  for (const [key, value] of Object.entries(filters)) {
    if (SKIP_KEYS.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    return null;
  }
  const record = filters as { sort?: string; kind?: string };
  const sort = record.sort || 'newest';
  const kind = record.kind || '';
  return `browse:${prefix}:${kind}:${sort}:p${page}:l${limit}`;
}

type CacheReader = {
  get?: <T>(key: string) => Promise<T | null>;
  set?: (key: string, value: unknown, ttlSeconds: number) => Promise<void>;
};

export async function readBrowseCache<T>(
  cache: CacheReader,
  key: string | null,
): Promise<T | null> {
  if (!key || typeof cache.get !== 'function') return null;
  return cache.get<T>(key);
}

export async function writeBrowseCache(
  cache: CacheReader,
  key: string | null,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  if (!key || typeof cache.set !== 'function') return;
  await cache.set(key, value, ttlSeconds);
}
