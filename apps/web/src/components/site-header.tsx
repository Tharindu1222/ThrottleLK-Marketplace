'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  clearSession,
  getRefreshToken,
  getStoredUser,
  type AuthUser,
} from '@/lib/auth';
import { apiSend } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';

export function SiteHeader({ locale }: { locale: Locale }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [locale]);

  const other = locale === 'en' ? 'si' : 'en';

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
      window.location.href = `/${locale}`;
    }
  }

  const navLinkClass =
    'text-sm text-muted transition hover:text-foreground';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/95">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
        <Link
          href={`/${locale}`}
          className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground"
        >
          {t(locale, 'brand')}
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex" aria-label="Main">
          <Link href={`/${locale}/bikes`} className={navLinkClass}>
            Buy Bikes
          </Link>
          <Link href={`/${locale}/sell`} className={navLinkClass}>
            Sell a Bike
          </Link>
          <Link href={`/${locale}/dealers`} className={navLinkClass}>
            Dealers
          </Link>
        </nav>

        <div className="ml-auto hidden items-center gap-4 md:flex">
          <Link href={`/${other}`} className={navLinkClass}>
            {other === 'si' ? 'සිංහල' : 'English'}
          </Link>
          {user ? (
            <>
              <Link href={`/${locale}/account/profile`} className={navLinkClass}>
                Account
              </Link>
              {user.roles.includes('admin') ? (
                <Link href={`/${locale}/admin`} className={navLinkClass}>
                  Admin
                </Link>
              ) : null}
              <button type="button" className={navLinkClass} onClick={() => void logout()}>
                {t(locale, 'logout')}
              </button>
            </>
          ) : (
            <Link href={`/${locale}/login`} className={navLinkClass}>
              Sign In
            </Link>
          )}
          <Link
            href={`/${locale}/sell`}
            className="bg-accent px-4 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-background transition hover:brightness-110"
          >
            Post an Ad
          </Link>
        </div>

        <button
          type="button"
          className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center border border-white/15 text-foreground md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/10 bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4" aria-label="Mobile">
            <Link
              href={`/${locale}/bikes`}
              className="py-3 text-base text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              Buy Bikes
            </Link>
            <Link
              href={`/${locale}/sell`}
              className="py-3 text-base text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              Sell a Bike
            </Link>
            <Link
              href={`/${locale}/dealers`}
              className="py-3 text-base text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              Dealers
            </Link>
            <div className="my-2 border-t border-white/10" />
            {user ? (
              <>
                <Link
                  href={`/${locale}/account/profile`}
                  className="py-3 text-base text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  Account
                </Link>
                <Link
                  href={`/${locale}/account/listings`}
                  className="py-3 text-base text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(locale, 'myListings')}
                </Link>
                <Link
                  href={`/${locale}/account/messages`}
                  className="py-3 text-base text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(locale, 'messages')}
                </Link>
                {user.roles.includes('admin') ? (
                  <Link
                    href={`/${locale}/admin`}
                    className="py-3 text-base text-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                ) : null}
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
                Sign In
              </Link>
            )}
            <Link
              href={`/${other}`}
              className="py-3 text-base text-muted"
              onClick={() => setMenuOpen(false)}
            >
              {other === 'si' ? 'සිංහල' : 'English'}
            </Link>
            <Link
              href={`/${locale}/sell`}
              className="mt-2 inline-flex items-center justify-center bg-accent px-4 py-3 font-[family-name:var(--font-display)] tracking-wide text-background"
              onClick={() => setMenuOpen(false)}
            >
              Post an Ad
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
