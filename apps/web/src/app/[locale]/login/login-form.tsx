'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import {
  authFieldClass,
  authPrimaryBtnClass,
  authSecondaryBtnClass,
} from '@/components/auth/auth-shell';
import { apiSend } from '@/lib/api';
import { saveSession, type AuthUser } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

export function LoginForm({ locale }: { locale: Locale }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const data = await apiSend<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/api/v1/auth/login', {
        body: {
          email: String(form.get('email')),
          password: String(form.get('password')),
        },
      });
      saveSession(data);
      window.location.href = `/${locale}/bikes`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="sr-only">{t(locale, 'email')}</span>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
          >
            @
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t(locale, 'email')}
            className={`${authFieldClass} pl-10`}
          />
        </div>
      </label>

      <label className="grid gap-1.5">
        <span className="sr-only">{t(locale, 'password')}</span>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            placeholder={t(locale, 'password')}
            className={`${authFieldClass} pl-10`}
          />
        </div>
      </label>

      <p className="text-center text-sm">
        <Link
          href={`/${locale}/forgot-password`}
          className="text-muted transition hover:text-accent"
        >
          Forgot password?
        </Link>
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={busy} className={authPrimaryBtnClass}>
          {busy ? '…' : t(locale, 'login').toUpperCase()}
        </button>
        <Link
          href={`/${locale}/register`}
          className={authSecondaryBtnClass}
        >
          {t(locale, 'register').toUpperCase()}
        </Link>
      </div>

      {error ? (
        <p className="text-center text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-center text-sm text-muted">
        {t(locale, 'noAccountYet')}{' '}
        <Link href={`/${locale}/register`} className="font-medium text-accent">
          {t(locale, 'register')}
        </Link>
      </p>
    </form>
  );
}
