import { apiGet } from '@/lib/api';

const CACHE_MS = 15_000;

let inflight: Promise<string[]> | null = null;
let cache: { token: string; ids: string[]; at: number } | null = null;

export function loadFavouriteIds(token: string): Promise<string[]> {
  const now = Date.now();
  if (cache && cache.token === token && now - cache.at < CACHE_MS) {
    return Promise.resolve(cache.ids);
  }
  if (!inflight) {
    inflight = apiGet<string[]>('/api/v1/favourites/ids', { token })
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

export function patchFavouriteIdsCache(token: string, listingId: string, add: boolean) {
  if (!cache || cache.token !== token) {
    cache = { token, ids: add ? [listingId] : [], at: Date.now() };
    return;
  }
  const set = new Set(cache.ids);
  if (add) set.add(listingId);
  else set.delete(listingId);
  cache = { token, ids: [...set], at: Date.now() };
}
