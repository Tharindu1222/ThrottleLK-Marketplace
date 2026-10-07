import { saveSession, type AuthUser } from './auth';

let pending: Promise<boolean> | null = null;

async function refreshUnderLock(): Promise<boolean> {
  // Another tab may have refreshed while this tab waited for the lock.
  const current = await fetch('/api/v1/users/me', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (current.ok) return true;
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) return false;
  const json = (await response.json()) as {
    success: boolean;
    data?: { user: AuthUser };
  };
  if (!json.success || !json.data?.user) return false;
  saveSession(json.data);
  return true;
}

/** Deduplicates refreshes in this tab and serializes rotating cookies across tabs. */
export function refreshBrowserSession(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (pending) return pending;
  const run = (async () => {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return await navigator.locks.request(
        'throttlelk-session-refresh',
        refreshUnderLock,
      );
    }
    return await refreshUnderLock();
  })();
  const promise = run
    .catch(() => false)
    .finally(() => {
      pending = null;
    });
  pending = promise;
  return promise;
}
