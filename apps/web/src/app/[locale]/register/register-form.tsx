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

export function RegisterForm({ locale }: { locale: Locale }) {
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
      }>('/api/v1/auth/register', {
        body: {
          firstName: String(form.get('firstName')),
          lastName: String(form.get('lastName')),
          email: String(form.get('email')),
          phone: String(form.get('phone') || '') || undefined,
          password: String(form.get('password')),
        },
      });
      saveSession(data);
      window.location.href = `/${locale}/sell`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Register failed');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <input
          name="firstName"
          required
          autoComplete="given-name"
          placeholder={t(locale, 'firstName')}
          className={authFieldClass}
        />
        <input
          name="lastName"
          required
          autoComplete="family-name"
          placeholder={t(locale, 'lastName')}
          className={authFieldClass}
        />
      </div>
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder={t(locale, 'email')}
        className={authFieldClass}
      />
      <input
        name="phone"
        autoComplete="tel"
        placeholder={t(locale, 'phone')}
        className={authFieldClass}
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder={t(locale, 'password')}
        className={authFieldClass}
      />

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
  );
}
