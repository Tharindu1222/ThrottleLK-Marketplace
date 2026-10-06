'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

type RangeId = 'all' | 'month' | '30d';
type RevenueView = 'promotions' | 'listings';
type Bucket = 'collected' | 'pending' | 'rejected' | 'chargeback' | 'failed';
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
  failed: { totalLkr: number; count: number };
  packages: { name: string; count: number; totalLkr: number }[];
  users: {
    sellerId: string;
    name: string;
    email: string;
    count: number;
    totalLkr: number;
    lastPaidAt: string | null;
  }[];
  page: number;
  limit: number;
  transactionCount: number;
  pageCount: number;
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
  listingPackages: {
    collected: {
      totalLkr: number;
      count: number;
      bikeLkr: number;
      bikeCount: number;
      bikeSlots: number;
      partsLkr: number;
      partsCount: number;
      partsSlots: number;
    };
    pending: {
      totalLkr: number;
      count: number;
      bikeLkr: number;
      bikeCount: number;
      partsLkr: number;
      partsCount: number;
    };
    failed: { totalLkr: number; count: number };
    chargebacks: { totalLkr: number; count: number };
    packages: {
      id: string;
      name: string;
      audience: 'bike' | 'parts';
      count: number;
      slots: number;
      totalLkr: number;
      pendingCount: number;
      pendingLkr: number;
    }[];
    users: {
      sellerId: string;
      name: string;
      email: string;
      count: number;
      totalLkr: number;
      lastPaidAt: string | null;
    }[];
    exceptions: {
      id: string;
      at: string;
      bucket: 'pending' | 'failed' | 'chargeback';
      audience: 'bike' | 'parts';
      amountLkr: number;
      packageName: string;
      payhereOrderId: string;
      sellerName: string;
      sellerEmail: string;
    }[];
  };
};

const PAGE_SIZE = 25;

const RANGES: { id: RangeId; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'month', label: 'This month' },
  { id: '30d', label: 'Last 30 days' },
];

const REVENUE_VIEWS: { id: RevenueView; label: string }[] = [
  { id: 'promotions', label: 'Promotions' },
  { id: 'listings', label: 'Listing packages' },
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

const PACKAGE_AUDIENCE_LABEL = {
  bike: 'Bike listings',
  parts: 'Parts',
} as const;

const CHANNEL_LABEL: Record<Channel, string> = {
  bike: 'Bike',
  spare: 'Spare part',
  modification: 'Modification',
};

const BUCKET_LABEL: Record<Bucket, string> = {
  collected: 'Collected',
  pending: 'Pending',
  failed: 'Failed',
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
  if (bucket === 'failed') {
    return 'bg-[var(--admin-warning)]/15 text-[var(--admin-warning)]';
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
  const [view, setView] = useState<RevenueView>('promotions');
  const [data, setData] = useState<MonetizePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [listingQuery, setListingQuery] = useState('');
  const [listingQ, setListingQ] = useState('');
  const [bucket, setBucket] = useState<Bucket | 'all'>('all');
  const [channel, setChannel] = useState<Channel | 'all'>('all');
  const [page, setPage] = useState(1);
  const requestId = useRef(0);
  const hasData = useRef(false);
  const appliedQuery = useRef('');
  const appliedListingQuery = useRef('');

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    const id = ++requestId.current;
    if (hasData.current) setLedgerLoading(true);
    else setLoading(true);
    setError(null);
    try {
      const payload = await apiGet<MonetizePayload>(
        '/api/v1/admin/promotions/monetize',
        {
          token,
          searchParams: {
            range,
            page: String(page),
            limit: String(PAGE_SIZE),
            bucket,
            channel,
            q: q || undefined,
            listingQ: listingQ || undefined,
          },
        },
      );
      if (id !== requestId.current) return;
      hasData.current = true;
      setData(payload);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load revenue');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLedgerLoading(false);
      }
    }
  }, [range, page, bucket, channel, q, listingQ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim().slice(0, 80);
      if (appliedQuery.current === next) return;
      appliedQuery.current = next;
      setQ(next);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = listingQuery.trim().slice(0, 80);
      if (appliedListingQuery.current === next) return;
      appliedListingQuery.current = next;
      setListingQ(next);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [listingQuery]);

  function selectRange(next: RangeId) {
    if (next === range) return;
    setRange(next);
    setPage(1);
  }

  function selectBucket(next: Bucket | 'all') {
    if (next === bucket) return;
    setBucket(next);
    setPage(1);
  }

  function selectChannel(next: Channel | 'all') {
    if (next === channel) return;
    setChannel(next);
    setPage(1);
  }

  const rows = data?.transactions ?? [];
  const pageCount = data?.pageCount ?? 0;
  const pageLabel = pageCount === 0 ? 1 : page;
  const pageTotal = Math.max(pageCount, 1);

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
                onClick={() => selectRange(item.id)}
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
          disabled={loading || ledgerLoading}
          onClick={() => void load()}
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
                  {formatLkr(
                    data.collected.totalLkr +
                      data.listingPackages.collected.totalLkr,
                  )}
                </p>
                <p className="mt-2 text-sm text-[var(--admin-muted)]">
                  {data.collected.count}{' '}
                  {data.collected.count === 1 ? 'promotion' : 'promotions'}
                  {' · '}
                  {data.listingPackages.collected.count}{' '}
                  {data.listingPackages.collected.count === 1
                    ? 'listing package'
                    : 'listing packages'}
                </p>
              </div>
              <div className="grid min-w-[16rem] flex-1 gap-3 sm:max-w-sm sm:grid-cols-2">
                <div className="rounded-xl bg-[var(--admin-surface-2)] px-3 py-3">
                  <p className="text-[11px] font-medium text-[var(--admin-muted)]">
                    PayHere
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--admin-text)]">
                    {formatLkr(
                      data.collected.payhereLkr +
                        data.listingPackages.collected.totalLkr,
                    )}
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
              Collected adds paid promotions and paid listing packages.
              Pending checkouts stay out of this balance. Amounts are locked
              at checkout, and free admin placements are excluded.
            </p>
          </article>

          <div
            role="tablist"
            aria-label="Revenue source"
            className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-0.5"
          >
            {REVENUE_VIEWS.map((item) => {
              const selected = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setView(item.id)}
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

          {view === 'promotions' ? (
          <>
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <MetricCard
              label="Failed"
              value={formatLkr(data.failed.totalLkr)}
              hint={`${data.failed.count} PayHere payments failed`}
              tint="bg-[var(--admin-warning)]/10 text-[var(--admin-warning)]"
              iconBg="bg-[var(--admin-warning)]/15 text-[var(--admin-warning)]"
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
          </>
          ) : (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="max-w-3xl text-xs text-[var(--admin-muted)]">
                Paid bike-listing and parts-listing slots. Pending checkouts stay
                out of collected.
                {data.listingPackages.pending.count > 0
                  ? ` ${data.listingPackages.pending.count} pending · ${formatLkr(data.listingPackages.pending.totalLkr)}.`
                  : ''}
                {data.listingPackages.failed.count > 0
                  ? ` ${data.listingPackages.failed.count} failed · ${formatLkr(data.listingPackages.failed.totalLkr)}.`
                  : ''}
                {data.listingPackages.chargebacks.count > 0
                  ? ` ${data.listingPackages.chargebacks.count} chargebacks · ${formatLkr(data.listingPackages.chargebacks.totalLkr)}.`
                  : ''}
              </p>
              <input
                className="admin-field-inline w-full! min-w-0! max-w-none! sm:w-64!"
                value={listingQuery}
                onChange={(event) =>
                  setListingQuery(event.target.value.slice(0, 80))
                }
                placeholder="Search seller, package, or order"
                aria-label="Search listing packages"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Bike listings"
                value={formatLkr(data.listingPackages.collected.bikeLkr)}
                hint={`${data.listingPackages.collected.bikeCount} paid · ${data.listingPackages.collected.bikeSlots} slots · ${data.listingPackages.pending.bikeCount} pending`}
                tint="bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"
                iconBg="bg-[var(--admin-accent)]/15 text-[var(--admin-accent)]"
                valueClass="text-2xl"
              />
              <MetricCard
                label="Parts"
                value={formatLkr(data.listingPackages.collected.partsLkr)}
                hint={`${data.listingPackages.collected.partsCount} paid · ${data.listingPackages.collected.partsSlots} slots · ${data.listingPackages.pending.partsCount} pending`}
                tint="bg-[var(--admin-info)]/10 text-[var(--admin-info)]"
                iconBg="bg-[var(--admin-info)]/15 text-[var(--admin-info)]"
                valueClass="text-2xl"
              />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <section className="admin-card overflow-hidden">
                <h3 className="border-b border-[var(--admin-border)] px-4 py-3 text-sm font-medium text-[var(--admin-text)]">
                  By package
                </h3>
                {data.listingPackages.packages.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                    No listing-package sales in this period.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
                        <tr>
                          <th className="px-4 py-3 font-medium">Package</th>
                          <th className="px-4 py-3 font-medium">For</th>
                          <th className="px-4 py-3 font-medium">Paid</th>
                          <th className="px-4 py-3 font-medium">Slots</th>
                          <th className="px-4 py-3 font-medium">Collected</th>
                          <th className="px-4 py-3 font-medium">Pending</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.listingPackages.packages.map((pkg) => (
                          <tr
                            key={`${pkg.audience}-${pkg.id}`}
                            className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface-2)]/50"
                          >
                            <td className="px-4 py-3 text-[var(--admin-text)]">
                              {pkg.name}
                            </td>
                            <td className="px-4 py-3 text-[var(--admin-muted)]">
                              {PACKAGE_AUDIENCE_LABEL[pkg.audience]}
                            </td>
                            <td className="px-4 py-3 text-[var(--admin-muted)]">
                              {pkg.count}
                            </td>
                            <td className="px-4 py-3 text-[var(--admin-muted)]">
                              {pkg.slots}
                            </td>
                            <td className="px-4 py-3 text-[var(--admin-text)]">
                              {formatLkr(pkg.totalLkr)}
                            </td>
                            <td className="px-4 py-3 text-[var(--admin-muted)]">
                              {pkg.pendingCount > 0
                                ? formatLkr(pkg.pendingLkr)
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              <section className="admin-card overflow-hidden">
                <h3 className="border-b border-[var(--admin-border)] px-4 py-3 text-sm font-medium text-[var(--admin-text)]">
                  Who paid
                </h3>
                {data.listingPackages.users.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                    No sellers have a collected listing package in this period.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
                        <tr>
                          <th className="px-4 py-3 font-medium">Seller</th>
                          <th className="px-4 py-3 font-medium">Packages</th>
                          <th className="px-4 py-3 font-medium">Last paid</th>
                          <th className="px-4 py-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.listingPackages.users.map((user) => (
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
            <section className="admin-card overflow-hidden">
              <h3 className="border-b border-[var(--admin-border)] px-4 py-3 text-sm font-medium text-[var(--admin-text)]">
                Needs attention
              </h3>
              {data.listingPackages.exceptions.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                  No pending, failed, or chargeback orders in this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">When</th>
                        <th className="px-4 py-3 font-medium">Seller</th>
                        <th className="px-4 py-3 font-medium">Package</th>
                        <th className="px-4 py-3 font-medium">Order</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.listingPackages.exceptions.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface-2)]/50"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-[var(--admin-muted)]">
                            {formatWhen(order.at)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[var(--admin-text)]">
                              {order.sellerName}
                            </p>
                            <p className="text-xs text-[var(--admin-muted)]">
                              {order.sellerEmail}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-text)]">
                            {order.packageName}
                            <p className="text-xs text-[var(--admin-muted)]">
                              {PACKAGE_AUDIENCE_LABEL[order.audience]}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[var(--admin-muted)]">
                            {order.payhereOrderId}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${bucketTone(order.bucket)}`}
                            >
                              {BUCKET_LABEL[order.bucket]}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-[var(--admin-text)]">
                            {formatLkr(order.amountLkr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
          )}

          {view === 'promotions' ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
                  Promotion ledger
                </h2>
                <p className="text-xs text-[var(--admin-muted)]" aria-live="polite">
                  {data.transactionCount.toLocaleString('en-LK')} matching
                  {ledgerLoading ? ' · updating' : ''}
                </p>
              </div>
              <input
                className="admin-field-inline w-full! min-w-0! max-w-none! sm:w-64!"
                value={query}
                onChange={(event) => setQuery(event.target.value.slice(0, 80))}
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
                  ['failed', 'Failed'],
                  ['rejected', 'Rejected'],
                  ['chargeback', 'Chargebacks'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectBucket(id)}
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
                  onClick={() => selectChannel(id)}
                  className={chipClass(channel === id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              className={`admin-card overflow-hidden ${ledgerLoading ? 'opacity-70' : ''}`}
              aria-busy={ledgerLoading}
            >
              {ledgerLoading ? (
                <p className="px-4 pt-3 text-xs text-[var(--admin-muted)]">
                  Loading ledger…
                </p>
              ) : null}
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] px-4 py-3">
                <p className="text-xs text-[var(--admin-muted)]">
                  Page {pageLabel} of {pageTotal}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="admin-btn-ghost inline-flex min-h-11 items-center px-3 py-2 text-sm disabled:opacity-50"
                    disabled={page <= 1 || ledgerLoading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="admin-btn-ghost inline-flex min-h-11 items-center px-3 py-2 text-sm disabled:opacity-50"
                    disabled={pageCount === 0 || page >= pageCount || ledgerLoading}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
