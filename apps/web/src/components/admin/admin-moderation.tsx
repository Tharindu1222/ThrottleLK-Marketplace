'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { PendingDealer, PendingListing } from '@/lib/admin-types';

export function AdminModeration({ search = '' }: { search?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingListing[]>([]);
  const [dealers, setDealers] = useState<PendingDealer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [dealerRejectId, setDealerRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [dealerReason, setDealerReason] = useState('');

  async function load(access: string) {
    const [listings, pendingDealers] = await Promise.all([
      apiGet<PendingListing[]>('/api/v1/admin/listings/pending', { token: access }),
      apiGet<PendingDealer[]>('/api/v1/admin/dealers/pending', { token: access }),
    ]);
    setPending(listings);
    setDealers(pendingDealers);
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load'),
    );
  }, []);

  const q = search.trim().toLowerCase();
  const filteredListings = useMemo(
    () => (q ? pending.filter((l) => l.title.toLowerCase().includes(q)) : pending),
    [pending, q],
  );
  const filteredDealers = useMemo(
    () =>
      q
        ? dealers.filter(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              d.phone.toLowerCase().includes(q),
          )
        : dealers,
    [dealers, q],
  );

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
          {filteredListings.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">No listings waiting for review.</p>
          ) : (
            filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)]/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--admin-text)]">{listing.title}</h3>
                    <p className="text-sm text-[var(--admin-muted)]">
                      Rs. {listing.priceLkr.toLocaleString('en-LK')} ·{' '}
                      {listing.manufactureYear}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
      </section>

      <section className="admin-card p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
          Pending dealers
        </h2>
        <div className="mt-4 space-y-3">
          {filteredDealers.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">No dealer applications waiting.</p>
          ) : (
            filteredDealers.map((dealer) => (
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
      </section>
    </div>
  );
}
