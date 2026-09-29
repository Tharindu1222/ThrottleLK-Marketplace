'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { t, type Locale } from '@/lib/i18n';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale: Locale = params?.locale === 'si' ? 'si' : 'en';

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        {t(locale, 'errorTitle')}
      </h1>
      <p className="mt-4 text-muted">{t(locale, 'errorHint')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={() => {
            reset();
            window.location.reload();
          }}
          className="inline-flex border border-black/15 px-5 py-2.5 text-sm hover:border-accent hover:text-accent"
        >
          {t(locale, 'tryAgain')}
        </button>
        <a
          href={`/${locale}`}
          className="inline-flex bg-accent px-5 py-2.5 text-sm text-white"
        >
          {t(locale, 'goHome')}
        </a>
      </div>
    </main>
  );
}
