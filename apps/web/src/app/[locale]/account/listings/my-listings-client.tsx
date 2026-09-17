'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type Listing = BrowseListingCard & { status: string };

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

const btnBase =
  'inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium tracking-wide transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50';
const btnGhost = `${btnBase} border border-black/[0.08] bg-[#f7f7f7] text-foreground hover:border-black/15 hover:bg-white hover:shadow-[0_1px_2px_rgba(15,15,15,0.06)]`;
const btnSolid = `${btnBase} bg-foreground text-white hover:bg-foreground/90`;
const btnAccent = `${btnBase} bg-accent text-white hover:brightness-110`;

function ActionIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

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
  const editHref = `/${locale}/account/listings/${listing.id}/edit`;
  const viewHref = `/${locale}/bikes/${listing.slug}`;
  const viewLabel = dense ? t(locale, 'viewShort') : t(locale, 'viewListing');
  const soldLabel = dense ? t(locale, 'markSoldShort') : t(locale, 'markSold');

  const editBtn = listing.status !== 'sold' ? (
    <Link href={editHref} className={btnGhost}>
      <ActionIcon>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </ActionIcon>
      <span className="truncate">{t(locale, 'editListing')}</span>
    </Link>
  ) : null;

  const viewBtn = (
    <Link href={viewHref} className={listing.status === 'active' ? btnSolid : btnGhost}>
      <ActionIcon>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </ActionIcon>
      <span className="truncate">{viewLabel}</span>
    </Link>
  );

  const soldBtn = (
    <button
      type="button"
      disabled={busy}
      className={btnGhost}
      onClick={() =>
        runAction(listing.id, `/api/v1/listings/${listing.id}/mark-sold`)
      }
    >
      <ActionIcon>
        <path d="M12 3l7 4v5c0 5-3.5 8.5-7 10-4.5-1.5-8-5-8-10V7l7-4z" />
        <path d="M9 12l2 2 4-4" />
      </ActionIcon>
      <span className="truncate">{soldLabel}</span>
    </button>
  );

  const wrap =
    listing.status === 'active' || listing.status === 'paused'
      ? 'grid grid-cols-3 gap-1.5'
      : ['draft', 'rejected'].includes(listing.status)
        ? 'grid grid-cols-2 gap-1.5'
        : 'grid grid-cols-1 gap-1.5';

  return (
    <div className={dense ? wrap : 'flex flex-wrap gap-1.5'} aria-busy={busy}>
      {listing.status === 'active' ? (
        <>
          {viewBtn}
          {editBtn}
          {soldBtn}
        </>
      ) : null}

      {listing.status === 'paused' ? (
        <>
          <button
            type="button"
            disabled={busy}
            className={btnAccent}
            onClick={() =>
              runAction(listing.id, `/api/v1/listings/${listing.id}/resume`)
            }
          >
            <span className="truncate">{t(locale, 'resumeListing')}</span>
          </button>
          {editBtn}
          {soldBtn}
        </>
      ) : null}

      {listing.status === 'pending_review' ? editBtn : null}

      {['draft', 'rejected'].includes(listing.status) ? (
        <>
          {editBtn}
          <button
            type="button"
            disabled={busy}
            className={btnAccent}
            onClick={() =>
              runAction(listing.id, `/api/v1/listings/${listing.id}/submit`)
            }
          >
            <span className="truncate">{t(locale, 'submitForReview')}</span>
          </button>
        </>
      ) : null}

      {listing.status === 'sold' ? viewBtn : null}
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
        <ul className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {listings.map((listing) => {
            const busy = busyId === listing.id;
            return (
              <li key={listing.id} className="min-h-0">
                <ListingCard
                  locale={locale}
                  listing={listing}
                  href={
                    listing.status === 'active' || listing.status === 'sold'
                      ? `/${locale}/bikes/${listing.slug}`
                      : `/${locale}/account/listings/${listing.id}/edit`
                  }
                  statusBadge={{
                    label: statusLabel(locale, listing.status),
                    status: listing.status,
                  }}
                  showFavourite={false}
                  footer={
                    <ListingActions
                      locale={locale}
                      listing={listing}
                      busy={busy}
                      runAction={runAction}
                      dense
                    />
                  }
                />
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
