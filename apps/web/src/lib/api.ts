import type { ApiSuccess, ApiErrorBody, PaginationMeta } from '@throttlelk/types';

/**
 * Browser uses same-origin `/api/v1` so HttpOnly cookies are included.
 * Server talks to the API process and forwards the access cookie as Bearer.
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
  return '';
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody | null,
  ) {
    super(body?.error?.message ?? `API error ${status}`);
  }
}

const AUTH_NO_REDIRECT_CODES = new Set([
  'INVALID_CREDENTIALS',
  'ACCOUNT_DISABLED',
]);

function clearClientSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('throttlelk_user');
  localStorage.removeItem('throttlelk_access');
  localStorage.removeItem('throttlelk_refresh');
}

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
    normalized.includes('/auth/reset') ||
    normalized.includes('/users/me')
  ) {
    return;
  }

  const pathname = window.location.pathname;
  if (
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname.includes('/forgot-password') ||
    pathname.includes('/reset-password') ||
    pathname.includes('/verify-email')
  ) {
    return;
  }

  clearClientSession();
  const locale = pathname.split('/').filter(Boolean)[0] || 'en';
  const next = encodeURIComponent(`${pathname}${window.location.search}`);
  window.location.assign(`/${locale}/login?next=${next}`);
}

function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers = { ...extra };
  if (typeof window === 'undefined') {
    const key = process.env.INTERNAL_API_KEY?.trim();
    if (key) headers['x-throttlelk-internal'] = key;
  }
  return headers;
}

function bearerHeader(token?: string): Record<string, string> {
  if (token && token !== 'cookie') {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function serverAccessCookie(): Promise<string | undefined> {
  if (typeof window !== 'undefined') return undefined;
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  return jar.get('__Host-tlk_access')?.value ?? jar.get('tlk_access')?.value;
}

function throwApiError(
  path: string,
  status: number,
  body: ApiErrorBody | null,
): never {
  redirectToLoginIfUnauthorized(path, status, body);
  throw new ApiRequestError(status, body);
}

async function parseJson<T>(path: string, res: Response): Promise<ApiSuccess<T>> {
  const json = (await res.json()) as ApiSuccess<T> | ApiErrorBody;
  if (!res.ok || !('success' in json) || !json.success) {
    throwApiError(path, res.status, json as ApiErrorBody);
  }
  return json;
}

async function authorizedHeaders(
  token?: string,
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const fromArg = bearerHeader(token);
  if (fromArg.Authorization) {
    return apiHeaders({ ...extra, ...fromArg });
  }
  const cookieToken = await serverAccessCookie();
  return apiHeaders({
    ...extra,
    ...bearerHeader(cookieToken),
  });
}

function requestUrl(
  path: string,
  searchParams?: Record<string, string | undefined>,
): string {
  const url = (() => {
    if (path.startsWith('http')) return new URL(path);
    if (typeof window === 'undefined') {
      return new URL(`${resolveApiUrl()}${path}`);
    }
    return new URL(path, window.location.origin);
  })();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export async function apiGet<T>(
  path: string,
  init?: { token?: string; searchParams?: Record<string, string | undefined> },
): Promise<T> {
  const res = await fetch(requestUrl(path, init?.searchParams), {
    headers: await authorizedHeaders(init?.token),
    cache: 'no-store',
    credentials: 'include',
  });
  const json = await parseJson<T>(path, res);
  return json.data;
}

export async function apiGetWithMeta<T>(
  path: string,
  init?: { token?: string; searchParams?: Record<string, string | undefined> },
): Promise<{ data: T; meta?: PaginationMeta }> {
  const res = await fetch(requestUrl(path, init?.searchParams), {
    headers: await authorizedHeaders(init?.token),
    cache: 'no-store',
    credentials: 'include',
  });
  const json = await parseJson<T>(path, res);
  return { data: json.data, meta: json.meta as PaginationMeta | undefined };
}

export async function apiSend<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  },
): Promise<T> {
  const res = await fetch(requestUrl(path), {
    method: options.method ?? 'POST',
    headers: await authorizedHeaders(options.token, {
      'Content-Type': 'application/json',
    }),
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
    credentials: 'include',
  });
  const json = await parseJson<T>(path, res);
  return json.data;
}

export async function apiUpload<T>(
  path: string,
  file: File,
  token: string,
  extraFields?: Record<string, string>,
): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      form.append(key, value);
    }
  }
  const res = await fetch(requestUrl(path), {
    method: 'POST',
    headers: await authorizedHeaders(token),
    body: form,
    cache: 'no-store',
    credentials: 'include',
  });
  const json = await parseJson<T>(path, res);
  return json.data;
}

export async function apiBlob(path: string, token: string): Promise<Blob> {
  const res = await fetch(requestUrl(path), {
    headers: await authorizedHeaders(token),
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = null;
    }
    throwApiError(path, res.status, body);
  }
  return res.blob();
}

export { resolveApiUrl };
