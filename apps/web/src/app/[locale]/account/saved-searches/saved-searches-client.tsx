'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { loginHref } from '@/lib/login-href';

type SavedSearch = {
  id: string;
  name: string;
  query: {
    q?: string;
    brandId?: string;
    modelId?: string;
    categoryId?: string;
    districtId?: string;
    cityId?: string;
    minPrice?: number;
    maxPrice?: number;
    minYear?: number;
    maxYear?: number;
    minMileage?: number;
    maxMileage?: number;
    minEngineCc?: number;
    maxEngineCc?: number;
    condition?: string;
    fuelType?: string;
    transmission?: string;
    sellerType?: string;
    featured?: boolean;
    negotiable?: boolean;
    sort?: string;
  };
  notificationsEnabled: boolean;
};

function toBrowseHref(locale: Locale, query: SavedSearch['query']) {
  const params = new URLSearchParams();
  const entries: Array<[string, string | number | boolean | undefined]> = [
    ['q', query.q],
    ['brandId', query.brandId],
    ['modelId', query.modelId],
    ['categoryId', query.categoryId],
    ['districtId', query.districtId],
    ['cityId', query.cityId],
    ['minPrice', query.minPrice],
    ['maxPrice', query.maxPrice],
    ['minYear', query.minYear],
    ['maxYear', query.maxYear],
    ['minMileage', query.minMileage],
    ['maxMileage', query.maxMileage],
    ['minEngineCc', query.minEngineCc],
    ['maxEngineCc', query.maxEngineCc],
    ['condition', query.condition],
    ['fuelType', query.fuelType],
    ['transmission', query.transmission],
    ['sellerType', query.sellerType],
    ['featured', query.featured ? '1' : undefined],
    ['negotiable', query.negotiable ? '1' : undefined],
    ['sort', query.sort],
  ];
  for (const [key, value] of entries) {
    if (value != null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `/${locale}/bikes${qs ? `?${qs}` : ''}`;
}

export function SavedSearchesClient({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<SavedSearch[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load(access: string) {
    const saved = await apiGet<SavedSearch[]>('/api/v1/saved-searches', {
      token: access,
    });
    setRows(saved);
    const [brands, districts, categories] = await Promise.all([
      apiGet<Array<{ id: string; name: string }>>('/api/v1/brands'),
      apiGet<Array<{ id: string; name: string }>>('/api/v1/locations/districts'),
      apiGet<Array<{ id: string; name: string }>>('/api/v1/categories'),
    ]);
    const map: Record<string, string> = {};
    for (const row of [...brands, ...districts, ...categories]) {
      map[row.id] = row.name;
    }
    const brandIds = [
      ...new Set(saved.map((row) => row.query.brandId).filter(Boolean)),
    ] as string[];
    const districtIds = [
      ...new Set(saved.map((row) => row.query.districtId).filter(Boolean)),
    ] as string[];
    const [modelGroups, cityGroups] = await Promise.all([
      Promise.all(
        brandIds.map((id) =>
          apiGet<Array<{ id: string; name: string }>>(
            `/api/v1/brands/${id}/models`,
          ).catch(() => []),
        ),
      ),
      Promise.all(
        districtIds.map((id) =>
          apiGet<Array<{ id: string; name: string }>>(
            `/api/v1/locations/districts/${id}/cities`,
          ).catch(() => []),
        ),
      ),
    ]);
    for (const group of [...modelGroups, ...cityGroups]) {
      for (const row of group) map[row.id] = row.name;
    }
    setNames(map);
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
        <Link href={loginHref(locale, pathname)} className="text-accent underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-8 min-w-0 space-y-4">
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
            className="flex min-w-0 flex-col gap-3 border border-black/10 bg-surface/40 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <h2 className="break-words font-[family-name:var(--font-display)] text-xl">
                {row.name}
              </h2>
              <p className="break-words text-sm text-muted">
                {[
                  row.query.q,
                  row.query.brandId ? names[row.query.brandId] : null,
                  row.query.modelId ? names[row.query.modelId] : null,
                  row.query.categoryId ? names[row.query.categoryId] : null,
                  row.query.districtId ? names[row.query.districtId] : null,
                  row.query.cityId ? names[row.query.cityId] : null,
                  row.query.minPrice != null ? `min ${row.query.minPrice}` : null,
                  row.query.maxPrice != null ? `max ${row.query.maxPrice}` : null,
                  row.query.minYear != null ? `${row.query.minYear}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'All bikes'}
              </p>
            </div>
            <div className="flex w-full min-w-0 flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center border border-black/20 px-3 py-1.5 text-sm"
                onClick={() => {
                  void apiSend(`/api/v1/saved-searches/${row.id}`, {
                    method: 'PATCH',
                    token,
                    body: { notificationsEnabled: !row.notificationsEnabled },
                  })
                    .then(() => load(token))
                    .catch((err) =>
                      setError(err instanceof Error ? err.message : 'Failed'),
                    );
                }}
              >
                {row.notificationsEnabled
                  ? t(locale, 'alertsOn')
                  : t(locale, 'alertsOff')}
              </button>
              <Link
                href={toBrowseHref(locale, row.query)}
                className="inline-flex min-h-11 items-center bg-accent px-3 py-1.5 text-sm text-white"
              >
                {t(locale, 'runSearch')}
              </Link>
              <button
                type="button"
                className="inline-flex min-h-11 items-center border border-black/20 px-3 py-1.5 text-sm"
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
