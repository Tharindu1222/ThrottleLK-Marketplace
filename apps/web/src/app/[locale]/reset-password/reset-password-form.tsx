'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiSend } from '@/lib/api';
import { consumeAuthTokenFromLocation } from '@/lib/auth-token';
import { t, type Locale } from '@/lib/i18n';

export function ResetPasswordForm({ locale }: { locale: Locale }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setToken(consumeAuthTokenFromLocation());
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    if (!token) {
      setError('Missing reset token');
      return;
    }
    try {
      await apiSend('/api/v1/auth/reset-password', {
        body: {
          token,
          password: String(form.get('password')),
        },
      });
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (ok) {
    return (
      <p className="mt-8 text-accent">
        Password updated.{' '}
        <Link href={`/${locale}/login`} className="underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 grid max-w-md gap-3">
      {!token ? (
        <p className="text-sm text-red-400">
          Open the link from your email to reset your password.
        </p>
      ) : null}
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">New password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="New password"
          className="bg-background px-3 py-2 ring-1 ring-black/10"
        />
      </label>
      <button
        type="submit"
        disabled={!token}
        className="bg-accent px-4 py-2 font-[family-name:var(--font-display)] text-white disabled:opacity-50"
      >
        Reset password
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
