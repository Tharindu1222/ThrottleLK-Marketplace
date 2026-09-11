import type { ApiSuccess, ApiErrorBody } from '@throttlelk/types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  'http://localhost:3001';

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody | null,
  ) {
    super(body?.error?.message ?? `API error ${status}`);
  }
}

export async function apiGet<T>(
  path: string,
  init?: { token?: string; searchParams?: Record<string, string | undefined> },
): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${API_URL}${path}`);
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
    throw new ApiRequestError(res.status, json as ApiErrorBody);
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
  const res = await fetch(`${API_URL}${path}`, {
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
    throw new ApiRequestError(res.status, json as ApiErrorBody);
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
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
    cache: 'no-store',
  });
  const json = (await res.json()) as ApiSuccess<T> | ApiErrorBody;
  if (!res.ok || !('success' in json) || !json.success) {
    throw new ApiRequestError(res.status, json as ApiErrorBody);
  }
  return json.data;
}

export { API_URL };
