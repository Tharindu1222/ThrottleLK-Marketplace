'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEvent } from 'react';
import { apiGet, apiSend } from '@/lib/api';
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
};

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function FavouriteHeart({
  locale,
  listingId,
}: {
  locale: Locale;
  listingId: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [favourited, setFavourited] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void apiGet<string[]>('/api/v1/favourites/ids', { token: access })
      .then((ids) => setFavourited(ids.includes(listingId)))
      .catch(() => undefined);
  }, [listingId]);

  async function onToggle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      window.location.href = `/${locale}/login`;
      return;
    }
    setBusy(true);
    try {
      if (favourited) {
        await apiSend(`/api/v1/favourites/${listingId}`, {
          method: 'DELETE',
          token,
        });
        setFavourited(false);
      } else {
        await apiSend(`/api/v1/favourites/${listingId}`, { token });
        setFavourited(true);
      }
    } catch {
      // ignore — UI stays as-is
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={
        favourited ? t(locale, 'unfavourite') : t(locale, 'favourite')
      }
      onClick={(e) => void onToggle(e)}
      className={`absolute top-2.5 right-2.5 z-10 inline-flex h-9 w-9 items-center justify-center border backdrop-blur-sm transition disabled:opacity-60 ${
        favourited
          ? 'border-accent/50 bg-accent text-white'
          : 'border-black/20 bg-black/55 text-white hover:border-accent hover:text-accent'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={favourited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M12 21s-6.5-4.35-9.33-8.18C.74 10.3 1.1 6.9 3.6 5.2c2-1.35 4.55-.7 5.9 1.15C10.85 4.5 13.4 3.85 15.4 5.2c2.5 1.7 2.86 5.1.93 7.62C18.5 16.65 12 21 12 21z" />
      </svg>
    </button>
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
  const location =
    [listing.cityName, listing.districtName].filter(Boolean).join(', ') ||
    '—';
  const sellerLabel =
    listing.sellerType === 'dealer'
      ? t(locale, 'sellerDealer')
      : t(locale, 'sellerPrivate');

  return (
    <article className="group flex h-full flex-col overflow-hidden border border-black/10 bg-surface/50 transition hover:border-accent/45 hover:bg-surface/70">
      <Link
        href={`/${locale}/bikes/${listing.slug}`}
        className="relative block h-44 shrink-0 overflow-hidden bg-background sm:h-48"
      >
        {listing.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            No photo
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute bottom-2.5 left-2.5 bg-black/65 px-2 py-0.5 text-[11px] tracking-wide text-white ring-1 ring-black/15 backdrop-blur-sm">
          {sellerLabel}
        </span>
        <FavouriteHeart locale={locale} listingId={listing.id} />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/${locale}/bikes/${listing.slug}`} className="min-w-0">
          <h2 className="line-clamp-2 min-h-[2.75rem] font-[family-name:var(--font-display)] text-[17px] leading-snug tracking-wide transition group-hover:text-accent">
            {brandModel}
          </h2>
          <p className="mt-2 text-lg text-accent">{formatLkr(listing.priceLkr)}</p>
        </Link>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-black/10 pt-3 text-xs">
          <div>
            <dt className="text-muted">{t(locale, 'year')}</dt>
            <dd className="mt-0.5 text-foreground">{listing.manufactureYear}</dd>
          </div>
          <div>
            <dt className="text-muted">{t(locale, 'cc')}</dt>
            <dd className="mt-0.5 text-foreground">
              {listing.engineCc != null ? `${listing.engineCc} cc` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t(locale, 'mileage')}</dt>
            <dd className="mt-0.5 text-foreground">
              {listing.mileage != null
                ? `${listing.mileage.toLocaleString('en-LK')} km`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t(locale, 'condition')}</dt>
            <dd className="mt-0.5 capitalize text-foreground">
              {listing.condition}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted">{t(locale, 'districtFilter')}</dt>
            <dd className="mt-0.5 truncate text-foreground">{location}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
