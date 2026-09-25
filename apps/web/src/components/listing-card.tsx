'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { BRAND_LOGO_SRC } from '@/components/brand-logo';
import { apiSend, ApiRequestError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { composeListingTitle } from '@/lib/listing-title';
import {
  loadFavouriteIds,
  patchFavouriteIdsCache,
} from '@/lib/favourite-ids';
import {
  getCompareItems,
  toggleCompare,
  type CompareItem,
} from '@/lib/compare';
import { VerifiedDealerIcon } from '@/components/verified-dealer-badge';

export type BrowseListingCard = {
  id: string;
  slug: string;
  title: string;
  priceLkr: number;
  manufactureYear?: number | null;
  engineCc?: number | null;
  mileage: number | null;
  condition?: string | null;
  brandName?: string | null;
  modelName?: string | null;
  districtName?: string | null;
  cityName?: string | null;
  sellerType?: 'dealer' | 'private' | string | null;
  dealerVerified?: boolean;
  coverImageUrl?: string | null;
  /** ISO date when listing went live (publishedAt) or was created */
  listedAt?: string | null;
  viewCount?: number | null;
};

function OverlayTip({
  label,
  align,
  children,
}: {
  label: string;
  align: 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <span className="pointer-events-auto relative inline-flex">
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute top-[calc(100%+6px)] z-30 whitespace-nowrap rounded-sm bg-black/85 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition duration-150 peer-hover:opacity-100 peer-focus-visible:opacity-100 ${
          align === 'left' ? 'left-0' : 'right-0'
        }`}
      >
        {label}
      </span>
    </span>
  );
}

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-US')}`;
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
  const startToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const startThat = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const diffDays = Math.round((startToday - startThat) / 86_400_000);

  if (diffDays <= 0) return t(locale, 'postedToday');
  if (diffDays === 1) return t(locale, 'postedYesterday');
  if (diffDays < 7) {
    return t(locale, 'postedDaysAgo').replace('{n}', String(diffDays));
  }

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const formatted = `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  return t(locale, 'postedOn').replace('{date}', formatted);
}

function FavouriteHeart({
  locale,
  listingId,
  onChange,
}: {
  locale: Locale;
  listingId: string;
  onChange?: (listingId: string, favourited: boolean) => void;
}) {
  const [favourited, setFavourited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const access = getAccessToken();
    if (!access) return;
    void loadFavouriteIds(access)
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
      patchFavouriteIdsCache(token, listingId, next);
      onChange?.(listingId, next);
    } catch (err) {
      setFavourited(!next);
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const favLabel = favourited
    ? t(locale, 'unfavourite')
    : t(locale, 'addFavourite');

  return (
    <>
      <OverlayTip label={favLabel} align="right">
        <button
          type="button"
          disabled={busy}
          aria-pressed={favourited}
          aria-label={favLabel}
          title={favLabel}
          onClick={(e) => void onToggle(e)}
          onMouseDown={stopCardNav}
          onPointerDown={stopCardNav}
          className={`peer pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition duration-200 disabled:opacity-60 ${
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
      </OverlayTip>
      {error ? (
        <span className="max-w-[9rem] rounded bg-black/75 px-1.5 py-0.5 text-[10px] leading-tight text-white">
          {error}
        </span>
      ) : null}
    </>
  );
}

function CompareToggle({
  locale,
  listing,
}: {
  locale: Locale;
  listing: BrowseListingCard;
}) {
  const [inCompare, setInCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () =>
      setInCompare(getCompareItems().some((c) => c.id === listing.id));
    sync();
    window.addEventListener('throttlelk-compare', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('throttlelk-compare', sync);
      window.removeEventListener('storage', sync);
    };
  }, [listing.id]);

  function stopCardNav(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function onToggle(e: MouseEvent) {
    stopCardNav(e);
    const item: CompareItem = {
      id: listing.id,
      slug: listing.slug,
      title: composeListingTitle({
        title: listing.title,
        brandName: listing.brandName,
        modelName: listing.modelName,
        manufactureYear: listing.manufactureYear,
      }),
    };
    const result = toggleCompare(item);
    setInCompare(result.items.some((c) => c.id === listing.id));
    setError(result.full ? t(locale, 'compareFull') : null);
  }

  const compareLabel = inCompare
    ? t(locale, 'removeCompare')
    : t(locale, 'addCompare');

  return (
    <>
      <OverlayTip label={compareLabel} align="left">
        <button
          type="button"
          aria-pressed={inCompare}
          aria-label={compareLabel}
          title={compareLabel}
          onClick={onToggle}
          onMouseDown={stopCardNav}
          onPointerDown={stopCardNav}
          className={`peer pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition duration-200 ${
            inCompare
              ? 'border-accent bg-accent text-white shadow-accent/25'
              : 'border-white/40 bg-black/45 text-white hover:border-white/70 hover:bg-black/60'
          }`}
        >
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3.5" y="4.5" width="7" height="15" rx="1.5" />
          <rect x="13.5" y="4.5" width="7" height="15" rx="1.5" />
          <path d="M6.5 9h1M6.5 13h1M16.5 9h1M16.5 13h1" />
        </svg>
        </button>
      </OverlayTip>
      {error ? (
        <span className="max-w-[9rem] rounded bg-black/75 px-1.5 py-0.5 text-[10px] leading-tight text-white">
          {error}
        </span>
      ) : null}
    </>
  );
}

function CardIcon({
  children,
  className = 'h-3.5 w-3.5',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function SpecCell({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <li className="flex min-w-0 items-center gap-2 bg-white px-2.5 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface text-foreground/75">
        {children}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium leading-tight text-foreground">
          {value}
        </span>
        <span className="block text-[10px] tracking-wide text-muted uppercase">
          {label}
        </span>
      </span>
    </li>
  );
}

function MetaBit({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs tracking-wide text-muted">
      {children}
    </span>
  );
}

function statusRibbonClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-600 text-white';
    case 'pending_review':
      return 'bg-amber-400 text-zinc-950';
    case 'draft':
      return 'bg-zinc-700 text-white';
    case 'paused':
      return 'bg-sky-600 text-white';
    case 'rejected':
      return 'bg-red-700 text-white';
    case 'sold':
      return 'bg-accent text-white';
    default:
      return 'bg-zinc-800 text-white';
  }
}

export function ListingCard({
  locale,
  listing,
  href,
  badge,
  statusBadge,
  showFavourite = true,
  footer,
  headingLevel = 'h2',
  onFavouriteChange,
}: {
  locale: Locale;
  listing: BrowseListingCard;
  href?: string;
  badge?: string;
  statusBadge?: { label: string; status: string };
  showFavourite?: boolean;
  footer?: ReactNode;
  headingLevel?: 'h2' | 'h3';
  onFavouriteChange?: (listingId: string, favourited: boolean) => void;
}) {
  const TitleTag = headingLevel;
  const displayTitle = composeListingTitle({
    title: listing.title,
    brandName: listing.brandName,
    modelName: listing.modelName,
    manufactureYear: listing.manufactureYear,
  });
  const location = formatLocation(listing.cityName, listing.districtName);
  const sellerLabel =
    listing.sellerType === 'dealer'
      ? listing.dealerVerified
        ? t(locale, 'verifiedDealer')
        : t(locale, 'sellerDealer')
      : t(locale, 'sellerPrivate');
  const showVerifiedIcon =
    listing.sellerType === 'dealer' && Boolean(listing.dealerVerified);
  const cardHref = href ?? `/${locale}/bikes/${listing.slug}`;
  const mileageLabel =
    listing.mileage != null
      ? `${listing.mileage.toLocaleString('en-US')} km`
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
            listing.viewCount.toLocaleString('en-US'),
          )
      : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden border border-black/10 bg-white shadow-[0_1px_2px_rgba(15,15,15,0.06),0_10px_28px_-16px_rgba(15,15,15,0.22)] transition duration-300 ease-out hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_4px_8px_rgba(15,15,15,0.06),0_18px_36px_-16px_rgba(15,15,15,0.28)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Stretched link: whole card navigates; favourite stays above with pointer-events */}
      <Link
        href={cardHref}
        className="absolute inset-0 z-0"
        aria-label={displayTitle}
      />

      <div className="pointer-events-none relative aspect-[4/3] shrink-0 overflow-hidden bg-surface">
        {listing.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
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
        {statusBadge ? (
          <div className="pointer-events-none absolute top-0 left-0 z-[2] h-[6.25rem] w-[6.25rem] overflow-hidden">
            <span
              className={`absolute top-[22px] -left-10 w-[10.5rem] rotate-[-45deg] py-1.5 text-center text-[10px] font-bold tracking-[0.16em] shadow-[0_2px_6px_rgba(0,0,0,0.35)] ${statusRibbonClass(statusBadge.status)}`}
            >
              {statusBadge.label}
            </span>
          </div>
        ) : (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-sm bg-black/70 px-2 py-1 text-[11px] font-medium tracking-wide text-white backdrop-blur-sm">
            {showVerifiedIcon ? (
              <VerifiedDealerIcon className="h-3.5 w-3.5 text-emerald-500" />
            ) : null}
            {badge ?? sellerLabel}
          </span>
        )}
      </div>

      {showFavourite ? (
        <>
          <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1">
            <CompareToggle locale={locale} listing={listing} />
          </div>
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
            <FavouriteHeart
              locale={locale}
              listingId={listing.id}
              onChange={onFavouriteChange}
            />
          </div>
        </>
      ) : null}

      <div
        className={`pointer-events-none relative z-[1] flex flex-1 flex-col gap-2.5 px-3.5 pt-3 ${
          footer ? 'pb-2.5' : 'pb-3.5'
        }`}
      >
        <div className="min-w-0">
          <TitleTag className="line-clamp-2 font-[family-name:var(--font-display)] text-[1.05rem] leading-snug tracking-wide text-foreground transition duration-200 group-hover:text-accent">
            {displayTitle}
          </TitleTag>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl leading-none tracking-wide text-accent">
            {formatLkr(listing.priceLkr)}
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-black/[0.06] bg-black/[0.06]">
          {listing.manufactureYear != null ? (
            <SpecCell label={t(locale, 'year')} value={String(listing.manufactureYear)}>
              <CardIcon>
                <rect x="4" y="5" width="16" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M4 11h16" />
              </CardIcon>
            </SpecCell>
          ) : null}
          {listing.condition ? (
            <SpecCell
              label={t(locale, 'condition')}
              value={listing.condition.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            >
              <CardIcon>
                <path d="M12 3l7 4v5c0 5-3.5 8.5-7 10-4.5-1.5-8-5-8-10V7l7-4z" />
                <path d="M9 12l2 2 4-4" />
              </CardIcon>
            </SpecCell>
          ) : null}
          {mileageLabel ? (
            <SpecCell label={t(locale, 'mileage')} value={mileageLabel}>
              <CardIcon>
                <circle cx="12" cy="13" r="8" />
                <path d="M12 13l4-4" />
                <path d="M7 8.5a8 8 0 0 1 10 0" />
              </CardIcon>
            </SpecCell>
          ) : null}
          {ccLabel ? (
            <SpecCell label={t(locale, 'cc')} value={ccLabel}>
              <CardIcon>
                <path d="M7 8h10l1.5 4H18v5H6v-5h-.5L7 8z" />
                <path d="M9 8V6h6v2" />
                <path d="M10 17v2M14 17v2" />
              </CardIcon>
            </SpecCell>
          ) : null}
        </ul>

        {location || listedLabel || views ? (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/[0.06] pt-2.5">
            {location ? (
              <MetaBit>
                <CardIcon className="h-3.5 w-3.5 text-foreground/55">
                  <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </CardIcon>
                <span className="truncate">{location}</span>
              </MetaBit>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-2.5">
              {views ? (
                <MetaBit>
                  <CardIcon className="h-3.5 w-3.5 text-foreground/55">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </CardIcon>
                  <span>{views}</span>
                </MetaBit>
              ) : null}
              {listedLabel ? (
                <MetaBit>
                  <CardIcon className="h-3.5 w-3.5 text-foreground/55">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v4l2.5 1.5" />
                  </CardIcon>
                  <time
                    dateTime={listing.listedAt ?? undefined}
                    suppressHydrationWarning
                  >
                    {listedLabel}
                  </time>
                </MetaBit>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {footer ? (
        <div className="relative z-10 border-t border-black/[0.06] bg-white px-3.5 py-3">
          {footer}
        </div>
      ) : null}
    </article>
  );
}
