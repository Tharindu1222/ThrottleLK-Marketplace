'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Pagination } from '@/components/pagination';
import { apiGetWithMeta, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type {
  PendingDealer,
  PendingListing,
  PendingPartListing,
} from '@/lib/admin-types';
import { t } from '@/lib/i18n';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import type { PaginationMeta } from '@throttlelk/types';

type QueueId = 'listings' | 'part-listings' | 'dealers' | 'parts-dealers';

const QUEUES: { id: QueueId; label: string }[] = [
  { id: 'listings', label: 'Listings' },
  { id: 'part-listings', label: 'Part listings' },
  { id: 'dealers', label: 'Dealers' },
  { id: 'parts-dealers', label: 'Parts dealers' },
];

function locationLabel(
  city?: { name: string } | null,
  district?: { name: string } | null,
) {
  const bits = [city?.name, district?.name].filter(Boolean);
  return bits.join(', ');
}

function ReviewDetails({
  description,
  location,
  phone,
  email,
  address,
  imageUrls,
}: {
  description?: string | null;
  location?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  imageUrls?: string[];
}) {
  const extras = (imageUrls ?? []).filter(Boolean);
  if (!description && !location && !phone && !email && !address && extras.length < 2) {
    return null;
  }
  return (
    <div className="mt-3 space-y-2 border-t border-[var(--admin-border)] pt-3 text-sm">
      {location ? (
        <p className="text-[var(--admin-text)]">Location: {location}</p>
      ) : null}
      {phone ? <p className="text-[var(--admin-text)]">Phone: {phone}</p> : null}
      {email ? <p className="text-[var(--admin-text)]">Email: {email}</p> : null}
      {address ? (
        <p className="text-[var(--admin-text)]">Address: {address}</p>
      ) : null}
      {description ? (
        <p className="whitespace-pre-wrap text-[var(--admin-muted)]">
          {description}
        </p>
      ) : null}
      {extras.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {extras.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="h-16 w-24 shrink-0 rounded-md object-cover ring-1 ring-[var(--admin-border)]"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function sellerName(listing: PendingListing) {
  const first = listing.seller?.firstName?.trim() ?? '';
  const last = listing.seller?.lastName?.trim() ?? '';
  const name = `${first} ${last}`.trim();
  return name || 'Unknown seller';
}

function formatSubmittedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const DUPLICATE_REASON_KEYS = {
  same_seller_model_year: 'duplicateSameSellerModelYear',
  same_phone_model: 'duplicateSamePhoneModel',
  same_title: 'duplicateSameTitle',
  similar_title: 'duplicateSimilarTitle',
} as const;

function DuplicateSignals({ listing }: { listing: PendingListing }) {
  const signals = listing.duplicateSignals ?? [];
  if (signals.length === 0) return null;
  const reasons = [...new Set(signals.flatMap((row) => row.reasons))];
  const headingId = `dup-${listing.id}`;
  return (
    <div
      className="mt-2 rounded-lg border border-[var(--admin-warning)]/40 bg-[var(--admin-warning)]/10 px-2.5 py-2"
      role="status"
      aria-live="polite"
      aria-labelledby={headingId}
    >
      <p
        id={headingId}
        className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-warning)]"
      >
        {t('en', 'duplicateSignals')}
        {listing.duplicateCount ? ` · ${listing.duplicateCount}` : ''}
      </p>
      <ul className="mt-1 space-y-0.5 text-xs text-[var(--admin-text)]">
        {reasons.map((reason) => (
          <li key={reason}>{t('en', DUPLICATE_REASON_KEYS[reason])}</li>
        ))}
      </ul>
    </div>
  );
}

function CoverThumb({
  url,
  title,
}: {
  url?: string | null;
  title: string;
}) {
  return (
    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface)] ring-1 ring-[var(--admin-border)] sm:h-20 sm:w-28">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-[var(--admin-faint)]">
          No photo
        </div>
      )}
    </div>
  );
}

function RejectInline({
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  busy,
  itemLabel,
}: {
  reason: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
  itemLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `reject-reason-${itemLabel.replace(/\s+/g, '-').slice(0, 40)}`;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="mt-3 rounded-lg border border-[var(--admin-danger)]/25 bg-[var(--admin-danger)]/5 p-3"
      role="group"
      aria-label={`Reject ${itemLabel}`}
    >
      <label
        htmlFor={inputId}
        className="mb-2 block text-xs font-medium text-[var(--admin-danger)]"
      >
        Rejection reason (min. 5 characters)
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={inputId}
          ref={inputRef}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Explain why this is being rejected"
          aria-required="true"
          disabled={busy}
          className="admin-field-inline w-full! min-w-0! max-w-none! flex-1 sm:min-w-[12rem]!"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="admin-btn-ghost px-3 py-1.5 text-sm"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--admin-danger)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={busy}
            aria-label={`Confirm reject of ${itemLabel}`}
            onClick={onConfirm}
          >
            Confirm reject
          </button>
        </div>
      </div>
    </div>
  );
}

const QUEUE_IDS: QueueId[] = [
  'listings',
  'part-listings',
  'dealers',
  'parts-dealers',
];

function queueFromParam(value?: string): QueueId | null {
  return QUEUE_IDS.find((id) => id === value) ?? null;
}

export function AdminModeration({
  search = '',
  initialQueue,
}: {
  search?: string;
  initialQueue?: string;
}) {
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'en';
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingListing[]>([]);
  const [partListings, setPartListings] = useState<PendingPartListing[]>([]);
  const [dealers, setDealers] = useState<PendingDealer[]>([]);
  const [partsDealers, setPartsDealers] = useState<PendingDealer[]>([]);
  const [listingMeta, setListingMeta] = useState<PaginationMeta>(emptyMeta);
  const [partListingMeta, setPartListingMeta] =
    useState<PaginationMeta>(emptyMeta);
  const [dealerMeta, setDealerMeta] = useState<PaginationMeta>(emptyMeta);
  const [partsDealerMeta, setPartsDealerMeta] =
    useState<PaginationMeta>(emptyMeta);
  const [listingPage, setListingPage] = useState(1);
  const [partListingPage, setPartListingPage] = useState(1);
  const [dealerPage, setDealerPage] = useState(1);
  const [partsDealerPage, setPartsDealerPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [partRejectId, setPartRejectId] = useState<string | null>(null);
  const [dealerRejectId, setDealerRejectId] = useState<string | null>(null);
  const [partsDealerRejectId, setPartsDealerRejectId] = useState<string | null>(
    null,
  );
  const [reason, setReason] = useState('');
  const [partReason, setPartReason] = useState('');
  const [dealerReason, setDealerReason] = useState('');
  const [partsDealerReason, setPartsDealerReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const presetQueue = queueFromParam(initialQueue);
  const [activeQueue, setActiveQueue] = useState<QueueId>(
    presetQueue ?? 'listings',
  );
  const [userPickedQueue, setUserPickedQueue] = useState(Boolean(presetQueue));
  const didAutoPick = useRef(false);

  async function loadListings(access: string, pageNum: number, q: string) {
    const { data, meta } = await apiGetWithMeta<PendingListing[]>(
      '/api/v1/admin/listings/pending',
      {
        token: access,
        searchParams: {
          page: String(pageNum),
          limit: '20',
          q: q || undefined,
        },
      },
    );
    const clamp = clampedPage(meta, data.length);
    if (clamp != null && clamp !== pageNum) {
      setListingPage(clamp);
      return;
    }
    setPending(data);
    if (meta) setListingMeta(meta);
  }

  async function loadPartListings(access: string, pageNum: number, q: string) {
    const { data, meta } = await apiGetWithMeta<PendingPartListing[]>(
      '/api/v1/admin/part-listings/pending',
      {
        token: access,
        searchParams: {
          page: String(pageNum),
          limit: '20',
          q: q || undefined,
        },
      },
    );
    const clamp = clampedPage(meta, data.length);
    if (clamp != null && clamp !== pageNum) {
      setPartListingPage(clamp);
      return;
    }
    setPartListings(data);
    if (meta) setPartListingMeta(meta);
  }

  async function loadDealers(access: string, pageNum: number, q: string) {
    const { data, meta } = await apiGetWithMeta<PendingDealer[]>(
      '/api/v1/admin/dealers/pending',
      {
        token: access,
        searchParams: {
          page: String(pageNum),
          limit: '20',
          q: q || undefined,
        },
      },
    );
    const clamp = clampedPage(meta, data.length);
    if (clamp != null && clamp !== pageNum) {
      setDealerPage(clamp);
      return;
    }
    setDealers(data);
    if (meta) setDealerMeta(meta);
  }

  async function loadPartsDealers(access: string, pageNum: number, q: string) {
    const { data, meta } = await apiGetWithMeta<PendingDealer[]>(
      '/api/v1/admin/parts-dealers/pending',
      {
        token: access,
        searchParams: {
          page: String(pageNum),
          limit: '20',
          q: q || undefined,
        },
      },
    );
    const clamp = clampedPage(meta, data.length);
    if (clamp != null && clamp !== pageNum) {
      setPartsDealerPage(clamp);
      return;
    }
    setPartsDealers(data);
    if (meta) setPartsDealerMeta(meta);
  }

  async function load(access: string) {
    setLoading(true);
    try {
      await Promise.all([
        loadListings(access, listingPage, search),
        loadPartListings(access, partListingPage, search),
        loadDealers(access, dealerPage, search),
        loadPartsDealers(access, partsDealerPage, search),
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setListingPage(1);
    setPartListingPage(1);
    setDealerPage(1);
    setPartsDealerPage(1);
    didAutoPick.current = false;
    setUserPickedQueue(false);
  }, [search]);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    setLoading(true);
    void Promise.all([
      loadListings(access, listingPage, search),
      loadPartListings(access, partListingPage, search),
      loadDealers(access, dealerPage, search),
      loadPartsDealers(access, partsDealerPage, search),
    ])
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingPage, partListingPage, dealerPage, partsDealerPage, search]);

  const counts: Record<QueueId, number> = {
    listings: listingMeta.total,
    'part-listings': partListingMeta.total,
    dealers: dealerMeta.total,
    'parts-dealers': partsDealerMeta.total,
  };

  useEffect(() => {
    if (loading || userPickedQueue || didAutoPick.current) return;
    const byId: Record<QueueId, number> = {
      listings: listingMeta.total,
      'part-listings': partListingMeta.total,
      dealers: dealerMeta.total,
      'parts-dealers': partsDealerMeta.total,
    };
    const first = QUEUES.find((q) => byId[q.id] > 0);
    if (first) {
      setActiveQueue(first.id);
      didAutoPick.current = true;
    }
  }, [
    loading,
    userPickedQueue,
    listingMeta.total,
    partListingMeta.total,
    dealerMeta.total,
    partsDealerMeta.total,
  ]);

  if (!token) return null;

  const queuesEmpty =
    pending.length === 0 &&
    partListings.length === 0 &&
    dealers.length === 0 &&
    partsDealers.length === 0;

  const allClear = !loading && queuesEmpty && !search.trim();
  const searchEmpty = !loading && queuesEmpty && Boolean(search.trim());

  const queueChips = QUEUES.map((q) => ({
    id: q.id,
    label: q.label,
    count: counts[q.id],
  }));

  const activeLabel =
    QUEUES.find((q) => q.id === activeQueue)?.label ?? 'Listings';
  const activeTotal = counts[activeQueue];
  const nextNonEmpty = QUEUES.find(
    (q) => q.id !== activeQueue && counts[q.id] > 0,
  );

  function pickQueue(id: QueueId) {
    setUserPickedQueue(true);
    setActiveQueue(id);
    setRejectId(null);
    setPartRejectId(null);
    setDealerRejectId(null);
    setPartsDealerRejectId(null);
    setReason('');
    setPartReason('');
    setDealerReason('');
    setPartsDealerReason('');
  }

  async function runAction(
    id: string,
    label: string,
    action: () => Promise<void>,
  ) {
    setBusyId(id);
    setError(null);
    setStatusMsg(null);
    try {
      await action();
      setStatusMsg(label);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  function confirmReject(
    id: string,
    value: string,
    clear: () => void,
    request: () => Promise<void>,
    successLabel: string,
  ) {
    if (value.trim().length < 5) {
      setError('Reason must be at least 5 characters');
      return;
    }
    void runAction(id, successLabel, async () => {
      await request();
      clear();
    });
  }

  const tablist = (
    <div
      role="tablist"
      aria-label="Moderation queues"
      className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-0.5"
    >
      {QUEUES.map((q) => {
        const count = counts[q.id];
        const selected = activeQueue === q.id;
        return (
          <button
            key={q.id}
            type="button"
            role="tab"
            id={`moderation-tab-${q.id}`}
            aria-selected={selected}
            aria-controls={`moderation-panel-${q.id}`}
            aria-label={`${q.label}, ${count} pending`}
            className={`min-h-9 min-w-[7rem] flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              selected
                ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent-2)]'
                : 'text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]'
            }`}
            onClick={() => pickQueue(q.id)}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {q.label}
              <span
                className={`tabular-nums rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                  count > 0
                    ? 'bg-[var(--admin-accent)] text-white'
                    : 'bg-[var(--admin-surface-2)] text-[var(--admin-faint)]'
                }`}
              >
                {count}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );

  function renderEmptyPanel() {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <p className="text-sm font-medium text-[var(--admin-text)]">
          No pending {activeLabel.toLowerCase()}
        </p>
        <p className="mt-1 max-w-sm text-sm text-[var(--admin-muted)]">
          {search.trim()
            ? `Nothing in this queue matches “${search.trim()}”.`
            : 'Switch queues above — other tabs may still have items.'}
        </p>
        {nextNonEmpty ? (
          <button
            type="button"
            className="admin-btn-ghost mt-4 px-3 py-1.5 text-sm"
            onClick={() => pickQueue(nextNonEmpty.id)}
          >
            Go to {nextNonEmpty.label} ({counts[nextNonEmpty.id]})
          </button>
        ) : null}
      </div>
    );
  }

  function renderListingsPanel() {
    if (pending.length === 0) return renderEmptyPanel();
    return (
      <>
        <div className="space-y-3">
          {pending.map((listing) => {
            const rejecting = rejectId === listing.id;
            const busy = busyId === listing.id;
            return (
              <article
                key={listing.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)]/60 p-4"
                aria-busy={busy}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <CoverThumb
                      url={listing.coverImageUrl}
                      title={listing.title}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-[var(--admin-text)]">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-[var(--admin-muted)]">
                        Rs. {listing.priceLkr.toLocaleString('en-LK')} ·{' '}
                        {listing.manufactureYear}
                      </p>
                      <p className="mt-1 text-sm text-[var(--admin-text)]">
                        Posted by {sellerName(listing)}
                      </p>
                      {listing.updatedAt ? (
                        <p className="text-xs text-[var(--admin-faint)]">
                          <time dateTime={listing.updatedAt}>
                            Submitted {formatSubmittedAt(listing.updatedAt)}
                          </time>
                        </p>
                      ) : null}
                      <DuplicateSignals listing={listing} />
                      <ReviewDetails
                        description={listing.description}
                        location={locationLabel(listing.city, listing.district)}
                        phone={listing.phone}
                        email={listing.seller?.email}
                        imageUrls={listing.imageUrls}
                      />
                      {listing.seller?.id ? (
                        <Link
                          href={`/${locale}/admin/listings?sellerId=${listing.seller.id}`}
                          className="mt-2 inline-flex text-sm text-[var(--admin-accent)] hover:underline"
                        >
                          Open in listings
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className="flex flex-wrap gap-2 sm:shrink-0"
                    role="group"
                    aria-label={`Actions for ${listing.title}`}
                  >
                    <button
                      type="button"
                      className="admin-btn-primary inline-flex min-h-11 items-center px-3 py-1.5 text-sm disabled:opacity-50"
                      disabled={busy}
                      aria-label={`Approve listing ${listing.title}`}
                      onClick={() =>
                        void runAction(
                          listing.id,
                          `Approved “${listing.title}”`,
                          () =>
                            apiSend(
                              `/api/v1/admin/listings/${listing.id}/approve`,
                              { token },
                            ),
                        )
                      }
                    >
                      Approve
                    </button>
                    {!rejecting ? (
                      <button
                        type="button"
                        className="admin-btn-ghost px-3 py-1.5 text-sm disabled:opacity-50"
                        disabled={busy}
                        aria-label={`Reject listing ${listing.title}`}
                        onClick={() => {
                          setRejectId(listing.id);
                          setReason('');
                        }}
                      >
                        Reject
                      </button>
                    ) : null}
                  </div>
                </div>
                {rejecting ? (
                  <RejectInline
                    reason={reason}
                    onReasonChange={setReason}
                    busy={busy}
                    itemLabel={listing.title}
                    onCancel={() => {
                      setRejectId(null);
                      setReason('');
                    }}
                    onConfirm={() =>
                      confirmReject(
                        listing.id,
                        reason,
                        () => {
                          setRejectId(null);
                          setReason('');
                        },
                        () =>
                          apiSend(
                            `/api/v1/admin/listings/${listing.id}/reject`,
                            { token, body: { reason } },
                          ),
                        `Rejected “${listing.title}”`,
                      )
                    }
                  />
                ) : null}
              </article>
            );
          })}
        </div>
        <Pagination
          variant="admin"
          page={listingMeta.page}
          totalPages={listingMeta.totalPages}
          hasPreviousPage={listingMeta.hasPreviousPage}
          hasNextPage={listingMeta.hasNextPage}
          total={listingMeta.total}
          limit={listingMeta.limit}
          disabled={loading}
          scroll={false}
          onPage={setListingPage}
        />
      </>
    );
  }

  function renderPartListingsPanel() {
    if (partListings.length === 0) return renderEmptyPanel();
    return (
      <>
        <div className="space-y-3">
          {partListings.map((listing) => {
            const rejecting = partRejectId === listing.id;
            const busy = busyId === listing.id;
            return (
              <article
                key={listing.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)]/60 p-4"
                aria-busy={busy}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <CoverThumb
                      url={listing.coverImageUrl}
                      title={listing.title}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-[var(--admin-text)]">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-[var(--admin-muted)]">
                        Rs. {listing.priceLkr.toLocaleString('en-LK')} ·{' '}
                        {listing.kind}
                      </p>
                      <p className="mt-1 text-sm text-[var(--admin-text)]">
                        Shop:{' '}
                        {listing.partsDealer?.name ?? 'Unknown shop'}
                      </p>
                      {listing.updatedAt ? (
                        <p className="text-xs text-[var(--admin-faint)]">
                          <time dateTime={listing.updatedAt}>
                            Submitted {formatSubmittedAt(listing.updatedAt)}
                          </time>
                        </p>
                      ) : null}
                      <ReviewDetails
                        description={listing.description}
                        location={locationLabel(listing.city, listing.district)}
                        phone={listing.phone ?? listing.partsDealer?.phone}
                        email={listing.partsDealer?.email}
                        address={listing.partsDealer?.address}
                        imageUrls={listing.imageUrls}
                      />
                      {listing.partsDealer?.id ? (
                        <Link
                          href={`/${locale}/admin/parts-dealers/${listing.partsDealer.id}`}
                          className="mt-2 inline-flex text-sm text-[var(--admin-accent)] hover:underline"
                        >
                          Open shop
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className="flex flex-wrap gap-2 sm:shrink-0"
                    role="group"
                    aria-label={`Actions for ${listing.title}`}
                  >
                    <button
                      type="button"
                      className="admin-btn-primary inline-flex min-h-11 items-center px-3 py-1.5 text-sm disabled:opacity-50"
                      disabled={busy}
                      aria-label={`Approve part listing ${listing.title}`}
                      onClick={() =>
                        void runAction(
                          listing.id,
                          `Approved “${listing.title}”`,
                          () =>
                            apiSend(
                              `/api/v1/admin/part-listings/${listing.id}/approve`,
                              { token },
                            ),
                        )
                      }
                    >
                      Approve
                    </button>
                    {!rejecting ? (
                      <button
                        type="button"
                        className="admin-btn-ghost px-3 py-1.5 text-sm disabled:opacity-50"
                        disabled={busy}
                        aria-label={`Reject part listing ${listing.title}`}
                        onClick={() => {
                          setPartRejectId(listing.id);
                          setPartReason('');
                        }}
                      >
                        Reject
                      </button>
                    ) : null}
                  </div>
                </div>
                {rejecting ? (
                  <RejectInline
                    reason={partReason}
                    onReasonChange={setPartReason}
                    busy={busy}
                    itemLabel={listing.title}
                    onCancel={() => {
                      setPartRejectId(null);
                      setPartReason('');
                    }}
                    onConfirm={() =>
                      confirmReject(
                        listing.id,
                        partReason,
                        () => {
                          setPartRejectId(null);
                          setPartReason('');
                        },
                        () =>
                          apiSend(
                            `/api/v1/admin/part-listings/${listing.id}/reject`,
                            { token, body: { reason: partReason } },
                          ),
                        `Rejected “${listing.title}”`,
                      )
                    }
                  />
                ) : null}
              </article>
            );
          })}
        </div>
        <Pagination
          variant="admin"
          page={partListingMeta.page}
          totalPages={partListingMeta.totalPages}
          hasPreviousPage={partListingMeta.hasPreviousPage}
          hasNextPage={partListingMeta.hasNextPage}
          total={partListingMeta.total}
          limit={partListingMeta.limit}
          disabled={loading}
          scroll={false}
          onPage={setPartListingPage}
        />
      </>
    );
  }

  function renderDealerPanel(
    kind: 'dealers' | 'parts-dealers',
    rows: PendingDealer[],
    meta: PaginationMeta,
    setPage: (n: number) => void,
    openId: string | null,
    setOpenId: (id: string | null) => void,
    rejectReason: string,
    setRejectReason: (v: string) => void,
  ) {
    if (rows.length === 0) return renderEmptyPanel();
    const approvePath =
      kind === 'dealers'
        ? (id: string) => `/api/v1/admin/dealers/${id}/approve`
        : (id: string) => `/api/v1/admin/parts-dealers/${id}/approve`;
    const rejectPath =
      kind === 'dealers'
        ? (id: string) => `/api/v1/admin/dealers/${id}/reject`
        : (id: string) => `/api/v1/admin/parts-dealers/${id}/reject`;
    const approveLabel =
      kind === 'dealers' ? 'Approve dealer' : 'Approve parts dealer';

    return (
      <>
        <div className="space-y-3">
          {rows.map((dealer) => {
            const rejecting = openId === dealer.id;
            const busy = busyId === dealer.id;
            return (
              <article
                key={dealer.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)]/60 p-4"
                aria-busy={busy}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[var(--admin-text)]">
                      {dealer.name}
                    </h3>
                    <p className="text-sm text-[var(--admin-muted)]">
                      {dealer.phone}
                    </p>
                    <ReviewDetails
                      description={dealer.description}
                      email={dealer.email}
                      address={dealer.address}
                    />
                    <Link
                      href={`/${locale}/admin/${kind === 'dealers' ? 'dealers' : 'parts-dealers'}/${dealer.id}`}
                      className="mt-2 inline-flex text-sm text-[var(--admin-accent)] hover:underline"
                    >
                      Open shop
                    </Link>
                  </div>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label={`Actions for ${dealer.name}`}
                  >
                    <button
                      type="button"
                      className="admin-btn-primary inline-flex min-h-11 items-center px-3 py-1.5 text-sm disabled:opacity-50"
                      disabled={busy}
                      aria-label={`${approveLabel} ${dealer.name}`}
                      onClick={() =>
                        void runAction(
                          dealer.id,
                          `Approved “${dealer.name}”`,
                          () => apiSend(approvePath(dealer.id), { token }),
                        )
                      }
                    >
                      {approveLabel}
                    </button>
                    {!rejecting ? (
                      <button
                        type="button"
                        className="admin-btn-ghost px-3 py-1.5 text-sm disabled:opacity-50"
                        disabled={busy}
                        aria-label={`Reject ${dealer.name}`}
                        onClick={() => {
                          setOpenId(dealer.id);
                          setRejectReason('');
                        }}
                      >
                        Reject
                      </button>
                    ) : null}
                  </div>
                </div>
                {rejecting ? (
                  <RejectInline
                    reason={rejectReason}
                    onReasonChange={setRejectReason}
                    busy={busy}
                    itemLabel={dealer.name}
                    onCancel={() => {
                      setOpenId(null);
                      setRejectReason('');
                    }}
                    onConfirm={() =>
                      confirmReject(
                        dealer.id,
                        rejectReason,
                        () => {
                          setOpenId(null);
                          setRejectReason('');
                        },
                        () =>
                          apiSend(rejectPath(dealer.id), {
                            token,
                            body: { reason: rejectReason },
                          }),
                        `Rejected “${dealer.name}”`,
                      )
                    }
                  />
                ) : null}
              </article>
            );
          })}
        </div>
        <Pagination
          variant="admin"
          page={meta.page}
          totalPages={meta.totalPages}
          hasPreviousPage={meta.hasPreviousPage}
          hasNextPage={meta.hasNextPage}
          total={meta.total}
          limit={meta.limit}
          disabled={loading}
          scroll={false}
          onPage={setPage}
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {statusMsg ? (
        <p className="sr-only" role="status" aria-live="polite">
          {statusMsg}
        </p>
      ) : null}

      {loading && queuesEmpty ? (
        <div
          className="admin-card px-5 py-4"
          aria-busy="true"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div
              className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[var(--admin-accent)]/50"
              aria-hidden
            />
            <p className="text-sm text-[var(--admin-muted)]">Loading queues…</p>
          </div>
          <div className="mt-3 h-2 max-w-xs animate-pulse rounded-full bg-[var(--admin-border)]" />
        </div>
      ) : allClear || searchEmpty ? (
        <section
          className="admin-card mx-auto max-w-lg px-5 py-8 text-center"
          role="status"
        >
          <div
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--admin-success)]/15 text-[var(--admin-success)]"
            aria-hidden
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
              <path
                d="M6.2 10.2 8.6 12.6 13.8 7.2"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-lg tracking-wide text-[var(--admin-text)]">
            {searchEmpty ? 'No matches' : 'All queues clear'}
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {searchEmpty
              ? `Nothing in any queue matches “${search.trim()}”.`
              : 'No listings or dealer applications waiting for review.'}
          </p>
          {!searchEmpty ? (
            <ul className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-2">
              {queueChips.map((chip) => (
                <li
                  key={chip.id}
                  className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)]/50 px-3 py-2 text-left"
                >
                  <p className="text-[11px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
                    {chip.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--admin-text)]">
                    {chip.count}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <>
          {tablist}
          <div
            role="tabpanel"
            id={`moderation-panel-${activeQueue}`}
            aria-labelledby={`moderation-tab-${activeQueue}`}
            className="admin-card p-5"
            aria-busy={loading}
          >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-base tracking-wide text-[var(--admin-text)]">
                {activeLabel}
                {activeTotal > 0 ? (
                  <span className="ml-2 text-sm text-[var(--admin-muted)]">
                    ({activeTotal})
                  </span>
                ) : null}
              </h2>
            </div>
            {activeQueue === 'listings'
              ? renderListingsPanel()
              : activeQueue === 'part-listings'
                ? renderPartListingsPanel()
                : activeQueue === 'dealers'
                  ? renderDealerPanel(
                      'dealers',
                      dealers,
                      dealerMeta,
                      setDealerPage,
                      dealerRejectId,
                      setDealerRejectId,
                      dealerReason,
                      setDealerReason,
                    )
                  : renderDealerPanel(
                      'parts-dealers',
                      partsDealers,
                      partsDealerMeta,
                      setPartsDealerPage,
                      partsDealerRejectId,
                      setPartsDealerRejectId,
                      partsDealerReason,
                      setPartsDealerReason,
                    )}
          </div>
        </>
      )}
    </div>
  );
}
