'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { authIconFieldClass, authPrimaryBtnClass } from '@/components/auth/auth-shell';
import {
  GoogleSignInButton,
  googleAuthErrorMessage,
} from '@/components/auth/google-sign-in';
import { TurnstileField } from '@/components/turnstile-field';
import { apiSend } from '@/lib/api';
import { saveSession, type AuthUser } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { apiCodeMessage } from '@/lib/listing-errors';
import { safeNextPath } from '@/lib/safe-next';

export function LoginForm({
  locale,
  next,
}: {
  locale: Locale;
  next?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [registerHref, setRegisterHref] = useState(`/${locale}/register`);
  const [captchaToken, setCaptchaToken] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    setRegisterHref(
      next
        ? `/${locale}/register?next=${encodeURIComponent(next)}`
        : `/${locale}/register`,
    );
    const googleError = googleAuthErrorMessage(locale, params.get('error'));
    if (googleError) setError(googleError);
  }, [locale]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const data = await apiSend<{
        user: AuthUser;
      }>('/api/v1/auth/login', {
        body: {
          email: String(form.get('email')),
          password: String(form.get('password')),
          captchaToken: captchaToken || undefined,
        },
      });
      saveSession({ user: data.user });
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.href = safeNextPath(next, locale);
    } catch (err) {
      setError(
        apiCodeMessage(err, locale) ??
          (err instanceof Error ? err.message : 'Login failed'),
      );
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
    <GoogleSignInButton locale={locale} next={next} />
    <form onSubmit={onSubmit} className="grid gap-3">
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">{t(locale, 'email')}</span>
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
            className={authIconFieldClass}
          />
        </div>
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium">{t(locale, 'password')}</span>
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
            className={authIconFieldClass}
          />
        </div>
      </label>
      <TurnstileField onToken={setCaptchaToken} />

      <p className="text-center text-sm">
        <Link
          href={`/${locale}/forgot-password`}
          className="text-muted transition hover:text-accent"
        >
          {t(locale, 'forgotPassword')}
        </Link>
      </p>

      <button type="submit" disabled={busy} className={authPrimaryBtnClass}>
        {busy ? '…' : t(locale, 'login').toUpperCase()}
      </button>

      {error ? (
        <p className="text-center text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-center text-sm text-muted">
        {t(locale, 'noAccountYet')}{' '}
        <Link href={registerHref} className="font-medium text-accent">
          {t(locale, 'register')}
        </Link>
      </p>
    </form>
    </div>
  );
}
