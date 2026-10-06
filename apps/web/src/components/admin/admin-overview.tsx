'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { auditActionLabel, auditActorLabel, auditAreaLabel } from '@/lib/audit';
import { getAccessToken } from '@/lib/auth';
import type { AdminDashboard } from '@/lib/admin-types';
import type { Locale } from '@/lib/i18n';

type AuditRow = {
  id: string;
  actorName: string | null;
  action: string;
  entityType: string;
  area?: string;
  note: string | null;
  createdAt: string;
};

function count(value: number | undefined) {
  return value ?? 0;
}

function formatCount(value: number) {
  return value.toLocaleString('en-LK');
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-LK', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AdminOverview({ locale }: { locale: Locale }) {
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    void apiGet<AdminDashboard>('/api/v1/admin/dashboard', { token })
      .then(setDash)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load dashboard'),
      );
    void apiGetWithMeta<AuditRow[]>('/api/v1/admin/audit-logs', {
      token,
      searchParams: { page: '1', limit: '6' },
    })
      .then((result) => setActivity(result.data))
      .catch(() => setActivity([]));
  }, []);

  if (error) {
    return <p className="text-sm text-[var(--admin-danger)]">{error}</p>;
  }

  if (!dash) {
    return (
      <div className="space-y-6" aria-busy="true" role="status" aria-live="polite">
        <p className="text-sm text-[var(--admin-muted)]">Loading overview…</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="admin-card h-36 animate-pulse bg-[var(--admin-surface-2)]" />
          ))}
        </div>
      </div>
    );
  }

  const attention = [
    {
      label: 'Bike listings',
      hint: 'Waiting for review',
      value: dash.pendingListings,
      href: `/${locale}/admin/moderation?queue=listings`,
      tint: 'text-[var(--admin-accent)] bg-[var(--admin-accent-soft)]',
      icon: BikeIcon,
    },
    {
      label: 'Part listings',
      hint: 'Waiting for review',
      value: dash.pendingPartListings,
      href: `/${locale}/admin/moderation?queue=part-listings`,
      tint: 'text-[var(--admin-info)] bg-[var(--admin-info)]/10',
      icon: BoxIcon,
    },
    {
      label: 'Dealer applications',
      hint: 'Bike shops',
      value: dash.pendingDealers,
      href: `/${locale}/admin/moderation?queue=dealers`,
      tint: 'text-[var(--admin-text)] bg-black/5',
      icon: ShopIcon,
    },
    {
      label: 'Parts dealer applications',
      hint: 'Parts shops',
      value: dash.pendingPartsDealers,
      href: `/${locale}/admin/moderation?queue=parts-dealers`,
      tint: 'text-[var(--admin-pink)] bg-[var(--admin-pink)]/10',
      icon: ShopIcon,
    },
    {
      label: 'Open reports',
      hint: 'Listing reports',
      value: dash.openReports,
      href: `/${locale}/admin/reports`,
      tint: 'text-[var(--admin-warning)] bg-[var(--admin-warning)]/10',
      icon: FlagIcon,
    },
    {
      label: 'Paid promotions',
      hint: 'Ready to place',
      value: count(dash.pendingPromoRequests),
      href: `/${locale}/admin/homepage-ads`,
      tint: 'text-[var(--admin-accent)] bg-[var(--admin-accent-soft)]',
      icon: AdsIcon,
    },
  ];
  const waiting = attention.filter((item) => item.value > 0);
  const waitingTotal = waiting.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[11px] font-semibold tracking-wider text-[var(--admin-faint)] uppercase">
              Needs attention
            </h2>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">
              {waitingTotal === 0
                ? 'Nothing is waiting.'
                : `${formatCount(waitingTotal)} item${waitingTotal === 1 ? '' : 's'} across ${waiting.length} queue${waiting.length === 1 ? '' : 's'}.`}
            </p>
          </div>
        </div>

        {waiting.length === 0 ? (
          <div className="admin-card mt-3 flex items-center gap-4 px-5 py-5" role="status">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--admin-success)]/15 text-[var(--admin-success)]"
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
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
                All queues clear
              </p>
              <p className="mt-0.5 text-sm text-[var(--admin-muted)]">
                Listings, shops, reports, and paid promotions are up to date.
              </p>
            </div>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {waiting.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="admin-card group flex h-full flex-col p-4 transition motion-safe:hover:-translate-y-0.5 hover:border-[var(--admin-accent)]/40 hover:shadow-[0_0_24px_rgba(225,6,0,0.12)]"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${item.tint}`}
                        aria-hidden
                      >
                        <Icon />
                      </span>
                      <span className="rounded-full bg-[var(--admin-text)] px-3 py-1 text-xs font-semibold text-white transition group-hover:bg-[var(--admin-accent)]">
                        Review
                      </span>
                    </span>
                    <span className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-wide text-[var(--admin-text)]">
                      {formatCount(item.value)}
                    </span>
                    <span className="mt-1 text-sm font-medium text-[var(--admin-text)]">
                      {item.label}
                    </span>
                    <span className="mt-0.5 text-xs text-[var(--admin-muted)]">{item.hint}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-[11px] font-semibold tracking-wider text-[var(--admin-faint)] uppercase">
          Marketplace
        </h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Snapshot
            title="Bikes"
            href={`/${locale}/admin/listings`}
            linkLabel="Listings"
            stats={[
              { label: 'Active', value: dash.activeListings },
              { label: 'In review', value: dash.pendingListings },
              { label: 'Sold', value: count(dash.soldListings) },
            ]}
          />
          <Snapshot
            title="Parts"
            href={`/${locale}/admin/part-listings`}
            linkLabel="Part listings"
            stats={[
              { label: 'Active', value: count(dash.activePartListings) },
              { label: 'In review', value: dash.pendingPartListings },
              { label: 'Sold', value: count(dash.soldPartListings) },
            ]}
          />
          <Snapshot
            title="Shops"
            href={`/${locale}/admin/users`}
            linkLabel="Users"
            stats={[
              { label: 'Bike dealers', value: count(dash.activeDealers) },
              { label: 'Parts dealers', value: count(dash.activePartsDealers) },
              { label: 'Users', value: dash.users },
            ]}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            [`/${locale}/admin/dealers`, 'Dealer shops'],
            [`/${locale}/admin/parts-dealers`, 'Parts shops'],
            [`/${locale}/admin/monetize`, 'Promotion revenue'],
            [`/${locale}`, 'View marketplace'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-9 items-center rounded-full border border-[var(--admin-border-strong)] bg-white px-3 text-sm font-medium text-[var(--admin-muted)] transition hover:border-[var(--admin-text)] hover:text-[var(--admin-text)]"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[11px] font-semibold tracking-wider text-[var(--admin-faint)] uppercase">
            Recent activity
          </h2>
          <Link
            href={`/${locale}/admin/audit`}
            className="text-sm font-medium text-[var(--admin-accent)] hover:underline"
          >
            Audit log
          </Link>
        </div>
        <div className="admin-card mt-3 overflow-hidden">
          {activity == null ? (
            <p className="px-4 py-4 text-sm text-[var(--admin-muted)]">
              Loading activity…
            </p>
          ) : activity.length === 0 ? (
            <p className="px-4 py-4 text-sm text-[var(--admin-muted)]">
              No audited actions yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--admin-border)]">
              {activity.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start gap-3 px-4 py-3.5 sm:items-center"
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-surface-2)] text-[var(--admin-muted)] sm:mt-0"
                    aria-hidden
                  >
                    <AuditIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--admin-text)]">
                      {auditActorLabel(row.actorName)} · {auditActionLabel(row.action)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--admin-muted)]">
                      <span className="rounded-full bg-[var(--admin-surface-2)] px-2 py-0.5">
                        {auditAreaLabel(row.area, row.entityType)}
                      </span>
                      {row.note ? <span className="ml-2">{row.note}</span> : null}
                    </p>
                  </div>
                  <time
                    dateTime={row.createdAt}
                    className="shrink-0 text-xs text-[var(--admin-faint)]"
                  >
                    {formatWhen(row.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Snapshot({
  title,
  href,
  linkLabel,
  stats,
}: {
  title: string;
  href: string;
  linkLabel: string;
  stats: { label: string; value: number }[];
}) {
  return (
    <section className="admin-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
          {title}
        </h3>
        <Link
          href={href}
          className="text-sm font-medium text-[var(--admin-accent)] hover:underline"
        >
          {linkLabel}
        </Link>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-[var(--admin-border)]">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 bg-[var(--admin-surface)] px-3 py-3">
            <dt className="text-[11px] text-[var(--admin-muted)]">{stat.label}</dt>
            <dd
              className={`mt-1 font-[family-name:var(--font-display)] text-2xl tracking-wide ${
                stat.label === 'In review' && stat.value > 0
                  ? 'text-[var(--admin-accent)]'
                  : 'text-[var(--admin-text)]'
              }`}
            >
              {formatCount(stat.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      {children}
    </svg>
  );
}

function BikeIcon() {
  return (
    <Icon>
      <circle cx="6.5" cy="16.5" r="3" />
      <circle cx="17.5" cy="16.5" r="3" />
      <path d="M6.5 16.5 10 8h4l2 4h3M10 8l2 8" />
    </Icon>
  );
}

function BoxIcon() {
  return (
    <Icon>
      <path d="M3 8 12 4l9 4-9 4-9-4Z" />
      <path d="M3 8v8l9 4 9-4V8" />
      <path d="M12 12v8" />
    </Icon>
  );
}

function ShopIcon() {
  return (
    <Icon>
      <path d="M4 10 6 4h12l2 6" />
      <path d="M4 10h16v9H4z" />
      <path d="M9 19v-5h6v5" />
    </Icon>
  );
}

function FlagIcon() {
  return (
    <Icon>
      <path d="M6 20V4" />
      <path d="M6 5h11l-2 4 2 4H6" />
    </Icon>
  );
}

function AdsIcon() {
  return (
    <Icon>
      <path d="M4 10v4h3l6 4V6L7 10H4Z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
    </Icon>
  );
}

function AuditIcon() {
  return (
    <Icon>
      <path d="M8 4h8l3 3v13H8z" />
      <path d="M16 4v3h3M10 12h6M10 16h4" />
    </Icon>
  );
}
