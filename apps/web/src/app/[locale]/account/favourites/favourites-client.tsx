'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type FavRow = {
  listingId: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    priceLkr: number;
    manufactureYear: number;
    status: string;
  };
};

export function FavouritesClient({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<FavRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void apiGet<FavRow[]>('/api/v1/favourites', { token: access })
      .then(setRows)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed'),
      );
  }, []);

  if (!token) {
    return (
      <p className="mt-6 text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </Link>{' '}
        {t(locale, 'toSaveFavourites')}
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {error ? <p className="text-sm text-red-400 sm:col-span-3">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="text-muted sm:col-span-3">{t(locale, 'noFavourites')}</p>
      ) : (
        rows.map((row) => (
          <Link
            key={row.listingId}
            href={`/${locale}/bikes/${row.listing.slug}`}
            className="border border-black/10 bg-surface/40 p-4 hover:border-accent/40"
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              {row.listing.title}
            </h2>
            <p className="mt-2 text-accent">
              Rs. {row.listing.priceLkr.toLocaleString('en-LK')}
            </p>
            <p className="mt-1 text-sm text-muted">
              {row.listing.manufactureYear}
            </p>
          </Link>
        ))
      )}
    </div>
  );
}
