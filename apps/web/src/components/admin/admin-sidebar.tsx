'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { AdminDashboard } from '@/lib/admin-types';
import { getAccessToken } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { BrandLogo } from '../brand-logo';

type BadgeKey = 'moderation' | 'reports' | 'promos';

const nav = [
  {
    group: 'General',
    items: [
      { href: '', label: 'Overview', icon: OverviewIcon },
      {
        href: '/moderation',
        label: 'Moderation',
        icon: ShieldIcon,
        badgeKey: 'moderation' as const,
      },
      {
        href: '/reports',
        label: 'Reports',
        icon: FlagIcon,
        badgeKey: 'reports' as const,
      },
    ],
  },
  {
    group: 'Bikes',
    items: [
      { href: '/listings', label: 'Listings', icon: ListingsIcon },
      { href: '/dealers', label: 'Dealer shops', icon: ShopIcon },
    ],
  },
  {
    group: 'Parts',
    items: [
      { href: '/part-listings', label: 'Part listings', icon: PartIcon },
      { href: '/parts-dealers', label: 'Parts shops', icon: PartsShopIcon },
      { href: '/part-categories', label: 'Part categories', icon: TagIcon },
    ],
  },
  {
    group: 'Catalog',
    items: [
      { href: '/taxonomy', label: 'Taxonomy', icon: CatalogIcon },
    ],
  },
  {
    group: 'Ads',
    items: [
      {
        href: '/homepage-ads',
        label: 'Homepage ads',
        icon: AdsIcon,
        badgeKey: 'promos' as const,
      },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/users', label: 'Users', icon: UsersIcon },
      { href: '/audit', label: 'Audit log', icon: AuditIcon },
    ],
  },
] as const;

function NavCountBadge({ count }: { count: number; active?: boolean }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent)] px-1.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

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
  const [counts, setCounts] = useState<Record<BadgeKey, number>>({
    moderation: 0,
    reports: 0,
    promos: 0,
  });
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const loadCounts = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const dash = await apiGet<AdminDashboard>('/api/v1/admin/dashboard', {
        token,
      });
      setCounts({
        moderation:
          dash.pendingListings +
          dash.pendingDealers +
          (dash.pendingPartsDealers ?? 0) +
          (dash.pendingPartListings ?? 0),
        reports: dash.openReports,
        promos: dash.pendingPromoRequests ?? 0,
      });
    } catch {
      /* keep last known counts */
    }
  }, []);

  useEffect(() => {
    void loadCounts();
    const id = window.setInterval(() => void loadCounts(), 30_000);
    function onFocus() {
      void loadCounts();
    }
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadCounts, pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, onClose]);

  function badgeFor(key?: BadgeKey) {
    if (!key) return 0;
    return counts[key] ?? 0;
  }

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
        id="admin-sidebar"
        role={!desktop ? 'dialog' : undefined}
        aria-modal={!desktop && mobileOpen ? true : undefined}
        aria-label="Admin navigation"
        inert={!desktop && !mobileOpen ? true : undefined}
        className={`fixed inset-y-0 left-0 z-50 flex h-svh w-64 flex-col border-r border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <BrandLogo size="admin" />
          <p className="text-[11px] tracking-wide text-[var(--admin-faint)] uppercase">
            Admin
          </p>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {nav.map((section) => (
            <div key={section.group}>
              <p className="mb-1.5 px-3 text-[11px] font-medium tracking-wider text-[var(--admin-faint)] uppercase">
                {section.group}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const href = `${base}${item.href}`;
                  const active =
                    item.href === ''
                      ? pathname === base || pathname === `${base}/`
                      : pathname === href || pathname.startsWith(`${href}/`);
                  const Icon = item.icon;
                  const badgeKey =
                    'badgeKey' in item ? (item.badgeKey as BadgeKey) : undefined;
                  const count = badgeFor(badgeKey);
                  return (
                    <li key={item.href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                          active
                            ? 'bg-[var(--admin-accent-soft)] font-medium text-[var(--admin-accent-2)]'
                            : 'text-[var(--admin-muted)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-text)]'
                        }`}
                        aria-label={
                          count > 0 && badgeKey === 'moderation'
                            ? `Moderation, ${count} pending`
                            : count > 0 && badgeKey === 'reports'
                              ? `Reports, ${count} open`
                              : count > 0 && badgeKey === 'promos'
                                ? `Homepage ads, ${count} pending`
                                : undefined
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <NavCountBadge count={count} active={active} />
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
            className="admin-btn-ghost mb-2 block px-4 py-2.5 text-center text-sm"
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

function PartsShopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </svg>
  );
}

function AdsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16v6H4z" />
      <path d="M8 15h8" />
      <path d="M10 19h4" />
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

function PartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function CatalogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}

function AuditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}
