'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { BRAND_LOGO_SRC } from '@/components/brand-logo';
import { apiGet, apiSend, ApiRequestError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

export type BrowseListingCard = {
  id: string;
  slug: string;
  title: string;
  priceLkr: number;
  manufactureYear: number;
  engineCc?: number | null;
  mileage: number | null;
  condition: string;
  brandName?: string | null;
  modelName?: string | null;
  districtName?: string | null;
  cityName?: string | null;
  sellerType?: 'dealer' | 'private' | string | null;
  coverImageUrl?: string | null;
  /** ISO date when listing went live (publishedAt) or was created */
  listedAt?: string | null;
  viewCount?: number | null;
};

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function formatLocation(city?: string | null, district?: string | null) {
  const c = city?.trim() || '';
  const d = district?.trim() || '';
  if (c && d && c.toLowerCase() === d.toLowerCase()) return c;
  return [c, d].filter(Boolean).join(', ') || null;
}

function formatListedAt(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86_400_000,
  );

  if (diffDays <= 0) return t(locale, 'postedToday');
  if (diffDays === 1) return t(locale, 'postedYesterday');
  if (diffDays < 7) {
    return t(locale, 'postedDaysAgo').replace('{n}', String(diffDays));
  }

  const formatted = date.toLocaleDateString(
    locale === 'si' ? 'si-LK' : 'en-LK',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
  return t(locale, 'postedOn').replace('{date}', formatted);
}

function FavouriteHeart({
  locale,
  listingId,
}: {
  locale: Locale;
  listingId: string;
}) {
  const [favourited, setFavourited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const access = getAccessToken();
    if (!access) return;
    void apiGet<string[]>('/api/v1/favourites/ids', { token: access })
      .then((ids) => setFavourited(ids.includes(listingId)))
      .catch(() => undefined);
  }, [listingId]);

  function stopCardNav(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function onToggle(e: MouseEvent) {
    stopCardNav(e);
    const token = getAccessToken();
    if (!token) {
      window.location.href = `/${locale}/login`;
      return;
    }
    if (busy) return;

    const next = !favourited;
    setBusy(true);
    setError(null);
    setFavourited(next); // optimistic

    try {
      if (next) {
        try {
          await apiSend(`/api/v1/favourites/${listingId}`, { token });
        } catch (err) {
          // Already favourited → treat as success
          if (
            !(
              err instanceof ApiRequestError &&
              err.body?.error?.code === 'ALREADY_FAVOURITED'
            )
          ) {
            throw err;
          }
        }
      } else {
        try {
          await apiSend(`/api/v1/favourites/${listingId}`, {
            method: 'DELETE',
            token,
          });
        } catch (err) {
          if (
            !(
              err instanceof ApiRequestError &&
              err.body?.error?.code === 'FAVOURITE_NOT_FOUND'
            )
          ) {
            throw err;
          }
        }
      }
    } catch (err) {
      setFavourited(!next);
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        aria-pressed={favourited}
        aria-label={
          favourited ? t(locale, 'unfavourite') : t(locale, 'favourite')
        }
        onClick={(e) => void onToggle(e)}
        onMouseDown={stopCardNav}
        onPointerDown={stopCardNav}
        className={`pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition duration-200 disabled:opacity-60 ${
          favourited
            ? 'border-accent bg-accent text-white shadow-accent/25'
            : 'border-white/40 bg-black/45 text-white hover:border-white/70 hover:bg-black/60'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill={favourited ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={favourited ? '0' : '1.75'}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M16.5 3.5c-1.74 0-3.41.81-4.5 2.09A6.03 6.03 0 0 0 7.5 3.5 5.5 5.5 0 0 0 2 9c0 6.16 8.5 11.5 10 11.5S22 15.16 22 9a5.5 5.5 0 0 0-5.5-5.5z" />
        </svg>
      </button>
      {error ? (
        <span className="max-w-[9rem] rounded bg-black/75 px-1.5 py-0.5 text-[10px] leading-tight text-white">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function SpecChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm bg-surface px-2 py-1 text-[12px] leading-none text-foreground/90">
      {children}
    </span>
  );
}

export function ListingCard({
  locale,
  listing,
}: {
  locale: Locale;
  listing: BrowseListingCard;
}) {
  const brandModel =
    [listing.brandName, listing.modelName].filter(Boolean).join(' ') ||
    listing.title;
  const location = formatLocation(listing.cityName, listing.districtName);
  const sellerLabel =
    listing.sellerType === 'dealer'
      ? t(locale, 'sellerDealer')
      : t(locale, 'sellerPrivate');
  const href = `/${locale}/bikes/${listing.slug}`;
  const mileageLabel =
    listing.mileage != null
      ? `${listing.mileage.toLocaleString('en-LK')} km`
      : null;
  const ccLabel =
    listing.engineCc != null ? `${listing.engineCc} cc` : null;
  const listedLabel = listing.listedAt
    ? formatListedAt(listing.listedAt, locale)
    : null;
  const views =
    listing.viewCount != null && listing.viewCount > 0
      ? listing.viewCount === 1
        ? t(locale, 'viewsOne')
        : t(locale, 'views').replace(
            '{n}',
            listing.viewCount.toLocaleString('en-LK'),
          )
      : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden border border-black/[0.08] bg-white transition duration-300 ease-out hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.45)]">
      {/* Stretched link: whole card navigates; favourite stays above with pointer-events */}
      <Link
        href={href}
        className="absolute inset-0 z-0"
        aria-label={brandModel}
      />

      <div className="pointer-events-none relative aspect-[4/3] shrink-0 overflow-hidden bg-surface">
        {listing.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
            onError={(e) => {
              const el = e.currentTarget;
              el.onerror = null;
              el.src = BRAND_LOGO_SRC;
              el.className =
                'mx-auto mt-[18%] h-12 w-auto max-w-[50%] object-contain opacity-80 brightness-0';
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[linear-gradient(160deg,#f0f0f0_0%,#fafafa_50%,#ececec_100%)] px-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_LOGO_SRC}
              alt=""
              className="h-10 w-auto max-w-[55%] object-contain opacity-80 brightness-0"
            />
            <span className="text-xs tracking-wide text-muted">
              {t(locale, 'photoComingSoon')}
            </span>
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 via-black/20 to-transparent"
        />
        <span className="absolute bottom-3 left-3 rounded-sm bg-black/70 px-2 py-1 text-[11px] font-medium tracking-wide text-white backdrop-blur-sm">
          {sellerLabel}
        </span>
      </div>

      {/* Outside pointer-events-none so the heart always receives clicks */}
      <FavouriteHeart locale={locale} listingId={listing.id} />

      <div className="pointer-events-none relative z-[1] flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="min-w-0 space-y-1.5">
          <h2 className="line-clamp-2 min-h-[2.5rem] font-[family-name:var(--font-display)] text-[1.05rem] leading-snug tracking-wide text-foreground transition duration-200 group-hover:text-accent sm:text-[1.125rem]">
            {brandModel}
          </h2>
          <p className="font-[family-name:var(--font-display)] text-xl tracking-wide text-accent sm:text-[1.35rem]">
            {formatLkr(listing.priceLkr)}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <SpecChip>{listing.manufactureYear}</SpecChip>
          {mileageLabel ? <SpecChip>{mileageLabel}</SpecChip> : null}
          {ccLabel ? <SpecChip>{ccLabel}</SpecChip> : null}
          <SpecChip>
            <span className="capitalize">{listing.condition}</span>
          </SpecChip>
        </div>

        {location || listedLabel || views ? (
          <div className="mt-auto flex items-center justify-between gap-3 text-sm text-muted">
            {location ? (
              <p className="flex min-w-0 items-center gap-1.5 truncate">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 shrink-0 opacity-70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span className="truncate">{location}</span>
              </p>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-2 text-xs tracking-wide text-muted/90">
              {views ? <span>{views}</span> : null}
              {views && listedLabel ? (
                <span className="text-black/25" aria-hidden>
                  ·
                </span>
              ) : null}
              {listedLabel ? (
                <time
                  dateTime={listing.listedAt ?? undefined}
                  suppressHydrationWarning
                >
                  {listedLabel}
                </time>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
