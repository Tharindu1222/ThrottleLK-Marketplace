'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { BRAND_LOGO_SRC } from '@/components/brand-logo';
import { MarketplaceImage } from '@/components/marketplace-image';
import { VerifiedDealerBadge } from '@/components/verified-dealer-badge';
import { apiGet, apiSend, ApiRequestError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { loginHref } from '@/lib/login-href';
import { listingConditionLabel } from '@/lib/listing-labels';
import {
  promoCardBadgeLabel,
  type PromoTier,
} from '@/lib/promo-tier';

export type BrowsePartCard = {
  id: string;
  slug: string;
  kind: 'spare' | 'modified' | string;
  title: string;
  priceLkr: number;
  negotiable?: boolean;
  condition?: string | null;
  categoryName?: string | null;
  districtName?: string | null;
  cityName?: string | null;
  partsDealerName?: string | null;
  partsDealerSlug?: string | null;
  dealerVerified?: boolean;
  coverImageUrl?: string | null;
  listedAt?: string | null;
  viewCount?: number | null;
  isTop?: boolean;
  /** Promo package tier when served from promotions / home preview */
  tier?: PromoTier | null;
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

function kindHref(locale: Locale, kind: string, slug: string) {
  const base = kind === 'modified' ? 'modified-parts' : 'spare-parts';
  return `/${locale}/${base}/${slug}`;
}

function kindLabel(locale: Locale, kind: string) {
  return kind === 'modified'
    ? t(locale, 'modifiedPartBadge')
    : t(locale, 'sparePartBadge');
}

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

function FavouriteHeart({
  locale,
  partListingId,
  partSlug,
  partKind,
  onChange,
}: {
  locale: Locale;
  partListingId: string;
  partSlug: string;
  partKind: string;
  onChange?: (partListingId: string, favourited: boolean) => void;
}) {
  const [favourited, setFavourited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const access = getAccessToken();
    if (!access) return;
    void apiGet<string[]>('/api/v1/part-favourites/ids', { token: access })
      .then((ids) => setFavourited(ids.includes(partListingId)))
      .catch(() => undefined);
  }, [partListingId]);

  function stopCardNav(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function onToggle(e: MouseEvent) {
    stopCardNav(e);
    const token = getAccessToken();
    if (!token) {
      window.location.href = loginHref(
        locale,
        kindHref(locale, partKind, partSlug),
      );
      return;
    }
    if (busy) return;

    const next = !favourited;
    setBusy(true);
    setError(null);
    setFavourited(next);

    try {
      if (next) {
        try {
          await apiSend(`/api/v1/part-favourites/${partListingId}`, {
            token,
          });
        } catch (err) {
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
          await apiSend(`/api/v1/part-favourites/${partListingId}`, {
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
      onChange?.(partListingId, next);
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
          className={`peer pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition duration-200 disabled:opacity-60 ${
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

function MetaBit({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 break-words text-xs tracking-wide text-muted">
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

export function PartCard({
  locale,
  part,
  href,
  statusBadge,
  promotionStatus,
  showFavourite = true,
  footer,
  onFavouriteChange,
}: {
  locale: Locale;
  part: BrowsePartCard;
  href?: string;
  statusBadge?: { label: string; status: string };
  /** Seller's own card: this listing already has a live promotion. */
  promotionStatus?: string | null;
  showFavourite?: boolean;
  footer?: ReactNode;
  onFavouriteChange?: (partListingId: string, favourited: boolean) => void;
}) {
  const location = formatLocation(part.cityName, part.districtName);
  const cardHref = href ?? kindHref(locale, part.kind, part.slug);
  const listedLabel = part.listedAt
    ? formatListedAt(part.listedAt, locale)
    : null;
  const views =
    part.viewCount != null && part.viewCount > 0
      ? part.viewCount === 1
        ? t(locale, 'viewsOne')
        : t(locale, 'views').replace(
            '{n}',
            part.viewCount.toLocaleString('en-LK'),
          )
      : null;
  const promoBadge = promoCardBadgeLabel(locale, part.tier, part.isTop);

  return (
    <article className="group flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden border border-black/10 bg-white transition hover:border-accent/35 hover:shadow-[0_12px_28px_-18px_rgba(15,15,15,0.35)]">
      <Link href={cardHref} className="relative block aspect-[16/10] w-full overflow-hidden bg-surface">
        {part.coverImageUrl ? (
          <MarketplaceImage
            src={part.coverImageUrl}
            alt=""
            sizes="(max-width: 1280px) 50vw, 33vw"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface">
            <MarketplaceImage
              src={BRAND_LOGO_SRC}
              alt=""
              fill={false}
              width={160}
              height={40}
              sizes="160px"
              className="h-10 w-auto opacity-40"
            />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex min-w-0 flex-wrap items-start justify-between gap-2 p-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex rounded-sm bg-black/70 px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase">
              {kindLabel(locale, part.kind)}
            </span>
            {promotionStatus || promoBadge ? (
              <span className="inline-flex rounded-sm bg-accent px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-white uppercase">
                {promotionStatus || promoBadge}
              </span>
            ) : null}
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
            {statusBadge ? (
              <span
                className={`rounded-sm px-2 py-1 text-[10px] font-semibold tracking-wide uppercase ${statusRibbonClass(statusBadge.status)}`}
              >
                {statusBadge.label}
              </span>
            ) : null}
            {showFavourite ? (
              <FavouriteHeart
                locale={locale}
                partListingId={part.id}
                partSlug={part.slug}
                partKind={part.kind}
                onChange={onFavouriteChange}
              />
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5 sm:p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <Link href={cardHref} className="min-w-0 flex-1">
            <h3 className="line-clamp-2 break-words font-[family-name:var(--font-display)] text-sm leading-snug tracking-wide text-foreground transition group-hover:text-accent sm:text-lg">
              {part.title}
            </h3>
          </Link>
          {part.dealerVerified ? (
            <VerifiedDealerBadge
              locale={locale}
              iconOnly
              className="mt-0.5 shrink-0"
            />
          ) : null}
        </div>

        <p className="min-w-0 break-words font-[family-name:var(--font-display)] text-base tracking-wide text-accent sm:text-xl">
          {formatLkr(part.priceLkr)}
          {part.negotiable ? (
            <span className="ml-1.5 align-middle text-xs font-sans font-normal tracking-normal text-muted">
              · {t(locale, 'negotiable')}
            </span>
          ) : null}
        </p>

        <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
          {part.condition ? (
            <MetaBit>
              <span className="capitalize">
                {listingConditionLabel(locale, part.condition)}
              </span>
            </MetaBit>
          ) : null}
          {part.categoryName ? <MetaBit>{part.categoryName}</MetaBit> : null}
          {location ? <MetaBit>{location}</MetaBit> : null}
        </div>

        {part.partsDealerName ? (
          <p className="min-w-0 break-words text-xs text-muted">
            {part.partsDealerSlug ? (
              <Link
                href={`/${locale}/parts-dealers/${part.partsDealerSlug}`}
                className="font-medium text-foreground/80 transition hover:text-accent"
                onClick={(e) => e.stopPropagation()}
              >
                {part.partsDealerName}
              </Link>
            ) : (
              part.partsDealerName
            )}
          </p>
        ) : null}

        {(listedLabel || views) && (
          <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[11px] text-muted">
            {listedLabel ? <span>{listedLabel}</span> : null}
            {views ? <span>{views}</span> : null}
          </div>
        )}

        {footer ? <div className="mt-3 border-t border-black/5 pt-3">{footer}</div> : null}
      </div>
    </article>
  );
}
