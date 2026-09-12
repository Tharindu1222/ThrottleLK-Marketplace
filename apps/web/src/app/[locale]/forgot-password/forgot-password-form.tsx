'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { apiSend } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';

export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const form = new FormData(e.currentTarget);
    try {
      const data = await apiSend<{ message: string }>(
        '/api/v1/auth/forgot-password',
        { body: { email: String(form.get('email')) } },
      );
      setOk(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
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
      <button
        type="submit"
        className="bg-accent px-4 py-2 font-[family-name:var(--font-display)] text-white"
      >
        Send reset link
      </button>
      {ok ? <p className="text-sm text-accent">{ok}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <p className="text-sm text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </Link>
      </p>
    </form>
  );
}
