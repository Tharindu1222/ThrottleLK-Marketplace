'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

type RangeId = 'all' | 'month' | '30d';
type Bucket = 'collected' | 'pending' | 'rejected' | 'chargeback';
type Channel = 'bike' | 'spare' | 'modification';

type MonetizePayload = {
  currency: 'LKR';
  range: RangeId;
  collected: {
    totalLkr: number;
    count: number;
    bikeLkr: number;
    spareLkr: number;
    modificationLkr: number;
    payhereLkr: number;
    bankLkr: number;
    liveCount: number;
    liveLkr: number;
  };
  pending: { totalLkr: number; count: number };
  rejected: { totalLkr: number; count: number };
  chargebacks: { totalLkr: number; count: number };
  packages: { name: string; count: number; totalLkr: number }[];
  users: {
    sellerId: string;
    name: string;
    email: string;
    count: number;
    totalLkr: number;
    lastPaidAt: string | null;
  }[];
  transactionCount: number;
  transactionsTruncated: boolean;
  transactions: {
    id: string;
    at: string;
    bucket: Bucket;
    channel: Channel;
    amountLkr: number;
    packageName: string;
    durationDays: number;
    paymentProvider: 'payhere' | 'bank' | null;
    paymentStatus: string;
    sellerId: string;
    sellerName: string;
    sellerEmail: string;
    listingTitle: string;
    live: boolean;
  }[];
};

const RANGES: { id: RangeId; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'month', label: 'This month' },
  { id: '30d', label: 'Last 30 days' },
];

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function formatWhen(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const CHANNEL_LABEL: Record<Channel, string> = {
  bike: 'Bike',
  spare: 'Spare part',
  modification: 'Modification',
};

const BUCKET_LABEL: Record<Bucket, string> = {
  collected: 'Collected',
  pending: 'Pending',
  rejected: 'Rejected',
  chargeback: 'Chargeback',
};

function providerLabel(provider: 'payhere' | 'bank' | null) {
  if (provider === 'payhere') return 'PayHere';
  if (provider === 'bank') return 'Bank';
  return '—';
}

function chipClass(selected: boolean) {
  return `rounded-full border px-3 py-1 text-xs font-medium ${
    selected
      ? 'border-transparent bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'
      : 'border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-muted)]'
  }`;
}

function bucketTone(bucket: Bucket) {
  if (bucket === 'collected') {
    return 'bg-[var(--admin-success)]/15 text-[var(--admin-success)]';
  }
  if (bucket === 'pending') {
    return 'bg-[var(--admin-info)]/15 text-[var(--admin-info)]';
  }
  return 'bg-[var(--admin-danger)]/15 text-[var(--admin-danger)]';
}

function MetricCard({
  label,
  value,
  hint,
  tint,
  iconBg,
  valueClass = 'text-3xl',
}: {
  label: string;
  value: string;
  hint: string;
  tint: string;
  iconBg: string;
  valueClass?: string;
}) {
  return (
    <article className="admin-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tint}`}>
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${iconBg}`}
          aria-hidden
        >
          <span className="h-2 w-2 rounded-full bg-current opacity-80" />
        </span>
      </div>
      <p
        className={`mt-4 font-[family-name:var(--font-display)] text-[var(--admin-text)] ${valueClass}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">{hint}</p>
    </article>
  );
}

export function AdminMonetize() {
  const [range, setRange] = useState<RangeId>('all');
  const [data, setData] = useState<MonetizePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState<Bucket | 'all'>('all');
  const [channel, setChannel] = useState<Channel | 'all'>('all');

  const load = useCallback(async (next: RangeId) => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await apiGet<MonetizePayload>(
        '/api/v1/admin/promotions/monetize',
        { token, searchParams: { range: next } },
      );
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.transactions ?? []).filter((row) => {
      if (bucket !== 'all' && row.bucket !== bucket) return false;
      if (channel !== 'all' && row.channel !== channel) return false;
      if (!q) return true;
      return (
        row.sellerName.toLowerCase().includes(q) ||
        row.sellerEmail.toLowerCase().includes(q) ||
        row.listingTitle.toLowerCase().includes(q) ||
        row.packageName.toLowerCase().includes(q)
      );
    });
  }, [data, query, bucket, channel]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Revenue period"
          className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-0.5"
        >
          {RANGES.map((item) => {
            const selected = range === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setRange(item.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  selected
                    ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'
                    : 'text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="admin-btn-ghost inline-flex min-h-11 items-center px-3 py-2 text-sm disabled:opacity-50"
          disabled={loading}
          onClick={() => void load(range)}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="text-sm text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading revenue…</p>
      ) : null}

      {data ? (
        <>
          <article className="admin-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--admin-accent)]">
                  Collected
                </span>
                <p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--admin-text)] sm:text-5xl">
                  {formatLkr(data.collected.totalLkr)}
                </p>
                <p className="mt-2 text-sm text-[var(--admin-muted)]">
                  {data.collected.count} paid promotions
                </p>
              </div>
              <div className="grid min-w-[16rem] flex-1 gap-3 sm:max-w-sm sm:grid-cols-2">
                <div className="rounded-xl bg-[var(--admin-surface-2)] px-3 py-3">
                  <p className="text-[11px] font-medium text-[var(--admin-muted)]">
                    PayHere
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--admin-text)]">
                    {formatLkr(data.collected.payhereLkr)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--admin-surface-2)] px-3 py-3">
                  <p className="text-[11px] font-medium text-[var(--admin-muted)]">
                    Bank
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--admin-text)]">
                    {formatLkr(data.collected.bankLkr)}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm text-[var(--admin-muted)]">
              Collected is approved and marked paid. Pending checkouts stay out
              of this balance. Amounts are locked at checkout, and free admin
              placements are excluded.
            </p>
          </article>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label="Bikes"
              value={formatLkr(data.collected.bikeLkr)}
              hint="Approved bike listings"
              tint="bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"
              iconBg="bg-[var(--admin-accent)]/15 text-[var(--admin-accent)]"
            />
            <MetricCard
              label="Spare parts"
              value={formatLkr(data.collected.spareLkr)}
              hint="Approved spare-part listings"
              tint="bg-[var(--admin-info)]/10 text-[var(--admin-info)]"
              iconBg="bg-[var(--admin-info)]/15 text-[var(--admin-info)]"
            />
            <MetricCard
              label="Modifications"
              value={formatLkr(data.collected.modificationLkr)}
              hint="Approved modified parts"
              tint="bg-[var(--admin-warning)]/10 text-[var(--admin-warning)]"
              iconBg="bg-[var(--admin-warning)]/15 text-[var(--admin-warning)]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label="Pending"
              value={formatLkr(data.pending.totalLkr)}
              hint={`${data.pending.count} not collected yet`}
              tint="bg-[var(--admin-info)]/10 text-[var(--admin-info)]"
              iconBg="bg-[var(--admin-info)]/15 text-[var(--admin-info)]"
              valueClass="text-2xl"
            />
            <MetricCard
              label="Still live"
              value={formatLkr(data.collected.liveLkr)}
              hint={`${data.collected.liveCount} paid promotions still running`}
              tint="bg-[var(--admin-success)]/10 text-[var(--admin-success)]"
              iconBg="bg-[var(--admin-success)]/15 text-[var(--admin-success)]"
              valueClass="text-2xl"
            />
            <MetricCard
              label="Rejected"
              value={String(data.rejected.count)}
              hint={`${data.chargebacks.count} chargebacks · ${formatLkr(data.chargebacks.totalLkr)}`}
              tint="bg-[var(--admin-danger)]/10 text-[var(--admin-danger)]"
              iconBg="bg-[var(--admin-danger)]/15 text-[var(--admin-danger)]"
              valueClass="text-2xl"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <section className="admin-card overflow-hidden">
              <h2 className="border-b border-[var(--admin-border)] px-4 py-3 text-sm font-medium text-[var(--admin-text)]">
                By package
              </h2>
              {data.packages.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                  No collected sales in this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Package</th>
                        <th className="px-4 py-3 font-medium">Sales</th>
                        <th className="px-4 py-3 font-medium">Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.packages.map((pkg) => (
                        <tr
                          key={pkg.name}
                          className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface-2)]/50"
                        >
                          <td className="px-4 py-3 text-[var(--admin-text)]">
                            {pkg.name}
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-muted)]">
                            {pkg.count}
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-text)]">
                            {formatLkr(pkg.totalLkr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="admin-card overflow-hidden">
              <h2 className="border-b border-[var(--admin-border)] px-4 py-3 text-sm font-medium text-[var(--admin-text)]">
                Who paid
              </h2>
              {data.users.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                  No sellers have a collected promotion in this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Seller</th>
                        <th className="px-4 py-3 font-medium">Promos</th>
                        <th className="px-4 py-3 font-medium">Last paid</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((user) => (
                        <tr
                          key={user.sellerId}
                          className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface-2)]/50"
                        >
                          <td className="px-4 py-3">
                            <p className="text-[var(--admin-text)]">{user.name}</p>
                            <p className="text-xs text-[var(--admin-muted)]">
                              {user.email}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-muted)]">
                            {user.count}
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-muted)]">
                            {formatWhen(user.lastPaidAt)}
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-text)]">
                            {formatLkr(user.totalLkr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
                  Promotion ledger
                </h2>
                <p className="text-xs text-[var(--admin-muted)]">
                  {rows.length} shown
                  {data.transactionsTruncated
                    ? ` · newest ${data.transactions.length} of ${data.transactionCount}`
                    : ''}
                </p>
              </div>
              <input
                className="admin-field-inline w-full! min-w-0! max-w-none! sm:w-64!"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search seller or listing"
                aria-label="Search ledger"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'All statuses'],
                  ['collected', 'Collected'],
                  ['pending', 'Pending'],
                  ['rejected', 'Rejected'],
                  ['chargeback', 'Chargebacks'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBucket(id)}
                  className={chipClass(bucket === id)}
                >
                  {label}
                </button>
              ))}
              {(
                [
                  ['all', 'All types'],
                  ['bike', 'Bikes'],
                  ['spare', 'Spare parts'],
                  ['modification', 'Modifications'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChannel(id)}
                  className={chipClass(channel === id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="admin-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Seller</th>
                      <th className="px-4 py-3 font-medium">Listing</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Package</th>
                      <th className="px-4 py-3 font-medium">Method</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-10 text-center text-[var(--admin-muted)]"
                        >
                          No promotions match these filters.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface-2)]/50"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-[var(--admin-muted)]">
                            {formatWhen(row.at)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[var(--admin-text)]">
                              {row.sellerName}
                            </p>
                            <p className="text-xs text-[var(--admin-muted)]">
                              {row.sellerEmail}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-text)]">
                            {row.listingTitle}
                            {row.live ? (
                              <span className="ml-2 rounded-full bg-[var(--admin-success)]/15 px-2.5 py-1 text-xs font-medium text-[var(--admin-success)]">
                                Live
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-muted)]">
                            {CHANNEL_LABEL[row.channel]}
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-muted)]">
                            {row.packageName}
                            {row.durationDays ? ` · ${row.durationDays}d` : ''}
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-muted)]">
                            {providerLabel(row.paymentProvider)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${bucketTone(row.bucket)}`}
                            >
                              {BUCKET_LABEL[row.bucket]}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-[family-name:var(--font-display)] text-[var(--admin-text)]">
                            {formatLkr(row.amountLkr)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
