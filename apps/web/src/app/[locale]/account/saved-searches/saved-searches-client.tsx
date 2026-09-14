'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type SavedSearch = {
  id: string;
  name: string;
  query: {
    q?: string;
    brandId?: string;
    districtId?: string;
    minPrice?: number;
    maxPrice?: number;
  };
  notificationsEnabled: boolean;
};

function toBrowseHref(locale: Locale, query: SavedSearch['query']) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.brandId) params.set('brandId', query.brandId);
  if (query.districtId) params.set('districtId', query.districtId);
  if (query.minPrice != null) params.set('minPrice', String(query.minPrice));
  if (query.maxPrice != null) params.set('maxPrice', String(query.maxPrice));
  const qs = params.toString();
  return `/${locale}/bikes${qs ? `?${qs}` : ''}`;
}

export function SavedSearchesClient({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<SavedSearch[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(access: string) {
    setRows(await apiGet<SavedSearch[]>('/api/v1/saved-searches', { token: access }));
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed'),
    );
  }, []);

  if (!token) {
    return (
      <p className="mt-6 text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="text-muted">
          {t(locale, 'noSavedSearches')}{' '}
          <Link href={`/${locale}/bikes`} className="text-accent underline">
            {t(locale, 'browse')}
          </Link>
        </p>
      ) : (
        rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 border border-black/10 bg-surface/40 p-4"
          >
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl">
                {row.name}
              </h2>
              <p className="text-sm text-muted">
                {[
                  row.query.q,
                  row.query.brandId ? `brand:${row.query.brandId.slice(0, 8)}` : null,
                  row.query.districtId
                    ? `district:${row.query.districtId.slice(0, 8)}`
                    : null,
                  row.query.minPrice != null ? `min ${row.query.minPrice}` : null,
                  row.query.maxPrice != null ? `max ${row.query.maxPrice}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'All bikes'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={toBrowseHref(locale, row.query)}
                className="bg-accent px-3 py-1.5 text-sm text-white"
              >
                {t(locale, 'runSearch')}
              </Link>
              <button
                type="button"
                className="border border-black/20 px-3 py-1.5 text-sm"
                onClick={() => {
                  void apiSend(`/api/v1/saved-searches/${row.id}`, {
                    method: 'DELETE',
                    token,
                  })
                    .then(() => load(token))
                    .catch((err) =>
                      setError(err instanceof Error ? err.message : 'Delete failed'),
                    );
                }}
              >
                {t(locale, 'delete')}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
