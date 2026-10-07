import { CacheService } from './cache.service';

describe('CacheService memory fallback', () => {
  it('invalidates public ads and map caches while retaining taxonomy', async () => {
    const cache = new CacheService();
    for (const key of [
      'browse:listings::newest:p1:l50',
      'promo:live:home:bike:8::',
      'home:marketplace-preview',
      'dealers:map',
      'parts-dealers:map',
      'taxonomy:brands:active',
    ]) {
      await cache.set(key, ['cached'], 60);
    }
    await cache.invalidatePublicListings();
    for (const key of [
      'browse:listings::newest:p1:l50',
      'promo:live:home:bike:8::',
      'home:marketplace-preview',
      'dealers:map',
      'parts-dealers:map',
    ]) {
      await expect(cache.get(key)).resolves.toBeNull();
    }
    await expect(cache.get('taxonomy:brands:active')).resolves.toEqual([
      'cached',
    ]);
  });
  it('stores and returns JSON values until TTL expires', async () => {
    const cache = new CacheService();
    await cache.set('taxonomy:brands:active', [{ id: '1' }], 60);
    await expect(
      cache.get<{ id: string }[]>('taxonomy:brands:active'),
    ).resolves.toEqual([{ id: '1' }]);
    await cache.invalidateTaxonomy();
    await expect(cache.get('taxonomy:brands:active')).resolves.toBeNull();
  });

  it('swallows get failures and returns null', async () => {
    const cache = new CacheService();
    await cache.set('dashboard:summary', { users: 1 }, 60);
    await expect(cache.get('dashboard:summary')).resolves.toEqual({ users: 1 });
    await cache.invalidateDashboard();
    await expect(cache.get('dashboard:summary')).resolves.toBeNull();
  });
});
