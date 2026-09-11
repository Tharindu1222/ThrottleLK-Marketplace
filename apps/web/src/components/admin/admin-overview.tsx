'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { AdminDashboard } from '@/lib/admin-types';
import type { Locale } from '@/lib/i18n';
import { OverviewCharts } from './overview-charts';

export function AdminOverview({ locale }: { locale: Locale }) {
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    void apiGet<AdminDashboard>('/api/v1/admin/dashboard', { token })
      .then(setDash)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load dashboard'),
      );
  }, []);

  if (error) {
    return <p className="text-sm text-[var(--admin-danger)]">{error}</p>;
  }

  if (!dash) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading dashboard…</p>;
  }

  const cards = [
    {
      label: 'Total users',
      value: dash.users,
      href: `/${locale}/admin/users`,
      tint: 'bg-[#6366f1]/15 text-[#a5b4fc]',
      iconBg: 'bg-[#6366f1]/20 text-[#818cf8]',
    },
    {
      label: 'Active listings',
      value: dash.activeListings,
      href: `/${locale}/bikes`,
      tint: 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent-2)]',
      iconBg: 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-2)]',
    },
    {
      label: 'Pending listings',
      value: dash.pendingListings,
      href: `/${locale}/admin/moderation`,
      tint: 'bg-[#38bdf8]/15 text-[#7dd3fc]',
      iconBg: 'bg-[#38bdf8]/20 text-[#38bdf8]',
    },
    {
      label: 'Pending dealers',
      value: dash.pendingDealers,
      href: `/${locale}/admin/moderation`,
      tint: 'bg-[#f43f5e]/15 text-[#fb7185]',
      iconBg: 'bg-[#f43f5e]/20 text-[#f43f5e]',
    },
    {
      label: 'Open reports',
      value: dash.openReports,
      href: `/${locale}/admin/reports`,
      tint: 'bg-[#ec4899]/15 text-[#f9a8d4]',
      iconBg: 'bg-[#ec4899]/20 text-[#ec4899]',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--admin-text)]">
          Overview
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Marketplace health and moderation queues at a glance.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="admin-card p-4 transition hover:-translate-y-0.5 hover:border-[var(--admin-accent)]/40 hover:shadow-[0_0_24px_rgba(124,92,252,0.15)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${card.tint}`}>
                {card.label}
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${card.iconBg}`}
              >
                {card.value > 99 ? '99+' : card.value}
              </span>
            </div>
            <p className="mt-4 font-[family-name:var(--font-display)] text-3xl text-[var(--admin-text)]">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <OverviewCharts dash={dash} />
    </div>
  );
}
