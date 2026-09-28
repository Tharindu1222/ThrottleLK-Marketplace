'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

export function VerifyEmailCallout({ locale }: { locale: Locale }) {
  const [unverified, setUnverified] = useState(false);

  useEffect(() => {
    const read = () => {
      const user = getStoredUser();
      setUnverified(Boolean(user && !user.emailVerifiedAt));
    };
    read();
    window.addEventListener('throttlelk-session', read);
    return () => window.removeEventListener('throttlelk-session', read);
  }, []);

  if (!unverified) return null;

  return (
    <div
      role="status"
      className="mb-6 border border-accent/40 bg-accent/5 p-4 text-left text-sm"
    >
      <p>{t(locale, 'verifyEmailToList')}</p>
      <Link
        href={`/${locale}/account/profile`}
        className="mt-2 inline-block text-accent underline"
      >
        {t(locale, 'verifyEmail')}
      </Link>
    </div>
  );
}
