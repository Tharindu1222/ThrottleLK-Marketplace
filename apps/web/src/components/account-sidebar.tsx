'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  type AuthUser,
} from '@/lib/auth';
import { apiGet, apiSend } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';

type NavItem = {
  href: string;
  labelKey:
    | 'accountDetails'
    | 'dealerShowroom'
    | 'performance'
    | 'inventory'
    | 'partsShowroom'
    | 'partsPerformance'
    | 'partsListings'
    | 'myListings'
    | 'messages'
    | 'notifications'
    | 'savedListings'
    | 'savedSearches';
  match: (path: string) => boolean;
  icon: ReactNode;
  dealerOnly?: boolean;
  partsDealerOnly?: boolean;
  badgeKey?: 'messages' | 'notifications';
};

const POLL_MS = 30_000;

type ConversationRow = { unread?: boolean };

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-[18px] w-[18px]">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5.5 19.25c1.6-3.1 4-4.75 6.5-4.75s4.9 1.65 6.5 4.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconListings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-[18px] w-[18px]">
      <path
        d="M4.5 7.5h15M4.5 12h15M4.5 16.5h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconShowroom() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-[18px] w-[18px]">
      <path
        d="M4.5 10.5 12 4.5l7.5 6V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-5h-5v5H6A1.5 1.5 0 0 1 4.5 19v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPerformance() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-[18px] w-[18px]">
      <path
        d="M5 16.5v-3.5M10 16.5V8M15 16.5v-5M20 16.5V5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconInventory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-[18px] w-[18px]">
      <path
        d="M4.5 7.5 12 3.5l7.5 4v9L12 20.5 4.5 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 12v8.5M4.5 7.5 12 12l7.5-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMessages() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-[18px] w-[18px]">
      <path
        d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H10l-3.8 2.6A.6.6 0 0 1 5 18.1V7.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-[18px] w-[18px]">
      <path
        d="M12 4.5a4.5 4.5 0 0 1 4.5 4.5v2.2c0 .7.2 1.4.6 2l1.1 1.5H5.8l1.1-1.5c.4-.6.6-1.3.6-2V9A4.5 4.5 0 0 1 12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.5a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-[18px] w-[18px]">
      <path
        d="M12 19s-6.5-4.1-8.2-7.2C2.5 9.5 3.6 6.8 6.3 6.2c1.6-.3 3.1.4 3.9 1.6.8-1.2 2.3-1.9 3.9-1.6 2.7.6 3.8 3.3 2.5 5.6C18.5 14.9 12 19 12 19Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-[18px] w-[18px]">
      <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M15.5 15.5 19 19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function navItems(locale: Locale): NavItem[] {
  const base = `/${locale}/account`;
  return [
    {
      href: `${base}/profile`,
      labelKey: 'accountDetails',
      match: (p) => p.includes('/account/profile'),
      icon: <IconUser />,
    },
    {
      href: `${base}/showroom`,
      labelKey: 'dealerShowroom',
      match: (p) =>
        p.includes('/account/showroom') && !p.includes('parts-showroom'),
      icon: <IconShowroom />,
      dealerOnly: true,
    },
    {
      href: `${base}/performance`,
      labelKey: 'performance',
      match: (p) =>
        p.includes('/account/performance') && !p.includes('parts-performance'),
      icon: <IconPerformance />,
      dealerOnly: true,
    },
    {
      href: `${base}/inventory`,
      labelKey: 'inventory',
      match: (p) => p.includes('/account/inventory'),
      icon: <IconInventory />,
      dealerOnly: true,
    },
    {
      href: `${base}/parts-showroom`,
      labelKey: 'partsShowroom',
      match: (p) => p.includes('/account/parts-showroom'),
      icon: <IconShowroom />,
      partsDealerOnly: true,
    },
    {
      href: `${base}/parts-performance`,
      labelKey: 'partsPerformance',
      match: (p) => p.includes('/account/parts-performance'),
      icon: <IconPerformance />,
      partsDealerOnly: true,
    },
    {
      href: `${base}/parts-listings`,
      labelKey: 'partsListings',
      match: (p) => p.includes('/account/parts-listings'),
      icon: <IconListings />,
      partsDealerOnly: true,
    },
    {
      href: `${base}/listings`,
      labelKey: 'myListings',
      match: (p) => p.includes('/account/listings') && !p.includes('parts-listings'),
      icon: <IconListings />,
    },
    {
      href: `${base}/messages`,
      labelKey: 'messages',
      match: (p) => p.includes('/account/messages'),
      icon: <IconMessages />,
      badgeKey: 'messages',
    },
    {
      href: `${base}/notifications`,
      labelKey: 'notifications',
      match: (p) => p.includes('/account/notifications'),
      icon: <IconBell />,
      badgeKey: 'notifications',
    },
    {
      href: `${base}/favourites`,
      labelKey: 'savedListings',
      match: (p) => p.includes('/account/favourites'),
      icon: <IconHeart />,
    },
    {
      href: `${base}/saved-searches`,
      labelKey: 'savedSearches',
      match: (p) => p.includes('/account/saved-searches'),
      icon: <IconSearch />,
    },
  ];
}

function SidebarAvatar({ user }: { user: AuthUser | null }) {
  const name = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : '';
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : '?';

  if (user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-sm"
      aria-hidden
    >
      {initials || (name ? name.slice(0, 2).toUpperCase() : '?')}
    </div>
  );
}

export function AccountSidebar({ locale }: { locale: Locale }) {
  const pathname = usePathname() || '';
  const [user, setUser] = useState<AuthUser | null>(null);
  const [messageUnread, setMessageUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);

  const refreshCounts = useCallback(async (token: string) => {
    const [conversations, notif] = await Promise.all([
      apiGet<ConversationRow[]>('/api/v1/conversations', {
        token,
        searchParams: { limit: '50' },
      }),
      apiGet<{ count: number }>('/api/v1/notifications/unread-count', {
        token,
      }),
    ]);
    setMessageUnread(conversations.filter((c) => c.unread).length);
    setNotificationUnread(notif.count ?? 0);
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
    const token = getAccessToken();
    if (!token) return;
    void refreshCounts(token).catch(() => undefined);
    const id = window.setInterval(() => {
      void refreshCounts(token).catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshCounts, pathname]);

  const isDealer = Boolean(user?.roles?.includes('dealer'));
  const isPartsDealer = Boolean(user?.roles?.includes('parts_dealer'));
  const items = navItems(locale).filter((item) => {
    if (item.dealerOnly && !isDealer) return false;
    if (item.partsDealerOnly && !isPartsDealer) return false;
    return true;
  });

  function badgeFor(item: NavItem) {
    if (item.badgeKey === 'messages') return messageUnread;
    if (item.badgeKey === 'notifications') return notificationUnread;
    return 0;
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await apiSend('/api/v1/auth/logout', {
          body: { refreshToken },
        });
      }
    } catch {
      // clear anyway
    } finally {
      clearSession();
      window.location.href = `/${locale}`;
    }
  }

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : t(locale, 'accountNav');

  return (
    <aside className="flex flex-col gap-3 px-4 pt-4 lg:sticky lg:top-[4.25rem] lg:h-[calc(100svh-4.25rem)] lg:w-[260px] lg:shrink-0 lg:gap-0 lg:self-start lg:px-0 lg:pt-0 xl:w-[280px]">
      {/* Mobile chips */}
      <nav
        aria-label={t(locale, 'accountNav')}
        className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
      >
        {items.map((item) => {
          const active = item.match(pathname);
          const count = badgeFor(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap transition ${
                active
                  ? 'border-black/20 bg-white text-accent shadow-[0_1px_0_rgba(0,0,0,0.06)]'
                  : 'border-black/15 bg-white text-muted hover:border-black/25 hover:text-foreground'
              }`}
            >
              <span className={active ? 'text-accent' : 'text-muted'}>
                {item.icon}
              </span>
              {t(locale, item.labelKey)}
              <CountBadge count={count} />
            </Link>
          );
        })}
      </nav>

      {/* Desktop panel */}
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden border-r border-black/10 bg-white lg:flex">
        <div className="shrink-0 border-b border-black/15 bg-gradient-to-b from-[#eef0f3] to-white px-4 py-4">
          <div className="flex items-center gap-3">
            <SidebarAvatar user={user} />
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-display)] text-[15px] tracking-wide text-foreground">
                {displayName}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {user?.email ?? t(locale, 'accountNav')}
              </p>
            </div>
          </div>
        </div>

        <p className="shrink-0 px-4 pt-4 pb-1 text-[10px] tracking-[0.2em] text-muted uppercase">
          {t(locale, 'accountNav')}
        </p>

        <nav
          aria-label={t(locale, 'accountNav')}
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
        >
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = item.match(pathname);
              const count = badgeFor(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition ${
                      active
                        ? 'bg-[#eef0f3] font-medium text-foreground'
                        : 'text-muted hover:bg-[#f4f5f7] hover:text-foreground'
                    }`}
                    aria-label={
                      count > 0 && item.badgeKey === 'messages'
                        ? t(locale, 'unreadMessages').replace(
                            '{n}',
                            String(count),
                          )
                        : count > 0 && item.badgeKey === 'notifications'
                          ? t(locale, 'unreadNotifications').replace(
                              '{n}',
                              String(count),
                            )
                          : undefined
                    }
                  >
                    <span
                      className={`h-5 w-0.5 shrink-0 rounded-full transition ${
                        active
                          ? 'bg-accent'
                          : 'bg-transparent group-hover:bg-black/20'
                      }`}
                      aria-hidden
                    />
                    <span
                      className={`shrink-0 ${
                        active ? 'text-accent' : 'text-muted group-hover:text-foreground'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{t(locale, item.labelKey)}</span>
                    <CountBadge count={count} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-black/15 p-2">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm text-muted transition hover:bg-[#f4f5f7] hover:text-foreground"
          >
            <span className="h-5 w-0.5 shrink-0" aria-hidden />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="h-[18px] w-[18px] shrink-0"
            >
              <path
                d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 10 18.5V17"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M13 12H4m0 0 2.5-2.5M4 12l2.5 2.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t(locale, 'logout')}
          </button>
        </div>
      </div>
    </aside>
  );
}
