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
    districtId?: string;
    minPrice?: string;
    maxPrice?: string;
  };
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = useMemo(
    () =>
      Boolean(
        filters.q ||
          filters.brandId ||
          filters.districtId ||
          filters.minPrice ||
          filters.maxPrice,
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
            districtId: filters.districtId || undefined,
            minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
            maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          },
          notificationsEnabled: false,
        },
      });
      setStatus(t(locale, 'searchSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void onSave()}
        className="border border-white/20 px-3 py-1.5 text-sm hover:border-accent"
      >
        {t(locale, 'saveSearch')}
      </button>
      <Link
        href={`/${locale}/account/saved-searches`}
        className="text-sm text-accent underline"
      >
        {t(locale, 'savedSearches')}
      </Link>
      {status ? <span className="text-sm text-accent">{status}</span> : null}
      {error ? <span className="text-sm text-red-400">{error}</span> : null}
    </div>
  );
}
