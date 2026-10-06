'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import {
  authFieldClass,
  authPrimaryBtnClass,
  authSecondaryBtnClass,
} from '@/components/auth/auth-shell';
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

export function RegisterForm({
  locale,
  next,
}: {
  locale: Locale;
  next?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');

  useEffect(() => {
    const googleError = googleAuthErrorMessage(
      locale,
      new URLSearchParams(window.location.search).get('error'),
    );
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
      }>('/api/v1/auth/register', {
        body: {
          firstName: String(form.get('firstName')),
          lastName: String(form.get('lastName')),
          email: String(form.get('email')),
          phone: String(form.get('phone') || '') || undefined,
          password: String(form.get('password')),
          captchaToken: captchaToken || undefined,
        },
      });
      saveSession({ user: data.user });
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.href = safeNextPath(next, locale, `/${locale}/account`);
    } catch (err) {
      setError(
        apiCodeMessage(err, locale) ??
          (err instanceof Error ? err.message : 'Register failed'),
      );
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3.5">
    <GoogleSignInButton locale={locale} next={next} />
    <form onSubmit={onSubmit} className="grid gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">{t(locale, 'firstName')}</span>
          <input
            name="firstName"
            required
            autoComplete="given-name"
            placeholder={t(locale, 'firstName')}
            className={authFieldClass}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">{t(locale, 'lastName')}</span>
          <input
            name="lastName"
            required
            autoComplete="family-name"
            placeholder={t(locale, 'lastName')}
            className={authFieldClass}
          />
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">{t(locale, 'email')}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t(locale, 'email')}
          className={authFieldClass}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">{t(locale, 'phone')}</span>
        <input
          name="phone"
          autoComplete="tel"
          placeholder={t(locale, 'phone')}
          className={authFieldClass}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">{t(locale, 'password')}</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={t(locale, 'password')}
          className={authFieldClass}
        />
      </label>
      <TurnstileField onToken={setCaptchaToken} />

      <div className="mt-1 flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={busy} className={authPrimaryBtnClass}>
          {busy ? '…' : t(locale, 'register').toUpperCase()}
        </button>
        <Link href={`/${locale}/login`} className={authSecondaryBtnClass}>
          {t(locale, 'login').toUpperCase()}
        </Link>
      </div>

      {error ? (
        <p className="text-center text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-center text-sm text-muted">
        {t(locale, 'alreadyHaveAccount')}{' '}
        <Link href={`/${locale}/login`} className="font-medium text-accent">
          {t(locale, 'login')}
        </Link>
      </p>
    </form>
    </div>
  );
}
