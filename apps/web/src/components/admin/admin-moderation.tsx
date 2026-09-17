'use client';

import { useEffect, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { apiGetWithMeta, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { PendingDealer, PendingListing } from '@/lib/admin-types';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import type { PaginationMeta } from '@throttlelk/types';

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

export function AdminModeration({ search = '' }: { search?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingListing[]>([]);
  const [dealers, setDealers] = useState<PendingDealer[]>([]);
  const [listingMeta, setListingMeta] = useState<PaginationMeta>(emptyMeta);
  const [dealerMeta, setDealerMeta] = useState<PaginationMeta>(emptyMeta);
  const [listingPage, setListingPage] = useState(1);
  const [dealerPage, setDealerPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [dealerRejectId, setDealerRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [dealerReason, setDealerReason] = useState('');
  const [loading, setLoading] = useState(false);

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

  async function load(access: string) {
    setLoading(true);
    try {
      await Promise.all([
        loadListings(access, listingPage, search),
        loadDealers(access, dealerPage, search),
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setListingPage(1);
    setDealerPage(1);
  }, [search]);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    setLoading(true);
    void Promise.all([
      loadListings(access, listingPage, search),
      loadDealers(access, dealerPage, search),
    ])
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingPage, dealerPage, search]);

  if (!token) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--admin-text)]">
          Moderation
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Approve or reject listings and dealer applications.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--admin-danger)]">{error}</p> : null}

      <section className="admin-card p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
          Pending listings
        </h2>
        <div className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">No listings waiting for review.</p>
          ) : (
            pending.map((listing) => (
              <div
                key={listing.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)]/60 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface)] ring-1 ring-[var(--admin-border)] sm:h-20 sm:w-28">
                      {listing.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={listing.coverImageUrl}
                          alt={listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-[var(--admin-faint)]">
                          No photo
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[var(--admin-text)]">
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
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <button
                      type="button"
                      className="admin-btn-primary px-3 py-1.5 text-sm"
                      onClick={() => {
                        void apiSend(`/api/v1/admin/listings/${listing.id}/approve`, {
                          token,
                        })
                          .then(() => load(token))
                          .catch((err) =>
                            setError(
                              err instanceof Error ? err.message : 'Approve failed',
                            ),
                          );
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="admin-btn-ghost px-3 py-1.5 text-sm"
                      onClick={() => {
                        setRejectId(listing.id);
                        setReason('');
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
                {rejectId === listing.id ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Rejection reason"
                      className="admin-field min-w-[240px] flex-1"
                    />
                    <button
                      type="button"
                      className="rounded-xl bg-[var(--admin-danger)] px-3 py-2 text-sm font-medium text-white"
                      onClick={() => {
                        if (reason.trim().length < 5) {
                          setError('Reason must be at least 5 characters');
                          return;
                        }
                        void apiSend(`/api/v1/admin/listings/${listing.id}/reject`, {
                          token,
                          body: { reason },
                        })
                          .then(() => {
                            setRejectId(null);
                            return load(token);
                          })
                          .catch((err) =>
                            setError(
                              err instanceof Error ? err.message : 'Reject failed',
                            ),
                          );
                      }}
                    >
                      Confirm reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
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
      </section>

      <section className="admin-card p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
          Pending dealers
        </h2>
        <div className="mt-4 space-y-3">
          {dealers.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">No dealer applications waiting.</p>
          ) : (
            dealers.map((dealer) => (
              <div
                key={dealer.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)]/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--admin-text)]">{dealer.name}</h3>
                    <p className="text-sm text-[var(--admin-muted)]">{dealer.phone}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="admin-btn-primary px-3 py-1.5 text-sm"
                      onClick={() => {
                        void apiSend(`/api/v1/admin/dealers/${dealer.id}/approve`, {
                          token,
                        })
                          .then(() => load(token))
                          .catch((err) =>
                            setError(
                              err instanceof Error
                                ? err.message
                                : 'Dealer approve failed',
                            ),
                          );
                      }}
                    >
                      Approve dealer
                    </button>
                    <button
                      type="button"
                      className="admin-btn-ghost px-3 py-1.5 text-sm"
                      onClick={() => {
                        setDealerRejectId(dealer.id);
                        setDealerReason('');
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
                {dealerRejectId === dealer.id ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={dealerReason}
                      onChange={(e) => setDealerReason(e.target.value)}
                      placeholder="Rejection reason"
                      className="admin-field min-w-[240px] flex-1"
                    />
                    <button
                      type="button"
                      className="rounded-xl bg-[var(--admin-danger)] px-3 py-2 text-sm font-medium text-white"
                      onClick={() => {
                        if (dealerReason.trim().length < 5) {
                          setError('Reason must be at least 5 characters');
                          return;
                        }
                        void apiSend(`/api/v1/admin/dealers/${dealer.id}/reject`, {
                          token,
                          body: { reason: dealerReason },
                        })
                          .then(() => {
                            setDealerRejectId(null);
                            return load(token);
                          })
                          .catch((err) =>
                            setError(
                              err instanceof Error
                                ? err.message
                                : 'Dealer reject failed',
                            ),
                          );
                      }}
                    >
                      Confirm reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
        <Pagination
          variant="admin"
          page={dealerMeta.page}
          totalPages={dealerMeta.totalPages}
          hasPreviousPage={dealerMeta.hasPreviousPage}
          hasNextPage={dealerMeta.hasNextPage}
          total={dealerMeta.total}
          limit={dealerMeta.limit}
          disabled={loading}
          scroll={false}
          onPage={setDealerPage}
        />
      </section>
    </div>
  );
}
