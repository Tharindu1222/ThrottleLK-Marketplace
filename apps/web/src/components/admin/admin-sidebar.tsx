'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

const nav = [
  {
    group: 'General',
    items: [
      { href: '', label: 'Overview', icon: OverviewIcon },
      { href: '/moderation', label: 'Moderation', icon: ShieldIcon },
      { href: '/reports', label: 'Reports', icon: FlagIcon },
    ],
  },
  {
    group: 'Manage',
    items: [
      { href: '/listings', label: 'Listings', icon: ListingsIcon },
      { href: '/dealers', label: 'Dealer shops', icon: ShopIcon },
      { href: '/users', label: 'Users', icon: UsersIcon },
      { href: '/taxonomy', label: 'Taxonomy', icon: TagIcon },
    ],
  },
] as const;

export function AdminSidebar({
  locale,
  mobileOpen,
  onClose,
}: {
  locale: Locale;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const base = `/${locale}/admin`;

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className={`fixed inset-0 z-40 bg-black/50 transition lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--admin-accent)] text-sm font-bold text-white shadow-[0_0_18px_rgba(124,92,252,0.45)]">
            TL
          </span>
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg tracking-wide text-[var(--admin-text)]">
              ThrottleLK
            </p>
            <p className="text-[11px] tracking-wide text-[var(--admin-faint)] uppercase">
              Admin
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {nav.map((section) => (
            <div key={section.group}>
              <p className="mb-2 px-3 text-[11px] font-medium tracking-wider text-[var(--admin-faint)] uppercase">
                {section.group}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const href = `${base}${item.href}`;
                  const active =
                    item.href === ''
                      ? pathname === base || pathname === `${base}/`
                      : pathname.startsWith(href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                          active
                            ? 'bg-[var(--admin-accent)] font-medium text-white shadow-[0_0_16px_rgba(124,92,252,0.35)]'
                            : 'text-[var(--admin-muted)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-text)]'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--admin-border)] p-4">
          <Link
            href={`/${locale}`}
            className="mb-3 block rounded-xl bg-gradient-to-br from-[#7c5cfc] to-[#a855f7] px-4 py-3 text-center text-sm font-medium text-white shadow-[0_8px_24px_rgba(124,92,252,0.3)]"
          >
            View marketplace
          </Link>
          <Link
            href={`/${locale}/account/profile`}
            className="block rounded-xl px-3 py-2 text-center text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-text)]"
          >
            Account
          </Link>
        </div>
      </aside>
    </>
  );
}

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ListingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function ShopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l1-5h16l1 5" />
      <path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
