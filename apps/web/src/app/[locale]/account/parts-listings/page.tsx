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
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
        {t(locale, 'accountPartsListingsEyebrow')}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t(locale, 'partsListings')}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {t(locale, 'partsListingsHint')}
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <MyPartsListingsClient locale={locale} layout="cards" />
        </Suspense>
      </div>
    </div>
  );
}
