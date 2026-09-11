'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiSend } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';

export function VerifyEmailClient({ locale }: { locale: Locale }) {
  const search = useSearchParams();
  const token = useMemo(() => search.get('token') ?? '', [search]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (!token) {
      setPending(false);
      setError('Missing verification token');
      return;
    }
    void apiSend('/api/v1/auth/verify-email', { body: { token } })
      .then(() => setOk(true))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Verification failed'),
      )
      .finally(() => setPending(false));
  }, [token]);

  if (pending) {
    return <p className="mt-8 text-muted">Verifying…</p>;
  }

  if (ok) {
    return (
      <p className="mt-8 text-accent">
        Email verified.{' '}
        <Link href={`/${locale}/login`} className="underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  return (
    <p className="mt-8 text-sm text-red-400">
      {error ?? 'Could not verify email.'}
    </p>
  );
}
