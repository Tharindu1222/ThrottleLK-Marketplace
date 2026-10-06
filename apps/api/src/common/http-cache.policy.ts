export const PUBLIC_TAXONOMY_CACHE =
  'public, max-age=60, stale-while-revalidate=300';
export const PUBLIC_LIST_CACHE =
  'public, max-age=20, stale-while-revalidate=60';
export const PRIVATE_NO_STORE = 'private, no-store';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizePath(path: string): string {
  const clean = (path.split('?')[0] ?? '/').replace(/\/+$/, '') || '/';
  if (clean.startsWith('/api/v1')) return clean;
  return `/api/v1${clean.startsWith('/') ? clean : `/${clean}`}`;
}

function isPrivatePath(path: string): boolean {
  const privatePrefixes = [
    '/api/v1/auth',
    '/api/v1/users',
    '/api/v1/admin',
    '/api/v1/conversations',
    '/api/v1/notifications',
    '/api/v1/reports',
    '/api/v1/favourites',
    '/api/v1/part-favourites',
    '/api/v1/saved-searches',
    '/api/v1/listing-packages',
    '/api/v1/listings/mine',
    '/api/v1/part-listings/mine',
    '/api/v1/dealers/mine',
    '/api/v1/parts-dealers/mine',
  ];
  if (privatePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return true;
  }
  const listingDetail = path.match(/^\/api\/v1\/(?:listings|part-listings)\/([^/]+)/);
  if (listingDetail && listingDetail[1] && UUID.test(listingDetail[1])) {
    return true;
  }
  return false;
}

function isTaxonomyPath(path: string): boolean {
  return (
    path === '/api/v1/brands' ||
    path.startsWith('/api/v1/brands/') ||
    path === '/api/v1/categories' ||
    path === '/api/v1/part-categories' ||
    path === '/api/v1/part-listings/categories' ||
    path.startsWith('/api/v1/locations/districts') ||
    path.startsWith('/api/v1/models/')
  );
}

function isPublicPromoPath(path: string): boolean {
  return (
    path === '/api/v1/promotions/live' || path === '/api/v1/promotions/packages'
  );
}

function isPublicListPath(path: string): boolean {
  return (
    path === '/api/v1/listings' ||
    path === '/api/v1/part-listings' ||
    path === '/api/v1/spare-parts' ||
    path === '/api/v1/modified-parts' ||
    path === '/api/v1/rider-accessories' ||
    path === '/api/v1/home/marketplace-preview' ||
    path === '/api/v1/listings/seo-slugs' ||
    path === '/api/v1/part-listings/seo-slugs' ||
    path === '/api/v1/dealers' ||
    path === '/api/v1/dealers/map' ||
    path === '/api/v1/dealers/seo-slugs' ||
    path === '/api/v1/parts-dealers' ||
    path === '/api/v1/parts-dealers/map' ||
    path === '/api/v1/parts-dealers/seo-slugs'
  );
}

export function cacheControlForRequest(input: {
  method: string;
  path: string;
  search: string;
  hasAuthCookie: boolean;
  hasAuthorization: boolean;
}): string {
  const method = input.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return PRIVATE_NO_STORE;

  const path = normalizePath(input.path);
  const search = input.search.startsWith('?')
    ? input.search
    : input.search
      ? `?${input.search}`
      : '';
  if (/[?&](?:search|q)=/i.test(search)) return PRIVATE_NO_STORE;

  // Catalog bodies do not change per user, so a logged-in cookie can still
  // be served from the shared cache.
  if (isTaxonomyPath(path)) return PUBLIC_TAXONOMY_CACHE;
  if (isPublicListPath(path) || isPublicPromoPath(path)) return PUBLIC_LIST_CACHE;

  if (input.hasAuthCookie || input.hasAuthorization) return PRIVATE_NO_STORE;
  if (isPrivatePath(path) || path.startsWith('/api/v1/promotions')) {
    return PRIVATE_NO_STORE;
  }
  return PRIVATE_NO_STORE;
}

export function requestHasAuthCookie(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  return /(?:^|;\s*)(?:__Host-)?tlk_(?:access|refresh)=/.test(cookieHeader);
}
