'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';
import { Pagination } from '@/components/pagination';
import { apiGetWithMeta } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import { useUrlPage } from '@/lib/use-url-page';
import type { PaginationMeta } from '@throttlelk/types';

type FavRow = {
  listingId: string;
  listing: BrowseListingCard;
};

export function FavouritesClient({ locale }: { locale: Locale }) {
  const { page, goTo } = useUrlPage();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<FavRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(access: string, pageNum = page) {
    setLoading(true);
    try {
      const { data, meta: nextMeta } = await apiGetWithMeta<FavRow[]>(
        '/api/v1/favourites',
        {
          token: access,
          searchParams: { page: String(pageNum), limit: '20' },
        },
      );
      const clamp = clampedPage(nextMeta, data.length);
      if (clamp != null && clamp !== pageNum) {
        goTo(clamp);
        return;
      }
      setRows(data);
      if (nextMeta) setMeta(nextMeta);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access, page).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
    <div className="mt-8">
      <div
        aria-busy={loading}
        className={`grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3 ${
          loading ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        {error ? (
          <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-3">
            {error}
          </p>
        ) : null}
        {rows.length === 0 ? (
          <p className="text-muted sm:col-span-2 lg:col-span-3">
            {t(locale, 'noFavourites')}
          </p>
        ) : (
          rows.map((row) => (
            <ListingCard
              key={row.listingId}
              locale={locale}
              listing={row.listing}
              onFavouriteChange={(listingId, favourited) => {
                if (!favourited && token) {
                  void load(token, page);
                  void listingId;
                }
              }}
            />
          ))
        )}
      </div>
      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        hasPreviousPage={meta.hasPreviousPage}
        hasNextPage={meta.hasNextPage}
        total={meta.total}
        limit={meta.limit}
        ariaLabel={t(locale, 'pagination')}
        previousLabel={t(locale, 'pagePrev')}
        nextLabel={t(locale, 'pageNext')}
        pageOfTemplate={t(locale, 'pageOf')}
        showingTemplate={t(locale, 'showingRange')}
        disabled={loading}
        onPage={goTo}
      />
    </div>
  );
}
