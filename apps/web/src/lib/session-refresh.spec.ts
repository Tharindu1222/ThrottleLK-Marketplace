import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { apiGet, apiSend } from './api';
import { middleware } from '../middleware';

const originalFetch = globalThis.fetch;
const originals = ['window', 'localStorage', 'navigator'].map(
  (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
);
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
function browser() {
  const redirects: string[] = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: {
        origin: 'http://localhost',
        pathname: '/en/account/listings',
        search: '',
        assign: (url: string) => redirects.push(url),
      },
      dispatchEvent: () => {},
    },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { setItem: () => {}, removeItem: () => {} },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      locks: {
        request: (_name: string, callback: () => unknown) =>
          Promise.resolve(callback()),
      },
    },
  });
  return redirects;
}
const response = (status: number, data: unknown = {}) =>
  new Response(JSON.stringify({ success: status === 200, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
test('account navigation allows a refresh-only cookie and redirects when no session exists', () => {
  assert.equal(
    middleware(
      new NextRequest('http://localhost/en/account/listings', {
        headers: { cookie: 'tlk_refresh=valid' },
      }),
    ).status,
    200,
  );
  assert.equal(
    middleware(new NextRequest('http://localhost/en/account/listings')).status,
    307,
  );
});
test('concurrent expired requests share one refresh and retry the original action', async () => {
  const redirects = browser();
  let refreshed = false;
  let refreshes = 0;
  const attempts: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/auth/refresh')) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      refreshed = true;
      return response(200, {
        user: {
          id: 'seller',
          firstName: 'QA',
          lastName: 'Seller',
          roles: ['seller'],
        },
      });
    }
    if (url.includes('/users/me')) return response(refreshed ? 200 : 401);
    attempts.push(`${init?.method ?? 'GET'}:${init?.body ?? ''}`);
    return response(refreshed ? 200 : 401, { saved: true });
  };
  const [read, saved] = await Promise.all([
    apiGet('/api/v1/listings/mine'),
    apiSend('/api/v1/listings/qa', {
      method: 'PATCH',
      body: { mileage: 0 },
      token: 'cookie',
    }),
  ]);
  assert.equal(refreshes, 1);
  assert.deepEqual(read, { saved: true });
  assert.deepEqual(saved, { saved: true });
  assert.equal(
    attempts.filter((value) => value === 'PATCH:{"mileage":0}').length,
    2,
  );
  assert.deepEqual(redirects, []);
});
test('a failed refresh redirects once the protected request is rejected', async () => {
  const redirects = browser();
  globalThis.fetch = async () => response(401);
  await assert.rejects(apiGet('/api/v1/listings/mine'));
  assert.equal(redirects.length, 1);
});
test('login failures do not trigger refresh or redirect', async () => {
  const redirects = browser();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return response(401);
  };
  await assert.rejects(
    apiSend('/api/v1/auth/login', { body: { email: 'qa@example.com' } }),
  );
  assert.equal(calls, 1);
  assert.deepEqual(redirects, []);
});
