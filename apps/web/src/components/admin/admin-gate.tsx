'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getAccessToken, syncAccessCookie, type AuthUser } from '@/lib/auth';
import { loginHref } from '@/lib/login-href';
import type { Locale } from '@/lib/i18n';

export function AdminGate({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const access = getAccessToken();
    syncAccessCookie();
    setToken(access);
    if (!access) {
      setIsAdmin(false);
      setReady(true);
      return;
    }
    void apiGet<AuthUser>('/api/v1/users/me')
      .then((user) => {
        setIsAdmin(Boolean(user?.roles?.includes('admin')));
      })
      .catch(() => {
        setIsAdmin(false);
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--admin-muted)]">
        Loading…
      </div>
    );
  }

  if (!token) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="text-[var(--admin-muted)]">
          <Link
            href={loginHref(locale, `/${locale}/admin`)}
            className="font-medium text-[var(--admin-accent-2)] underline"
          >
            Log in
          </Link>{' '}
          as admin to continue.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="text-[var(--admin-muted)]">
          Your account does not have the admin role.
        </p>
        <Link
          href={`/${locale}`}
          className="mt-4 inline-block text-sm font-medium text-[var(--admin-accent-2)] underline"
        >
          Back to marketplace
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
