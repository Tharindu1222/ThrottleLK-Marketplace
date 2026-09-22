import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { MyPartsListingsClient } from './my-listings-client';

export default async function MyPartsListingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
        {t(locale, 'partsListings')}
      </h1>
      <p className="mt-2 text-sm text-muted">{t(locale, 'partsListingsHint')}</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <MyPartsListingsClient locale={locale} layout="cards" />
        </Suspense>
      </div>
    </div>
  );
}
