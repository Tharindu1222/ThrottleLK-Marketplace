import type { ApiSuccess, ApiErrorBody } from '@throttlelk/types';

/**
 * Prefer NEXT_PUBLIC_API_URL in the browser; on the server allow
 * API_INTERNAL_URL / API_URL overrides (e.g. future container SSR).
 */
function resolveApiUrl(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.API_INTERNAL_URL ??
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:3001'
    );
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody | null,
  ) {
    super(body?.error?.message ?? `API error ${status}`);
  }
}

const ACCESS_KEY = 'throttlelk_access';
const REFRESH_KEY = 'throttlelk_refresh';
const USER_KEY = 'throttlelk_user';

const AUTH_NO_REDIRECT_CODES = new Set([
  'INVALID_CREDENTIALS',
  'ACCOUNT_DISABLED',
]);

function clearClientSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

/** On browser 401s (expired/invalid session), send user to login. */
function redirectToLoginIfUnauthorized(
  path: string,
  status: number,
  body: ApiErrorBody | null,
) {
  if (typeof window === 'undefined') return;
  if (status !== 401) return;

  const code = body?.error?.code;
  if (code && AUTH_NO_REDIRECT_CODES.has(code)) return;

  const normalized = path.toLowerCase();
  if (
    normalized.includes('/auth/login') ||
    normalized.includes('/auth/register') ||
    normalized.includes('/auth/refresh') ||
    normalized.includes('/auth/forgot') ||
    normalized.includes('/auth/reset')
  ) {
    return;
  }

  const pathname = window.location.pathname;
  if (pathname.includes('/login')) return;

  clearClientSession();
  const locale = pathname.split('/').filter(Boolean)[0] || 'en';
  const next = encodeURIComponent(`${pathname}${window.location.search}`);
  window.location.assign(`/${locale}/login?next=${next}`);
}

function throwApiError(
  path: string,
  status: number,
  body: ApiErrorBody | null,
): never {
  redirectToLoginIfUnauthorized(path, status, body);
  throw new ApiRequestError(status, body);
}

export async function apiGet<T>(
  path: string,
  init?: { token?: string; searchParams?: Record<string, string | undefined> },
): Promise<T> {
  const base = resolveApiUrl();
  const url = new URL(path.startsWith('http') ? path : `${base}${path}`);
  if (init?.searchParams) {
    for (const [key, value] of Object.entries(init.searchParams)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  const res = await fetch(url, {
    headers: {
      ...(init?.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    cache: 'no-store',
  });
  const json = (await res.json()) as ApiSuccess<T> | ApiErrorBody;
  if (!res.ok || !('success' in json) || !json.success) {
    throwApiError(path, res.status, json as ApiErrorBody);
  }
  return json.data;
}

export async function apiSend<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  },
): Promise<T> {
  const res = await fetch(`${resolveApiUrl()}${path}`, {
    method: options.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });
  const json = (await res.json()) as ApiSuccess<T> | ApiErrorBody;
  if (!res.ok || !('success' in json) || !json.success) {
    throwApiError(path, res.status, json as ApiErrorBody);
  }
  return json.data;
}

export async function apiUpload<T>(
  path: string,
  file: File,
  token: string,
): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${resolveApiUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
    cache: 'no-store',
  });
  const json = (await res.json()) as ApiSuccess<T> | ApiErrorBody;
  if (!res.ok || !('success' in json) || !json.success) {
    throwApiError(path, res.status, json as ApiErrorBody);
  }
  return json.data;
}

export { resolveApiUrl };
