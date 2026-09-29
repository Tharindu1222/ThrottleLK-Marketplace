'use client';

import { getStoredUser } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { AdminNotificationsBell } from './admin-notifications-bell';

export function AdminTopbar({
  locale,
  title,
  subtitle,
  onMenuClick,
  menuExpanded = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
}: {
  locale: Locale;
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  menuExpanded?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const [name, setName] = useState('Admin');
  const [draft, setDraft] = useState(searchValue ?? '');

  useEffect(() => {
    const user = getStoredUser();
    if (user) setName(`${user.firstName} ${user.lastName}`.trim() || user.email);
  }, []);

  useEffect(() => {
    setDraft(searchValue ?? '');
  }, [searchValue]);

  useEffect(() => {
    if (!onSearchChange) return;
    if (draft === (searchValue ?? '')) return;
    const timer = window.setTimeout(() => onSearchChange(draft), 400);
    return () => window.clearTimeout(timer);
  }, [draft, onSearchChange, searchValue]);

  return (
    <header className="z-30 flex flex-wrap items-center gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-bg)]/90 px-4 py-3 backdrop-blur-md sm:gap-4 sm:px-6 lg:px-8">
      <button
        type="button"
        className="rounded-xl border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] p-2 text-[var(--admin-muted)] lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
        aria-expanded={menuExpanded}
        aria-controls="admin-sidebar"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-sm font-semibold text-[var(--admin-accent-2)] ring-1 ring-[var(--admin-accent)]/30 sm:flex"
            title={name}
            aria-hidden
          >
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-display)] text-lg tracking-wide text-[var(--admin-text)] sm:text-xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-xs text-[var(--admin-faint)]">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>

      {onSearchChange ? (
        <label className="relative w-full max-w-md sm:flex-1">
          <span className="sr-only">Search {title}</span>
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--admin-faint)]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-full border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] py-2.5 pr-10 pl-10 text-sm text-[var(--admin-text)] outline-none placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/30"
          />
          {draft ? (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-[var(--admin-faint)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]"
              aria-label="Clear search"
              onClick={() => {
                setDraft('');
                onSearchChange('');
              }}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </label>
      ) : null}

      <div className="flex items-center gap-2">
        <AdminNotificationsBell locale={locale} />
      </div>
    </header>
  );
}
