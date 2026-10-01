import { cacheControlForRequest } from './http-cache.policy';

const PUBLIC_TAXONOMY = 'public, max-age=60, stale-while-revalidate=300';
const PUBLIC_LIST = 'public, max-age=20, stale-while-revalidate=60';
const PRIVATE = 'private, no-store';

describe('cacheControlForRequest', () => {
  it('caches anonymous taxonomy GETs and short-caches public listing collections', () => {
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/brands',
        search: '',
        hasAuthCookie: false,
        hasAuthorization: false,
      }),
    ).toBe(PUBLIC_TAXONOMY);
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/categories',
        search: '?scope=public',
        hasAuthCookie: false,
        hasAuthorization: false,
      }),
    ).toBe(PUBLIC_TAXONOMY);
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/listings',
        search: '?page=1',
        hasAuthCookie: false,
        hasAuthorization: false,
      }),
    ).toBe(PUBLIC_LIST);
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/part-listings',
        search: '',
        hasAuthCookie: false,
        hasAuthorization: false,
      }),
    ).toBe(PUBLIC_LIST);
  });

  it('caches public catalog reads even when a session cookie is present', () => {
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/brands',
        search: '',
        hasAuthCookie: true,
        hasAuthorization: false,
      }),
    ).toBe(PUBLIC_TAXONOMY);
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/listings',
        search: '?page=1',
        hasAuthCookie: true,
        hasAuthorization: false,
      }),
    ).toBe(PUBLIC_LIST);
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/promotions/live',
        search: '?surface=browse&kind=bike',
        hasAuthCookie: false,
        hasAuthorization: false,
      }),
    ).toBe(PUBLIC_LIST);
  });

  it('never caches mutating or private routes', () => {
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/users/me',
        search: '',
        hasAuthCookie: false,
        hasAuthorization: false,
      }),
    ).toBe(PRIVATE);
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/listings/a1b2c3d4-e5f6-4111-8111-111111111111',
        search: '',
        hasAuthCookie: false,
        hasAuthorization: false,
      }),
    ).toBe(PRIVATE);
    expect(
      cacheControlForRequest({
        method: 'POST',
        path: '/api/v1/listings',
        search: '',
        hasAuthCookie: false,
        hasAuthorization: false,
      }),
    ).toBe(PRIVATE);
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/admin/dashboard',
        search: '',
        hasAuthCookie: false,
        hasAuthorization: false,
      }),
    ).toBe(PRIVATE);
  });

  it('does not cache taxonomy search queries', () => {
    expect(
      cacheControlForRequest({
        method: 'GET',
        path: '/api/v1/brands',
        search: '?search=honda',
        hasAuthCookie: false,
        hasAuthorization: false,
      }),
    ).toBe(PRIVATE);
  });
});
