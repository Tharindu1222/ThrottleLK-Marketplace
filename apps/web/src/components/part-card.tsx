'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { BRAND_LOGO_SRC } from '@/components/brand-logo';
import { VerifiedDealerBadge } from '@/components/verified-dealer-badge';
import { apiGet, apiSend, ApiRequestError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

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

function FavouriteHeart({
  locale,
  partListingId,
  onChange,
}: {
  locale: Locale;
  partListingId: string;
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

  async function toggle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const access = getAccessToken();
    if (!access) {
      window.location.href = `/${locale}/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (busy) return;
    setBusy(true);
    setError(null);
    const next = !favourited;
    setFavourited(next);
    try {
      if (next) {
        await apiSend(`/api/v1/part-favourites/${partListingId}`, {
          token: access,
        });
      } else {
        await apiSend(`/api/v1/part-favourites/${partListingId}`, {
          method: 'DELETE',
          token: access,
        });
      }
      onChange?.(partListingId, next);
    } catch (err) {
      setFavourited(!next);
      setError(
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="pointer-events-auto relative inline-flex">
      <button
        type="button"
        aria-pressed={favourited}
        aria-label={t(locale, 'addFavourite')}
        disabled={busy}
        onClick={toggle}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition duration-200 ${
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
          strokeWidth="1.75"
          aria-hidden
        >
          <path d="M12 19s-6.5-4.1-8.2-7.2C2.5 9.5 3.6 6.8 6.3 6.2c1.6-.3 3.1.4 3.9 1.6.8-1.2 2.3-1.9 3.9-1.6 2.7.6 3.8 3.3 2.5 5.6C18.5 14.9 12 19 12 19Z" />
        </svg>
      </button>
      {error ? (
        <span className="absolute top-[calc(100%+4px)] right-0 max-w-[9rem] rounded bg-black/75 px-1.5 py-0.5 text-[10px] leading-tight text-white">
          {error}
        </span>
      ) : null}
    </span>
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

export function PartCard({
  locale,
  part,
  href,
  statusBadge,
  showFavourite = true,
  footer,
  onFavouriteChange,
}: {
  locale: Locale;
  part: BrowsePartCard;
  href?: string;
  statusBadge?: { label: string; status: string };
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

  return (
    <article className="group flex h-full flex-col overflow-hidden border border-black/10 bg-white transition hover:border-accent/35 hover:shadow-[0_12px_28px_-18px_rgba(15,15,15,0.35)]">
      <Link href={cardHref} className="relative block aspect-[16/10] bg-surface">
        {part.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={part.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_LOGO_SRC}
              alt=""
              className="h-10 w-auto opacity-40"
            />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex rounded-sm bg-black/70 px-2 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase">
              {kindLabel(locale, part.kind)}
            </span>
            {part.isTop ? (
              <span className="inline-flex rounded-sm bg-accent px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-white uppercase">
                {t(locale, 'homeTopBadge')}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
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
                onChange={onFavouriteChange}
              />
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Link href={cardHref} className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-lg leading-snug tracking-wide text-foreground transition group-hover:text-accent">
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

        <p className="font-[family-name:var(--font-display)] text-xl tracking-wide text-accent">
          {formatLkr(part.priceLkr)}
          {part.negotiable ? (
            <span className="ml-1.5 align-middle text-xs font-sans font-normal tracking-normal text-muted">
              · {t(locale, 'negotiable')}
            </span>
          ) : null}
        </p>

        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {part.condition ? (
            <MetaBit>
              <span className="capitalize">{part.condition}</span>
            </MetaBit>
          ) : null}
          {part.categoryName ? <MetaBit>{part.categoryName}</MetaBit> : null}
          {location ? <MetaBit>{location}</MetaBit> : null}
        </div>

        {part.partsDealerName ? (
          <p className="truncate text-xs text-muted">
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
