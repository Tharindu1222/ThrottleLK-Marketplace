'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  clearSession,
  getAccessToken,
  getStoredUser,
  saveSession,
  type AuthUser,
} from '@/lib/auth';
import { apiGet, apiSend } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';
import {
  flattenAccountNav,
  visibleAccountNavSections,
  type AccountNavItemDef,
} from '@/lib/account-nav';

const POLL_MS = 120_000;

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

function navIcon(id: AccountNavItemDef['id']) {
  switch (id) {
    case 'profile':
      return <IconUser />;
    case 'listings':
    case 'partsListings':
      return <IconListings />;
    case 'showroom':
    case 'partsShowroom':
      return <IconShowroom />;
    case 'performance':
      return <IconPerformance />;
    case 'inventory':
      return <IconInventory />;
    case 'messages':
      return <IconMessages />;
    case 'notifications':
      return <IconBell />;
    case 'favourites':
      return <IconHeart />;
    case 'savedSearches':
      return <IconSearch />;
  }
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
        referrerPolicy="no-referrer"
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
  const [authReady, setAuthReady] = useState(false);
  const [messageUnread, setMessageUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);

  const refreshCounts = useCallback(async (token: string) => {
    const [conversations, notif] = await Promise.all([
      apiGet<ConversationRow[]>('/api/v1/conversations', {
        token,
        searchParams: { limit: '20' },
      }),
      apiGet<{ count: number }>('/api/v1/notifications/unread-count', {
        token,
      }),
    ]);
    setMessageUnread(conversations.filter((c) => c.unread).length);
    setNotificationUnread(notif.count ?? 0);
  }, []);

  useLayoutEffect(() => {
    setUser(getStoredUser());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    void apiGet<AuthUser>('/api/v1/users/me', { token })
      .then((me) => {
        setUser(me);
        saveSession({ user: me });
      })
      .catch(() => undefined);

    void refreshCounts(token).catch(() => undefined);
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refreshCounts(token).catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshCounts]);

  const isDealer = Boolean(user?.roles?.includes('dealer'));
  const isPartsDealer = Boolean(user?.roles?.includes('parts_dealer'));
  const roles = { isDealer, isPartsDealer };
  const sections = visibleAccountNavSections(roles);
  const items = flattenAccountNav(roles);

  function itemHref(item: AccountNavItemDef) {
    return `/${locale}/account${item.hrefSuffix}`;
  }

  function badgeFor(item: AccountNavItemDef) {
    if (item.badgeKey === 'messages') return messageUnread;
    if (item.badgeKey === 'notifications') return notificationUnread;
    return 0;
  }

  function unreadName(item: AccountNavItemDef, count: number) {
    if (count <= 0) return undefined;
    const label = t(locale, item.labelKey);
    if (item.badgeKey === 'messages') {
      return `${label}. ${t(locale, 'unreadMessages').replace('{n}', String(count))}`;
    }
    if (item.badgeKey === 'notifications') {
      return `${label}. ${t(locale, 'unreadNotifications').replace('{n}', String(count))}`;
    }
    return undefined;
  }

  async function logout() {
    try {
      await apiSend('/api/v1/auth/logout', { body: {} });
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

  if (!authReady) {
    return (
      <aside
        data-account-nav="grouped"
        aria-busy="true"
        className="flex w-full min-w-0 flex-col gap-3 px-4 pt-4 lg:sticky lg:top-[4.25rem] lg:h-[calc(100svh-4.25rem)] lg:w-[260px] lg:shrink-0 lg:gap-0 lg:self-start lg:px-0 lg:pt-0 xl:w-[280px]"
      >
        <div className="flex w-full min-w-0 gap-2 overflow-hidden pb-1 lg:hidden">
          <div className="h-11 w-28 animate-pulse rounded-full bg-black/10" />
          <div className="h-11 w-28 animate-pulse rounded-full bg-black/10" />
          <div className="h-11 w-28 animate-pulse rounded-full bg-black/10" />
        </div>
        <div className="hidden min-h-0 flex-1 flex-col overflow-hidden border-r border-black/10 bg-white lg:flex">
          <div className="flex items-center gap-3 border-b border-black/15 px-4 py-4">
            <div className="h-11 w-11 animate-pulse rounded-full bg-black/10" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-black/10" />
              <div className="h-3 w-36 animate-pulse rounded bg-black/10" />
            </div>
          </div>
          <div className="space-y-2 px-4 py-4">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="h-9 animate-pulse rounded bg-black/[0.06]"
              />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-account-nav="grouped"
      className="flex w-full min-w-0 flex-col gap-3 px-4 pt-4 lg:sticky lg:top-[4.25rem] lg:h-[calc(100svh-4.25rem)] lg:w-[260px] lg:shrink-0 lg:gap-0 lg:self-start lg:px-0 lg:pt-0 xl:w-[280px]"
    >
      {/* Mobile chips — same order as desktop, no section titles */}
      <nav
        aria-label={t(locale, 'accountNav')}
        className="flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 lg:hidden"
      >
        {items.map((item) => {
          const active = item.match(pathname);
          const count = badgeFor(item);
          return (
            <Link
              key={item.id}
              href={itemHref(item)}
              aria-current={active ? 'page' : undefined}
              aria-label={unreadName(item, count)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm whitespace-nowrap transition ${
                active
                  ? 'border-accent bg-white font-semibold text-accent underline decoration-2 underline-offset-4 shadow-[0_1px_0_rgba(0,0,0,0.06)]'
                  : 'border-black/15 bg-white font-medium text-muted hover:border-black/25 hover:text-foreground'
              }`}
            >
              <span className={active ? 'text-accent' : 'text-muted'}>
                {navIcon(item.id)}
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

        <nav
          aria-label={t(locale, 'accountNav')}
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
        >
          {sections.map((section) => (
            <div key={section.id} className="pt-3 first:pt-2">
              <h2
                id={`account-nav-${section.id}`}
                className="px-2 pb-1 text-[10px] font-medium tracking-[0.2em] text-muted uppercase"
              >
                {t(locale, section.labelKey)}
              </h2>
              <ul
                aria-labelledby={`account-nav-${section.id}`}
                className="space-y-0.5"
              >
                {section.items.map((item) => {
                  const active = item.match(pathname);
                  const count = badgeFor(item);
                  return (
                    <li key={item.id}>
                      <Link
                        href={itemHref(item)}
                        aria-current={active ? 'page' : undefined}
                        className={`group flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition ${
                          active
                            ? 'bg-[#eef0f3] font-medium text-foreground'
                            : 'text-muted hover:bg-[#f4f5f7] hover:text-foreground'
                        }`}
                        aria-label={unreadName(item, count)}
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
                            active
                              ? 'text-accent'
                              : 'text-muted group-hover:text-foreground'
                          }`}
                        >
                          {navIcon(item.id)}
                        </span>
                        <span className="truncate">
                          {t(locale, item.labelKey)}
                        </span>
                        <CountBadge count={count} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
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
