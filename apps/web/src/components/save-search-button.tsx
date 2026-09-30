'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

export function SaveSearchButton({
  locale,
  filters,
}: {
  locale: Locale;
  filters: {
    q?: string;
    brandId?: string;
    modelId?: string;
    categoryId?: string;
    districtId?: string;
    cityId?: string;
    minPrice?: string;
    maxPrice?: string;
    minYear?: string;
    maxYear?: string;
    minMileage?: string;
    maxMileage?: string;
    minEngineCc?: string;
    maxEngineCc?: string;
    condition?: string;
    fuelType?: string;
    transmission?: string;
    sellerType?: string;
    featured?: string;
    negotiable?: string;
    sort?: string;
  };
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);

  const hasFilters = useMemo(
    () =>
      Boolean(
        filters.q ||
          filters.brandId ||
          filters.modelId ||
          filters.categoryId ||
          filters.districtId ||
          filters.cityId ||
          filters.minPrice ||
          filters.maxPrice ||
          filters.minYear ||
          filters.maxYear ||
          filters.minMileage ||
          filters.maxMileage ||
          filters.minEngineCc ||
          filters.maxEngineCc ||
          filters.condition ||
          filters.fuelType ||
          filters.transmission ||
          filters.sellerType ||
          filters.featured ||
          filters.negotiable,
      ),
    [filters],
  );

  async function onSave() {
    const token = getAccessToken();
    if (!token) {
      window.location.href = `/${locale}/login`;
      return;
    }
    if (!hasFilters) {
      setError(t(locale, 'saveSearchNeedFilters'));
      return;
    }
    setError(null);
    setStatus(null);
    const nameParts = [
      filters.q,
      filters.brandId ? 'brand' : null,
      filters.modelId ? 'model' : null,
      filters.districtId ? 'district' : null,
      filters.minPrice || filters.maxPrice ? 'price' : null,
    ].filter(Boolean);
    try {
      await apiSend('/api/v1/saved-searches', {
        token,
        body: {
          name: nameParts.join(' · ') || 'Saved search',
          query: {
            q: filters.q || undefined,
            brandId: filters.brandId || undefined,
            modelId: filters.modelId || undefined,
            categoryId: filters.categoryId || undefined,
            districtId: filters.districtId || undefined,
            cityId: filters.cityId || undefined,
            minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
            maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
            minYear: filters.minYear ? Number(filters.minYear) : undefined,
            maxYear: filters.maxYear ? Number(filters.maxYear) : undefined,
            minMileage: filters.minMileage
              ? Number(filters.minMileage)
              : undefined,
            maxMileage: filters.maxMileage
              ? Number(filters.maxMileage)
              : undefined,
            minEngineCc: filters.minEngineCc
              ? Number(filters.minEngineCc)
              : undefined,
            maxEngineCc: filters.maxEngineCc
              ? Number(filters.maxEngineCc)
              : undefined,
            condition: filters.condition || undefined,
            fuelType: filters.fuelType || undefined,
            transmission: filters.transmission || undefined,
            sellerType: filters.sellerType || undefined,
            featured: filters.featured === 'true' ? true : undefined,
            negotiable: filters.negotiable === 'true' ? true : undefined,
            sort: filters.sort || undefined,
          },
          notificationsEnabled: notify,
        },
      });
      setStatus(t(locale, 'searchSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="flex min-h-11 min-w-0 items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />
        {t(locale, 'notifyNewMatches')}
      </label>
      <button
        type="button"
        onClick={() => void onSave()}
        className="inline-flex min-h-11 items-center justify-center border border-black/20 px-4 text-sm hover:border-accent"
      >
        {t(locale, 'saveSearch')}
      </button>
      <Link
        href={`/${locale}/account/saved-searches`}
        className="inline-flex min-h-11 min-w-0 items-center text-sm text-accent underline"
      >
        {t(locale, 'savedSearches')}
      </Link>
      {status ? <span className="text-sm text-accent">{status}</span> : null}
      {error ? <span className="text-sm text-red-400">{error}</span> : null}
    </div>
  );
}
