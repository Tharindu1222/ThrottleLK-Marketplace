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

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const other = locale === 'en' ? 'si' : 'en';

  return (
    <header className="border-b border-white/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href={`/${locale}`}
          className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground"
        >
          {t(locale, 'brand')}
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <Link href={`/${locale}/bikes`} className="hover:text-foreground">
            {t(locale, 'browse')}
          </Link>
          <Link href={`/${locale}/dealers`} className="hover:text-foreground">
            Dealers
          </Link>
          <Link href={`/${locale}/guides`} className="hover:text-foreground">
            Guides
          </Link>
          <Link href={`/${locale}/sell`} className="hover:text-foreground">
            {t(locale, 'sell')}
          </Link>
          {user ? (
            <>
              <Link
                href={`/${locale}/account/profile`}
                className="hover:text-foreground"
              >
                {t(locale, 'profile')}
              </Link>
              <Link
                href={`/${locale}/account/notifications`}
                className="hover:text-foreground"
              >
                {t(locale, 'notifications')}
              </Link>
              <Link
                href={`/${locale}/account/favourites`}
                className="hover:text-foreground"
              >
                {t(locale, 'favourites')}
              </Link>
              <Link
                href={`/${locale}/account/saved-searches`}
                className="hover:text-foreground"
              >
                {t(locale, 'savedSearches')}
              </Link>
              <Link
                href={`/${locale}/compare`}
                className="hover:text-foreground"
              >
                {t(locale, 'compare')}
              </Link>
              <Link
                href={`/${locale}/account/listings`}
                className="hover:text-foreground"
              >
                {t(locale, 'myListings')}
              </Link>
              {user.roles.includes('admin') ? (
                <Link
                  href={`/${locale}/admin`}
                  className="hover:text-foreground"
                >
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => {
                  const refreshToken = getRefreshToken();
                  void (async () => {
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
                  })();
                }}
              >
                {t(locale, 'logout')}
              </button>            </>
          ) : (
            <>
              <Link href={`/${locale}/login`} className="hover:text-foreground">
                {t(locale, 'login')}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="bg-accent px-3 py-1.5 font-[family-name:var(--font-display)] tracking-wide text-background"
              >
                {t(locale, 'register')}
              </Link>
            </>
          )}
          <Link href={`/${other}`} className="hover:text-foreground">
            {other === 'si' ? 'සිංහල' : 'English'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
