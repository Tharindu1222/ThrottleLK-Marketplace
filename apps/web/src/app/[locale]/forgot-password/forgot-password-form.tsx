'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import {
  authFieldClass,
  authPrimaryBtnClass,
} from '@/components/auth/auth-shell';
import { TurnstileField } from '@/components/turnstile-field';
import { apiSend } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';
import { apiCodeMessage } from '@/lib/listing-errors';

export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const form = new FormData(e.currentTarget);
    try {
      const data = await apiSend<{ message: string }>(
        '/api/v1/auth/forgot-password',
        { body: { email: String(form.get('email')), captchaToken: captchaToken || undefined } },
      );
      setOk(data.message);
    } catch (err) {
      setError(
        apiCodeMessage(err, locale) ??
          (err instanceof Error ? err.message : 'Failed'),
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input
        name="email"
        type="email"
        required
        placeholder={t(locale, 'email')}
        className={authFieldClass}
      />
      <TurnstileField onToken={setCaptchaToken} />
      <button type="submit" className={authPrimaryBtnClass}>
        Send reset link
      </button>
      {ok ? <p className="text-center text-sm text-accent">{ok}</p> : null}
      {error ? (
        <p className="text-center text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-center text-sm text-muted">
        <Link href={`/${locale}/login`} className="font-medium text-accent">
          {t(locale, 'login')}
        </Link>
      </p>
    </form>
  );
}
