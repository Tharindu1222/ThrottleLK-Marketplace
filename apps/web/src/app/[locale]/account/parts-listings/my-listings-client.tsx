'use client';

import Link from 'next/link';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { PartCard, type BrowsePartCard } from '@/components/part-card';
import { Pagination } from '@/components/pagination';
import { apiGetWithMeta, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import { useUrlPage } from '@/lib/use-url-page';
import type { PaginationMeta } from '@throttlelk/types';

type PartListing = BrowsePartCard & {
  status: string;
  phoneClickCount?: number | null;
  whatsappClickCount?: number | null;
  favouriteCount?: number | null;
};

type SoldDialogState = {
  listingId: string;
  title: string;
  askingPrice: number;
};

const fieldClass =
  'w-full bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-black/10 focus:ring-accent';
const labelClass = 'mb-1.5 block text-sm text-muted';

const btnBase =
  'inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium tracking-wide transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50';
const btnGhost = `${btnBase} border border-black/[0.08] bg-[#f7f7f7] text-foreground hover:border-black/15 hover:bg-white`;
const btnSolid = `${btnBase} bg-foreground text-white hover:bg-foreground/90`;
const btnAccent = `${btnBase} bg-accent text-white hover:brightness-110`;

function todayIsoDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseSoldPrice(value: string): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function publicHref(locale: Locale, listing: PartListing) {
  const base = listing.kind === 'modified' ? 'modified-parts' : 'spare-parts';
  return `/${locale}/${base}/${listing.slug}`;
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

function MarkSoldDialog({
  locale,
  listing,
  busy,
  actionError,
  onClose,
  onSubmit,
}: {
  locale: Locale;
  listing: SoldDialogState;
  busy: boolean;
  actionError?: string | null;
  onClose: () => void;
  onSubmit: (body: { soldPriceLkr: number; soldAt?: string }) => void;
}) {
  const titleId = useId();
  const priceId = useId();
  const dateId = useId();
  const errorId = useId();
  const priceRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [soldPrice, setSoldPrice] = useState(String(listing.askingPrice));
  const [soldDate, setSoldDate] = useState(todayIsoDate);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setSoldPrice(String(listing.askingPrice));
    setSoldDate(todayIsoDate());
    setFormError(null);
  }, [listing.listingId, listing.askingPrice]);
  useEffect(() => {
    if (!mounted) return;
    priceRef.current?.focus();
  }, [mounted, listing.listingId]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const price = parseSoldPrice(soldPrice);
    if (price == null) {
      setFormError(t(locale, 'soldPriceRequired'));
      return;
    }
    onSubmit({ soldPriceLkr: price, soldAt: soldDate || undefined });
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-black/10 bg-white p-6 text-left shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)]"
      >
        <h2
          id={titleId}
          className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground"
        >
          {t(locale, 'markSold')}
        </h2>
        <p className="mt-1 truncate text-sm text-muted">{listing.title}</p>
        <div className="mt-5">
          <label className={labelClass} htmlFor={priceId}>
            {t(locale, 'soldPrice')} *
          </label>
          <input
            ref={priceRef}
            id={priceId}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={soldPrice}
            disabled={busy}
            aria-invalid={formError || actionError ? true : undefined}
            aria-describedby={formError || actionError ? errorId : undefined}
            className={fieldClass}
            onChange={(e) => {
              setSoldPrice(e.target.value);
              if (formError) setFormError(null);
            }}
          />
        </div>
        <div className="mt-4">
          <label className={labelClass} htmlFor={dateId}>
            {t(locale, 'soldDate')} ({t(locale, 'optional')})
          </label>
          <input
            id={dateId}
            type="date"
            value={soldDate}
            disabled={busy}
            className={fieldClass}
            onChange={(e) => setSoldDate(e.target.value)}
          />
        </div>
        {formError || actionError ? (
          <p id={errorId} className="mt-3 text-sm text-red-400" role="alert">
            {formError ?? actionError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} className={btnGhost} onClick={onClose}>
            {t(locale, 'cancelEdit')}
          </button>
          <button type="submit" disabled={busy} className={btnSolid}>
            {busy ? t(locale, 'saving') : t(locale, 'markSold')}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function ListingActions({
  locale,
  listing,
  busy,
  runAction,
  onMarkSold,
  dense = false,
}: {
  locale: Locale;
  listing: PartListing;
  busy: boolean;
  runAction: (listingId: string, path: string) => void;
  onMarkSold: (listing: PartListing) => void;
  dense?: boolean;
}) {
  const viewHref = publicHref(locale, listing);
  const viewLabel = dense ? t(locale, 'viewShort') : t(locale, 'viewListing');
  const soldLabel = dense ? t(locale, 'markSoldShort') : t(locale, 'markSold');

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
      aria-haspopup="dialog"
      onClick={() => onMarkSold(listing)}
    >
      <ActionIcon>
        <path d="M12 3l7 4v5c0 5-3.5 8.5-7 10-4.5-1.5-8-5-8-10V7l7-4z" />
        <path d="M9 12l2 2 4-4" />
      </ActionIcon>
      <span className="truncate">{soldLabel}</span>
    </button>
  );

  const pauseBtn = (
    <button
      type="button"
      disabled={busy}
      className={btnGhost}
      onClick={() =>
        runAction(listing.id, `/api/v1/part-listings/${listing.id}/pause`)
      }
    >
      <span className="truncate">{t(locale, 'pauseListing')}</span>
    </button>
  );

  return (
    <div
      className={dense ? 'grid grid-cols-2 gap-1.5 sm:grid-cols-3' : 'flex flex-wrap gap-1.5'}
      aria-busy={busy}
    >
      {listing.status === 'active' ? (
        <>
          {viewBtn}
          {pauseBtn}
          {soldBtn}
          <Link
            href={`/${locale}/account/parts-listings/${listing.id}/promote`}
            className={btnGhost}
          >
            <span className="truncate">{t(locale, 'promoteListing')}</span>
          </Link>
        </>
      ) : null}
      {listing.status === 'paused' ? (
        <>
          <button
            type="button"
            disabled={busy}
            className={btnAccent}
            onClick={() =>
              runAction(listing.id, `/api/v1/part-listings/${listing.id}/resume`)
            }
          >
            <span className="truncate">{t(locale, 'resumeListing')}</span>
          </button>
          {soldBtn}
        </>
      ) : null}
      {['draft', 'rejected'].includes(listing.status) ? (
        <button
          type="button"
          disabled={busy}
          className={btnAccent}
          onClick={() =>
            runAction(listing.id, `/api/v1/part-listings/${listing.id}/submit`)
          }
        >
          <span className="truncate">{t(locale, 'submitForReview')}</span>
        </button>
      ) : null}
      {listing.status === 'sold' || listing.status === 'pending_review'
        ? viewBtn
        : null}
    </div>
  );
}

export function MyPartsListingsClient({
  locale,
  embedded = false,
  layout = 'cards',
}: {
  locale: Locale;
  embedded?: boolean;
  layout?: 'rows' | 'cards';
}) {
  const { page, goTo } = useUrlPage();
  const [token, setToken] = useState<string | null>(null);
  const [listings, setListings] = useState<PartListing[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [soldDialog, setSoldDialog] = useState<SoldDialogState | null>(null);

  async function load(access: string, pageNum = page) {
    setLoading(true);
    try {
      const { data, meta: nextMeta } = await apiGetWithMeta<PartListing[]>(
        '/api/v1/part-listings/mine',
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
      setListings(data);
      if (nextMeta) setMeta(nextMeta);
    } finally {
      setLoading(false);
    }
  }

  function runAction(listingId: string, path: string) {
    if (!token) return;
    setBusyId(listingId);
    setError(null);
    void apiSend(path, { token })
      .then(() => load(token, page))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Action failed'),
      )
      .finally(() => setBusyId(null));
  }

  function openSoldDialog(listing: PartListing) {
    setError(null);
    setSoldDialog({
      listingId: listing.id,
      title: listing.title,
      askingPrice: listing.priceLkr,
    });
  }

  function submitSold(body: { soldPriceLkr: number; soldAt?: string }) {
    if (!token || !soldDialog) return;
    setBusyId(soldDialog.listingId);
    setError(null);
    void apiSend(`/api/v1/part-listings/${soldDialog.listingId}/mark-sold`, {
      method: 'POST',
      token,
      body: {
        soldPriceLkr: body.soldPriceLkr,
        soldAt: body.soldAt,
      },
    })
      .then(() => {
        setSoldDialog(null);
        return load(token, page);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Action failed'),
      )
      .finally(() => setBusyId(null));
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
    if (embedded) return null;
    return (
      <p className="mt-8 text-muted">
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/parts-listings`)}`}
          className="text-accent underline"
        >
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  return (
    <div className={embedded ? 'mt-0' : 'mt-8'}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {(meta.total || listings.length) === 1
            ? t(locale, 'resultCountPartsOne')
            : t(locale, 'resultCountParts').replace(
                '{count}',
                String(meta.total || listings.length),
              )}
        </p>
        <Link
          href={`/${locale}/account/parts-listings/new`}
          className="bg-accent px-4 py-2 font-[family-name:var(--font-display)] text-sm tracking-wide text-white transition hover:brightness-110"
        >
          {t(locale, 'createPartListing')}
        </Link>
      </div>

      {error && !soldDialog ? (
        <p className="mb-4 text-sm text-red-400">{error}</p>
      ) : null}

      <div
        aria-busy={loading}
        className={loading ? 'pointer-events-none opacity-60' : undefined}
      >
        {listings.length === 0 ? (
          <div className="border border-dashed border-black/15 px-6 py-14 text-center">
            <p className="text-muted">{t(locale, 'noPartsListings')}</p>
            <Link
              href={`/${locale}/account/parts-listings/new`}
              className="mt-4 inline-flex bg-accent px-4 py-2 text-sm text-white transition hover:brightness-110"
            >
              {t(locale, 'createPartListing')}
            </Link>
          </div>
        ) : layout === 'cards' ? (
          <ul className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {listings.map((listing) => {
              const busy = busyId === listing.id;
              return (
                <li key={listing.id} className="min-h-0">
                  <PartCard
                    locale={locale}
                    part={listing}
                    href={
                      listing.status === 'active' || listing.status === 'sold'
                        ? publicHref(locale, listing)
                        : undefined
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
                        onMarkSold={openSoldDialog}
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
                    onMarkSold={openSoldDialog}
                  />
                </li>
              );
            })}
          </ul>
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
      {soldDialog ? (
        <MarkSoldDialog
          locale={locale}
          listing={soldDialog}
          busy={busyId === soldDialog.listingId}
          actionError={error}
          onClose={() => {
            setSoldDialog(null);
            setError(null);
          }}
          onSubmit={submitSold}
        />
      ) : null}
    </div>
  );
}
