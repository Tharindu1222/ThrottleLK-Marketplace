'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

type Tab = 'moderation' | 'users' | 'taxonomy' | 'reports';

type Dashboard = {
  users: number;
  activeListings: number;
  pendingListings: number;
  pendingDealers: number;
  openReports: number;
};

type PendingListing = {
  id: string;
  title: string;
  priceLkr: number;
  manufactureYear: number;
};

type PendingDealer = { id: string; name: string; phone: string };

type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
};

type Brand = { id: string; name: string };
type District = { id: string; name: string };
type Report = {
  id: string;
  listingId: string;
  reason: string;
  description: string;
  createdAt: string;
};

export function AdminQueue({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>('moderation');
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [pending, setPending] = useState<PendingListing[]>([]);
  const [dealers, setDealers] = useState<PendingDealer[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [dealerRejectId, setDealerRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [dealerReason, setDealerReason] = useState('');

  async function load(access: string) {
    const [dashboard, listings, pendingDealers, userRows, brandRows, districtRows, openReports] =
      await Promise.all([
        apiGet<Dashboard>('/api/v1/admin/dashboard', { token: access }),
        apiGet<PendingListing[]>('/api/v1/admin/listings/pending', {
          token: access,
        }),
        apiGet<PendingDealer[]>('/api/v1/admin/dealers/pending', {
          token: access,
        }),
        apiGet<AdminUser[]>('/api/v1/admin/users', { token: access }),
        apiGet<Brand[]>('/api/v1/admin/brands', { token: access }),
        apiGet<District[]>('/api/v1/locations/districts'),
        apiGet<Report[]>('/api/v1/admin/reports/open', { token: access }),
      ]);
    setDash(dashboard);
    setPending(listings);
    setDealers(pendingDealers);
    setUsers(userRows);
    setBrands(brandRows);
    setDistricts(districtRows);
    setReports(openReports);
  }

  useEffect(() => {
    const access = getAccessToken();
    const user = getStoredUser();
    setToken(access);
    setIsAdmin(Boolean(user?.roles.includes('admin')));
    if (!access || !user?.roles.includes('admin')) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load'),
    );
  }, []);

  if (!token) {
    return (
      <p className="mt-6 text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          Log in
        </Link>{' '}
        as admin.
      </p>
    );
  }

  if (!isAdmin) {
    return (
      <p className="mt-6 text-muted">Your account does not have the admin role.</p>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'moderation', label: 'Moderation' },
    { id: 'users', label: 'Users' },
    { id: 'taxonomy', label: 'Taxonomy' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <div className="mt-8 space-y-8">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {dash ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ['Users', dash.users],
              ['Active listings', dash.activeListings],
              ['Pending listings', dash.pendingListings],
              ['Pending dealers', dash.pendingDealers],
              ['Open reports', dash.openReports],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="border border-white/10 bg-surface/40 p-4">
              <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">
                {value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`px-3 py-1.5 text-sm ${
              tab === item.id
                ? 'bg-accent text-background'
                : 'border border-white/20'
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'moderation' ? (
        <div className="space-y-12">
          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
              Pending listings
            </h2>
            <div className="mt-4 space-y-4">
              {pending.length === 0 ? (
                <p className="text-muted">No listings waiting for review.</p>
              ) : (
                pending.map((listing) => (
                  <div
                    key={listing.id}
                    className="border border-white/10 bg-surface/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-xl">
                          {listing.title}
                        </h3>
                        <p className="text-sm text-muted">
                          Rs. {listing.priceLkr.toLocaleString('en-LK')} ·{' '}
                          {listing.manufactureYear}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="bg-accent px-3 py-1.5 text-sm text-background"
                          onClick={() => {
                            void apiSend(
                              `/api/v1/admin/listings/${listing.id}/approve`,
                              { token },
                            )
                              .then(() => load(token))
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : 'Approve failed',
                                ),
                              );
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="border border-white/20 px-3 py-1.5 text-sm"
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
                          className="min-w-[240px] flex-1 bg-background px-3 py-2 text-sm ring-1 ring-white/10"
                        />
                        <button
                          type="button"
                          className="bg-foreground px-3 py-2 text-sm text-background"
                          onClick={() => {
                            if (reason.trim().length < 5) {
                              setError('Reason must be at least 5 characters');
                              return;
                            }
                            void apiSend(
                              `/api/v1/admin/listings/${listing.id}/reject`,
                              { token, body: { reason } },
                            )
                              .then(() => {
                                setRejectId(null);
                                return load(token);
                              })
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : 'Reject failed',
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

          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
              Pending dealers
            </h2>
            <div className="mt-4 space-y-4">
              {dealers.length === 0 ? (
                <p className="text-muted">No dealer applications waiting.</p>
              ) : (
                dealers.map((dealer) => (
                  <div
                    key={dealer.id}
                    className="border border-white/10 bg-surface/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-xl">
                          {dealer.name}
                        </h3>
                        <p className="text-sm text-muted">{dealer.phone}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="bg-accent px-3 py-1.5 text-sm text-background"
                          onClick={() => {
                            void apiSend(
                              `/api/v1/admin/dealers/${dealer.id}/approve`,
                              { token },
                            )
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
                          className="border border-white/20 px-3 py-1.5 text-sm"
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
                          className="min-w-[240px] flex-1 bg-background px-3 py-2 text-sm ring-1 ring-white/10"
                        />
                        <button
                          type="button"
                          className="bg-foreground px-3 py-2 text-sm text-background"
                          onClick={() => {
                            if (dealerReason.trim().length < 5) {
                              setError('Reason must be at least 5 characters');
                              return;
                            }
                            void apiSend(
                              `/api/v1/admin/dealers/${dealer.id}/reject`,
                              { token, body: { reason: dealerReason } },
                            )
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
      ) : null}

      {tab === 'users' ? (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-surface/40 p-4"
            >
              <div>
                <p className="font-[family-name:var(--font-display)] text-lg">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-muted">
                  {user.email} · {user.roles.join(', ')} · {user.status}
                </p>
              </div>
              <button
                type="button"
                className="border border-white/20 px-3 py-1.5 text-sm"
                onClick={() => {
                  const next =
                    user.status === 'suspended' ? 'active' : 'suspended';
                  void apiSend(`/api/v1/admin/users/${user.id}/status`, {
                    method: 'PATCH',
                    token,
                    body: { status: next },
                  })
                    .then(() => load(token))
                    .catch((err) =>
                      setError(
                        err instanceof Error ? err.message : 'Status failed',
                      ),
                    );
                }}
              >
                {user.status === 'suspended' ? 'Reactivate' : 'Suspend'}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'taxonomy' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <form
            className="space-y-3 border border-white/10 bg-surface/40 p-4"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get('brand') || '');
              void apiSend('/api/v1/admin/brands', {
                token,
                body: { name },
              })
                .then(() => {
                  e.currentTarget.reset();
                  return load(token);
                })
                .catch((err) =>
                  setError(err instanceof Error ? err.message : 'Brand failed'),
                );
            }}
          >
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Add brand
            </h3>
            <input
              name="brand"
              required
              placeholder="Brand name"
              className="w-full bg-background px-3 py-2 ring-1 ring-white/10"
            />
            <button type="submit" className="bg-accent px-3 py-2 text-sm text-background">
              Create brand
            </button>
            <ul className="text-sm text-muted">
              {brands.slice(0, 12).map((b) => (
                <li key={b.id}>{b.name}</li>
              ))}
            </ul>
          </form>

          <form
            className="space-y-3 border border-white/10 bg-surface/40 p-4"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void apiSend('/api/v1/admin/models', {
                token,
                body: {
                  brandId: String(form.get('brandId')),
                  name: String(form.get('model')),
                },
              })
                .then(() => {
                  e.currentTarget.reset();
                  return load(token);
                })
                .catch((err) =>
                  setError(err instanceof Error ? err.message : 'Model failed'),
                );
            }}
          >
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Add model
            </h3>
            <select
              name="brandId"
              required
              className="w-full bg-background px-3 py-2 ring-1 ring-white/10"
            >
              <option value="">Brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              name="model"
              required
              placeholder="Model name"
              className="w-full bg-background px-3 py-2 ring-1 ring-white/10"
            />
            <button type="submit" className="bg-accent px-3 py-2 text-sm text-background">
              Create model
            </button>
          </form>

          <form
            className="space-y-3 border border-white/10 bg-surface/40 p-4"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const name = String(
                new FormData(e.currentTarget).get('district') || '',
              );
              void apiSend('/api/v1/admin/districts', {
                token,
                body: { name },
              })
                .then(() => {
                  e.currentTarget.reset();
                  return load(token);
                })
                .catch((err) =>
                  setError(
                    err instanceof Error ? err.message : 'District failed',
                  ),
                );
            }}
          >
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Add district
            </h3>
            <input
              name="district"
              required
              placeholder="District name"
              className="w-full bg-background px-3 py-2 ring-1 ring-white/10"
            />
            <button type="submit" className="bg-accent px-3 py-2 text-sm text-background">
              Create district
            </button>
          </form>

          <form
            className="space-y-3 border border-white/10 bg-surface/40 p-4"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void apiSend('/api/v1/admin/cities', {
                token,
                body: {
                  districtId: String(form.get('districtId')),
                  name: String(form.get('city')),
                },
              })
                .then(() => {
                  e.currentTarget.reset();
                  return load(token);
                })
                .catch((err) =>
                  setError(err instanceof Error ? err.message : 'City failed'),
                );
            }}
          >
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Add city
            </h3>
            <select
              name="districtId"
              required
              className="w-full bg-background px-3 py-2 ring-1 ring-white/10"
            >
              <option value="">District</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              name="city"
              required
              placeholder="City name"
              className="w-full bg-background px-3 py-2 ring-1 ring-white/10"
            />
            <button type="submit" className="bg-accent px-3 py-2 text-sm text-background">
              Create city
            </button>
          </form>
        </div>
      ) : null}

      {tab === 'reports' ? (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-muted">No open reports.</p>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="border border-white/10 bg-surface/40 p-4"
              >
                <p className="font-[family-name:var(--font-display)] text-lg">
                  {report.reason}
                </p>
                <p className="mt-1 text-sm text-muted">{report.description}</p>
                <p className="mt-2 text-xs text-muted">
                  Listing {report.listingId}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="bg-accent px-3 py-1.5 text-sm text-background"
                    onClick={() => {
                      void apiSend(
                        `/api/v1/admin/reports/${report.id}/resolve`,
                        { token, body: { status: 'actioned' } },
                      )
                        .then(() => load(token))
                        .catch((err) =>
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Resolve failed',
                          ),
                        );
                    }}
                  >
                    Mark actioned
                  </button>
                  <button
                    type="button"
                    className="border border-white/20 px-3 py-1.5 text-sm"
                    onClick={() => {
                      void apiSend(
                        `/api/v1/admin/reports/${report.id}/resolve`,
                        { token, body: { status: 'dismissed' } },
                      )
                        .then(() => load(token))
                        .catch((err) =>
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Dismiss failed',
                          ),
                        );
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
