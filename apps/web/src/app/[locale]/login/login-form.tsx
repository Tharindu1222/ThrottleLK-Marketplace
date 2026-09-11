'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { apiSend } from '@/lib/api';
import { saveSession, type AuthUser } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

export function LoginForm({ locale }: { locale: Locale }) {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
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
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 grid max-w-md gap-3">
      <input
        name="email"
        type="email"
        required
        placeholder={t(locale, 'email')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder={t(locale, 'password')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <button
        type="submit"
        className="bg-accent px-4 py-2 font-[family-name:var(--font-display)] text-background"
      >
        {t(locale, 'login')}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <p className="text-sm text-muted">
        <Link
          href={`/${locale}/forgot-password`}
          className="text-accent underline"
        >
          Forgot password?
        </Link>
        {' · '}
        <Link href={`/${locale}/register`} className="text-accent underline">
          {t(locale, 'register')}
        </Link>
      </p>
    </form>
  );
}
