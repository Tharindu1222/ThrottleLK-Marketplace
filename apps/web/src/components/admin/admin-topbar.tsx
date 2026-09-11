'use client';

import { getStoredUser } from '@/lib/auth';
import { useEffect, useState } from 'react';

export function AdminTopbar({
  title,
  subtitle,
  onMenuClick,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search Here',
}: {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const [name, setName] = useState('Admin');

  useEffect(() => {
    const user = getStoredUser();
    if (user) setName(`${user.firstName} ${user.lastName}`.trim() || user.email);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-4 border-b border-[var(--admin-border)] bg-[var(--admin-bg)]/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        className="rounded-xl border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] p-2 text-[var(--admin-muted)] lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-sm font-semibold text-[var(--admin-accent-2)] ring-2 ring-[var(--admin-accent)]/40 sm:flex">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--admin-text)]">
              Welcome! {name}
            </p>
            <p className="truncate text-xs text-[var(--admin-faint)]">{subtitle ?? title}</p>
          </div>
        </div>
      </div>

      {onSearchChange ? (
        <label className="relative order-last w-full sm:order-none sm:max-w-md sm:flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--admin-faint)]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <input
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-full border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] py-2.5 pr-4 pl-10 text-sm text-[var(--admin-text)] outline-none placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/30"
          />
        </label>
      ) : null}

      <div className="flex items-center gap-2">
        <span className="rounded-xl border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] p-2.5 text-[var(--admin-muted)]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
      </div>
    </header>
  );
}
