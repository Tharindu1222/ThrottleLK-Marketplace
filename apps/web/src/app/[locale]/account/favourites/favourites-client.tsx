'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';
import {
  PartCard,
  type BrowsePartCard,
} from '@/components/part-card';
import { Pagination } from '@/components/pagination';
import { apiGetWithMeta } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { loginHref } from '@/lib/login-href';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import { useUrlPage } from '@/lib/use-url-page';
import type { PaginationMeta } from '@throttlelk/types';

type FavListingRow = {
  listingId: string;
  listing: BrowseListingCard;
};

type FavPartRow = {
  partListingId: string;
  listing: BrowsePartCard;
};

type FavouritesTab = 'bikes' | 'parts';

function parseTab(raw: string | null): FavouritesTab {
  return raw === 'parts' ? 'parts' : 'bikes';
}

export function FavouritesClient({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const { page, goTo } = useUrlPage();
  const [token, setToken] = useState<string | null>(null);
  const [bikeRows, setBikeRows] = useState<FavListingRow[]>([]);
  const [partRows, setPartRows] = useState<FavPartRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setTab = useCallback(
    (next: FavouritesTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'bikes') params.delete('tab');
      else params.set('tab', 'parts');
      params.delete('page');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  async function load(access: string, pageNum = page, kind = tab) {
    setLoading(true);
    setError(null);
    try {
      if (kind === 'parts') {
        const { data, meta: nextMeta } = await apiGetWithMeta<FavPartRow[]>(
          '/api/v1/part-favourites',
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
        setPartRows(data);
        setBikeRows([]);
        if (nextMeta) setMeta(nextMeta);
      } else {
        const { data, meta: nextMeta } = await apiGetWithMeta<FavListingRow[]>(
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
        setBikeRows(data);
        setPartRows([]);
        if (nextMeta) setMeta(nextMeta);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access, page, tab).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab]);

  if (!token) {
    return (
      <p className="mt-6 text-muted">
        <Link href={loginHref(locale, pathname)} className="text-accent underline">
          {t(locale, 'login')}
        </Link>{' '}
        {t(locale, 'toSaveFavourites')}
      </p>
    );
  }

  const empty =
    tab === 'parts' ? partRows.length === 0 : bikeRows.length === 0;

  return (
    <div className="mt-8 space-y-6">
      <div
        role="tablist"
        aria-label={t(locale, 'favourites')}
        className="inline-flex rounded-md bg-white p-0.5 ring-1 ring-black/[0.06]"
      >
        {(
          [
            ['bikes', 'favouritesTabBikes'],
            ['parts', 'favouritesTabParts'],
          ] as const
        ).map(([value, key]) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              className={`rounded-md px-3.5 py-1.5 text-sm transition ${
                active
                  ? 'bg-accent/10 font-medium text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
              onClick={() => setTab(value)}
            >
              {t(locale, key)}
            </button>
          );
        })}
      </div>

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
        {empty ? (
          <p className="text-muted sm:col-span-2 lg:col-span-3">
            {t(
              locale,
              tab === 'parts' ? 'noFavouriteParts' : 'noFavourites',
            )}
          </p>
        ) : tab === 'parts' ? (
          partRows.map((row) => (
            <PartCard
              key={row.partListingId}
              locale={locale}
              part={row.listing}
              onFavouriteChange={(partListingId, favourited) => {
                if (!favourited && token) {
                  void load(token, page, 'parts');
                  void partListingId;
                }
              }}
            />
          ))
        ) : (
          bikeRows.map((row) => (
            <ListingCard
              key={row.listingId}
              locale={locale}
              listing={row.listing}
              onFavouriteChange={(listingId, favourited) => {
                if (!favourited && token) {
                  void load(token, page, 'bikes');
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
