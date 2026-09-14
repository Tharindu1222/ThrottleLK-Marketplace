'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type Listing = {
  id: string;
  slug: string;
  title: string;
  status: string;
  priceLkr: number;
  coverImageUrl?: string | null;
};

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function statusLabel(locale: Locale, status: string) {
  switch (status) {
    case 'draft':
      return t(locale, 'statusDraft');
    case 'pending_review':
      return t(locale, 'statusPendingReview');
    case 'active':
      return t(locale, 'statusActive');
    case 'paused':
      return t(locale, 'statusPaused');
    case 'rejected':
      return t(locale, 'statusRejected');
    case 'sold':
      return t(locale, 'statusSold');
    default:
      return status.replace(/_/g, ' ');
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/15 text-emerald-800 ring-emerald-500/30';
    case 'pending_review':
      return 'bg-amber-500/15 text-amber-800 ring-amber-500/30';
    case 'draft':
      return 'bg-black/5 text-muted ring-black/15';
    case 'paused':
      return 'bg-sky-500/15 text-sky-800 ring-sky-500/30';
    case 'rejected':
      return 'bg-red-500/15 text-red-700 ring-red-500/30';
    case 'sold':
      return 'bg-black/5 text-muted ring-black/10';
    default:
      return 'bg-black/5 text-muted ring-black/10';
  }
}

const btnSecondary =
  'inline-flex items-center justify-center border border-black/15 px-2.5 py-1.5 text-xs text-foreground transition hover:border-accent hover:text-accent disabled:opacity-50';
const btnPrimary =
  'inline-flex items-center justify-center bg-accent px-2.5 py-1.5 text-xs text-white transition hover:brightness-110 disabled:opacity-50';

function ListingActions({
  locale,
  listing,
  busy,
  runAction,
  dense = false,
}: {
  locale: Locale;
  listing: Listing;
  busy: boolean;
  runAction: (listingId: string, path: string) => void;
  dense?: boolean;
}) {
  const wrap = dense
    ? 'grid grid-cols-2 gap-1.5'
    : 'flex flex-wrap gap-1.5';
  const full = dense ? 'w-full' : '';

  return (
    <div className={wrap}>
      {listing.status !== 'sold' ? (
        <Link
          href={`/${locale}/account/listings/${listing.id}/edit`}
          className={`${btnSecondary} ${full} ${
            dense && listing.status === 'pending_review' ? 'col-span-2' : ''
          }`}
        >
          {t(locale, 'editListing')}
        </Link>
      ) : null}

      {listing.status === 'active' ? (
        <>
          <Link
            href={`/${locale}/bikes/${listing.slug}`}
            className={`${btnSecondary} ${full}`}
          >
            {t(locale, 'viewListing')}
          </Link>
          <button
            type="button"
            disabled={busy}
            className={`${btnSecondary} ${full}`}
            onClick={() =>
              runAction(listing.id, `/api/v1/listings/${listing.id}/pause`)
            }
          >
            {t(locale, 'pauseListing')}
          </button>
          <button
            type="button"
            disabled={busy}
            className={`${btnSecondary} ${full}`}
            onClick={() =>
              runAction(listing.id, `/api/v1/listings/${listing.id}/mark-sold`)
            }
          >
            {t(locale, 'markSold')}
          </button>
        </>
      ) : null}

      {listing.status === 'paused' ? (
        <>
          <button
            type="button"
            disabled={busy}
            className={`${btnPrimary} ${full}`}
            onClick={() =>
              runAction(listing.id, `/api/v1/listings/${listing.id}/resume`)
            }
          >
            {t(locale, 'resumeListing')}
          </button>
          <button
            type="button"
            disabled={busy}
            className={`${btnSecondary} ${full}`}
            onClick={() =>
              runAction(listing.id, `/api/v1/listings/${listing.id}/mark-sold`)
            }
          >
            {t(locale, 'markSold')}
          </button>
        </>
      ) : null}

      {['draft', 'rejected'].includes(listing.status) ? (
        <button
          type="button"
          disabled={busy}
          className={`${btnPrimary} ${full} ${dense ? 'col-span-2' : ''}`}
          onClick={() =>
            runAction(listing.id, `/api/v1/listings/${listing.id}/submit`)
          }
        >
          {t(locale, 'submitForReview')}
        </button>
      ) : null}

      {listing.status === 'sold' ? (
        <Link
          href={`/${locale}/bikes/${listing.slug}`}
          className={`${btnSecondary} ${full} ${dense ? 'col-span-2' : ''}`}
        >
          {t(locale, 'viewListing')}
        </Link>
      ) : null}
    </div>
  );
}

export function MyListingsClient({
  locale,
  embedded = false,
  layout = 'rows',
}: {
  locale: Locale;
  embedded?: boolean;
  layout?: 'rows' | 'cards';
}) {
  const [token, setToken] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(access: string) {
    const data = await apiGet<Listing[]>('/api/v1/listings/mine', {
      token: access,
    });
    setListings(data);
  }

  function runAction(listingId: string, path: string) {
    if (!token) return;
    setBusyId(listingId);
    setError(null);
    void apiSend(path, { token })
      .then(() => load(token))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Action failed'),
      )
      .finally(() => setBusyId(null));
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed'),
    );
  }, []);

  if (!token) {
    if (embedded) return null;
    return (
      <p className="mt-8 text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  return (
    <div className={embedded ? 'mt-0' : 'mt-8'}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {listings.length === 1
            ? t(locale, 'resultCountOne')
            : t(locale, 'resultCount').replace(
                '{count}',
                String(listings.length),
              )}
        </p>
        <Link
          href={`/${locale}/sell`}
          className="bg-accent px-4 py-2 font-[family-name:var(--font-display)] text-sm tracking-wide text-white transition hover:brightness-110"
        >
          {t(locale, 'createListing')}
        </Link>
      </div>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      {listings.length === 0 ? (
        <div className="border border-dashed border-black/15 px-6 py-14 text-center">
          <p className="text-muted">{t(locale, 'noListingsYet')}</p>
          <Link
            href={`/${locale}/sell`}
            className="mt-4 inline-flex bg-accent px-4 py-2 text-sm text-white transition hover:brightness-110"
          >
            {t(locale, 'createListing')}
          </Link>
        </div>
      ) : layout === 'cards' ? (
        <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => {
            const busy = busyId === listing.id;
            return (
              <li key={listing.id} className="min-h-0">
                <article className="flex h-full flex-col overflow-hidden border border-black/10 bg-surface/50 transition hover:border-black/20">
                  <div className="relative h-40 shrink-0 overflow-hidden bg-background sm:h-44">
                    {listing.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted">
                        No photo
                      </div>
                    )}
                    <span
                      className={`absolute top-2 left-2 inline-flex px-2 py-0.5 text-[11px] ring-1 backdrop-blur-sm ${statusBadgeClass(listing.status)}`}
                    >
                      {statusLabel(locale, listing.status)}
                    </span>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col p-3.5">
                    <h3 className="line-clamp-2 min-h-[2.75rem] font-[family-name:var(--font-display)] text-[15px] leading-snug tracking-wide">
                      {listing.title}
                    </h3>
                    <p className="mt-1.5 text-sm font-medium text-accent">
                      {formatLkr(listing.priceLkr)}
                    </p>

                    <div className="mt-auto border-t border-black/10 pt-3">
                      <div className="min-h-[76px]">
                        <ListingActions
                          locale={locale}
                          listing={listing}
                          busy={busy}
                          runAction={runAction}
                          dense
                        />
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="divide-y divide-black/10 border border-black/10">
          {listings.map((listing) => {
            const busy = busyId === listing.id;
            return (
              <li
                key={listing.id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="h-16 w-24 shrink-0 overflow-hidden bg-background/80 ring-1 ring-black/10 sm:h-20 sm:w-28">
                    {listing.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[11px] text-muted">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-[family-name:var(--font-display)] text-lg tracking-wide sm:text-xl">
                        {listing.title}
                      </h2>
                      <span
                        className={`inline-flex shrink-0 px-2 py-0.5 text-xs ring-1 ${statusBadgeClass(listing.status)}`}
                      >
                        {statusLabel(locale, listing.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-accent">
                      {formatLkr(listing.priceLkr)}
                    </p>
                  </div>
                </div>
                <ListingActions
                  locale={locale}
                  listing={listing}
                  busy={busy}
                  runAction={runAction}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
