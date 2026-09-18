'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveSession,
  type AuthUser,
} from '@/lib/auth';
import { apiGet, apiSend } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';
import { AuthRequiredLink } from './auth-required-link';
import { BrandLogo } from './brand-logo';
import { CompareNavIcon } from './compare-nav-icon';
import { headerIconButtonClass } from './header-nav-badge';
import { LanguageSwitcher } from './language-switcher';
import { MessagesNavIcon } from './messages-nav-icon';
import { NotificationsBell } from './notifications-bell';

function AccountAvatar({
  user,
  size = 'sm',
}: {
  user: AuthUser;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'md' ? 'h-9 w-9 text-[11px]' : 'h-8 w-8 text-[10px]';
  const initials =
    `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.toUpperCase() ||
    '?';

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-black/10`}
      />
    );
  }

  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full bg-black/[0.06] font-[family-name:var(--font-display)] tracking-wide text-foreground ring-2 ring-black/10`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);

    const token = getAccessToken();
    if (!token) return;

    void apiGet<AuthUser>('/api/v1/users/me', { token })
      .then((me) => {
        setUser(me);
        const refresh = getRefreshToken();
        if (refresh) {
          saveSession({
            accessToken: token,
            refreshToken: refresh,
            user: {
              id: me.id,
              firstName: me.firstName,
              lastName: me.lastName,
              email: me.email,
              phone: me.phone,
              roles: me.roles,
              emailVerifiedAt: me.emailVerifiedAt,
              avatarUrl: me.avatarUrl ?? null,
            },
          });
        }
      })
      .catch(() => {
        // keep stored user if refresh fails
      });
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [locale]);

  useEffect(() => {
    if (!accountOpen) return;

    function onPointerDown(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);

  async function logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await apiSend('/api/v1/auth/logout', {
          body: { refreshToken },
        });
      }
    } catch {
      // clear local session anyway
    } finally {
      clearSession();
      setUser(null);
      setAccountOpen(false);
      window.location.href = `/${locale}`;
    }
  }

  const navLinkClass =
    'text-sm text-muted transition hover:text-foreground';

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-background/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6 sm:h-[4.25rem]">
        <Link
          href={`/${locale}`}
          className="shrink-0"
          aria-label={t(locale, 'brand')}
        >
          <BrandLogo size="header" />
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex" aria-label="Main">
          <Link href={`/${locale}/bikes`} className={navLinkClass}>
            {t(locale, 'browse')}
          </Link>
          <Link href={`/${locale}/dealers`} className={navLinkClass}>
            {t(locale, 'dealersNav')}
          </Link>
        </nav>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          <LanguageSwitcher locale={locale} />
          <CompareNavIcon locale={locale} />
          {user ? (
            <>
              <MessagesNavIcon locale={locale} />
              <NotificationsBell locale={locale} />
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  className={`${headerIconButtonClass} w-auto gap-1 px-1.5`}
                  aria-label={t(locale, 'accountNav')}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((o) => !o)}
                >
                  <AccountAvatar user={user} />
                  <svg
                    className={`h-3.5 w-3.5 opacity-70 transition ${accountOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M5.25 7.5L10 12.25 14.75 7.5" />
                  </svg>
                </button>
                {accountOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-52 border border-black/10 bg-background py-1 shadow-lg shadow-black/40"
                  >
                    <Link
                      role="menuitem"
                      href={`/${locale}/account/profile`}
                      className="block px-4 py-2.5 text-sm text-muted transition hover:bg-black/5 hover:text-foreground"
                      onClick={() => setAccountOpen(false)}
                    >
                      {t(locale, 'accountDetails')}
                    </Link>
                    <Link
                      role="menuitem"
                      href={`/${locale}/account/listings`}
                      className="block px-4 py-2.5 text-sm text-muted transition hover:bg-black/5 hover:text-foreground"
                      onClick={() => setAccountOpen(false)}
                    >
                      {t(locale, 'myListings')}
                    </Link>
                    <Link
                      role="menuitem"
                      href={`/${locale}/account/messages`}
                      className="block px-4 py-2.5 text-sm text-muted transition hover:bg-black/5 hover:text-foreground"
                      onClick={() => setAccountOpen(false)}
                    >
                      {t(locale, 'messages')}
                    </Link>
                    <Link
                      role="menuitem"
                      href={`/${locale}/account/notifications`}
                      className="block px-4 py-2.5 text-sm text-muted transition hover:bg-black/5 hover:text-foreground"
                      onClick={() => setAccountOpen(false)}
                    >
                      {t(locale, 'notifications')}
                    </Link>
                    <Link
                      role="menuitem"
                      href={`/${locale}/account/favourites`}
                      className="block px-4 py-2.5 text-sm text-muted transition hover:bg-black/5 hover:text-foreground"
                      onClick={() => setAccountOpen(false)}
                    >
                      {t(locale, 'savedListings')}
                    </Link>
                    <div className="my-1 border-t border-black/10" />
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-4 py-2.5 text-left text-sm text-muted transition hover:bg-black/5 hover:text-foreground"
                      onClick={() => void logout()}
                    >
                      {t(locale, 'logout')}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <Link href={`/${locale}/login`} className={navLinkClass}>
              {t(locale, 'login')}
            </Link>
          )}
          <AuthRequiredLink
            locale={locale}
            href={`/${locale}/sell`}
            className="ml-2 bg-accent px-4 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-white transition hover:brightness-110"
          >
            {t(locale, 'postAnAd')}
          </AuthRequiredLink>
        </div>

        <div className="ml-auto flex items-center gap-0.5 md:hidden">
          <LanguageSwitcher locale={locale} />
          <CompareNavIcon locale={locale} />
          {user ? (
            <>
              <MessagesNavIcon locale={locale} />
              <NotificationsBell locale={locale} />
            </>
          ) : null}
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center border border-black/15 text-foreground"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
          {menuOpen ? (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-black/10 bg-background md:hidden">
          <nav
            className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4"
            aria-label="Mobile"
          >
            <Link
              href={`/${locale}/bikes`}
              className="py-3 text-base text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {t(locale, 'browse')}
            </Link>
            <Link
              href={`/${locale}/dealers`}
              className="py-3 text-base text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {t(locale, 'dealersNav')}
            </Link>
            <div className="my-2 border-t border-black/10" />
            {user ? (
              <>
                <div className="flex items-center gap-3 py-2">
                  <AccountAvatar user={user} size="md" />
                  <span className="text-sm text-muted">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
                <Link
                  href={`/${locale}/account/profile`}
                  className="py-3 pl-2 text-base text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(locale, 'accountDetails')}
                </Link>
                <Link
                  href={`/${locale}/account/listings`}
                  className="py-3 pl-2 text-base text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(locale, 'myListings')}
                </Link>
                <Link
                  href={`/${locale}/account/messages`}
                  className="py-3 pl-2 text-base text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(locale, 'messages')}
                </Link>
                <Link
                  href={`/${locale}/account/notifications`}
                  className="py-3 pl-2 text-base text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(locale, 'notifications')}
                </Link>
                <Link
                  href={`/${locale}/account/favourites`}
                  className="py-3 pl-2 text-base text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(locale, 'savedListings')}
                </Link>
                <Link
                  href={`/${locale}/compare`}
                  className="py-3 pl-2 text-base text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(locale, 'compare')}
                </Link>
                <button
                  type="button"
                  className="py-3 text-left text-base text-muted"
                  onClick={() => void logout()}
                >
                  {t(locale, 'logout')}
                </button>
              </>
            ) : (
              <Link
                href={`/${locale}/login`}
                className="py-3 text-base text-muted"
                onClick={() => setMenuOpen(false)}
              >
                {t(locale, 'login')}
              </Link>
            )}
            <AuthRequiredLink
              locale={locale}
              href={`/${locale}/sell`}
              className="mt-2 inline-flex items-center justify-center bg-accent px-4 py-3 font-[family-name:var(--font-display)] tracking-wide text-white"
              onNavigate={() => setMenuOpen(false)}
            >
              {t(locale, 'postAnAd')}
            </AuthRequiredLink>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
