import { apiGet } from '@/lib/api';

const CACHE_MS = 15_000;

let inflight: Promise<string[]> | null = null;
let cache: { token: string; ids: string[]; at: number } | null = null;

export function loadPartFavouriteIds(token: string): Promise<string[]> {
  const now = Date.now();
  if (cache && cache.token === token && now - cache.at < CACHE_MS) {
    return Promise.resolve(cache.ids);
  }
  if (!inflight) {
    inflight = apiGet<string[]>('/api/v1/part-favourites/ids', { token })
      .then((ids) => {
        cache = { token, ids, at: Date.now() };
        return ids;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function patchPartFavouriteIdsCache(
  token: string,
  partListingId: string,
  add: boolean,
) {
  if (!cache || cache.token !== token) {
    cache = { token, ids: add ? [partListingId] : [], at: Date.now() };
    return;
  }
  const set = new Set(cache.ids);
  if (add) set.add(partListingId);
  else set.delete(partListingId);
  cache = { token, ids: [...set], at: Date.now() };
}
