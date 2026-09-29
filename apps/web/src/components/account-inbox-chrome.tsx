'use client';

import type { ReactNode } from 'react';
import { t, type Locale } from '@/lib/i18n';

export const inboxCardClass =
  'overflow-hidden border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_12px_32px_-18px_rgba(0,0,0,0.22)]';

export type InboxFilter = 'all' | 'unread';

export function InboxToolbar({
  locale,
  filter,
  onFilterChange,
  unreadCount,
  action,
}: {
  locale: Locale;
  filter: InboxFilter;
  onFilterChange: (next: InboxFilter) => void;
  unreadCount: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label={t(locale, 'inboxFilters')}
          className="inline-flex rounded-full border border-black/10 bg-white p-0.5 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
        >
          {(
            [
              ['all', 'inboxFilterAll'],
              ['unread', 'inboxFilterUnread'],
            ] as const
          ).map(([value, key]) => {
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  active
                    ? 'bg-accent/10 font-medium text-accent'
                    : 'text-muted hover:text-foreground'
                }`}
                onClick={() => onFilterChange(value)}
              >
                {t(locale, key)}
              </button>
            );
          })}
        </div>
        {unreadCount > 0 ? (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-2 text-[11px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </div>
      {action ? <div className="sm:shrink-0">{action}</div> : null}
    </div>
  );
}

export function InboxSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={inboxCardClass} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3.5 border-b border-black/10 px-4 py-4 last:border-b-0 sm:px-5"
        >
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-black/[0.06]" />
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <div className="h-3.5 w-2/5 max-w-[10rem] animate-pulse rounded bg-black/[0.06]" />
            <div className="h-3 w-4/5 max-w-[18rem] animate-pulse rounded bg-black/[0.05]" />
          </div>
          <div className="h-3 w-10 shrink-0 animate-pulse rounded bg-black/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export function InboxEmpty({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className={`${inboxCardClass} px-6 py-14 text-center`}>
      <span
        className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
          <path
            d="M6 8.5h12M6 12h8M6 15.5h10"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <rect
            x="3.5"
            y="4.5"
            width="17"
            height="15"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
      </span>
      <p className="mt-4 text-sm text-muted">{title}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
