import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { CompareClient } from './compare-client';

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <p className="text-xs tracking-[0.28em] text-accent uppercase">
        ThrottleLK
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide text-foreground sm:text-5xl">
        {t(locale, 'compare')}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
        {t(locale, 'compareHint')}
      </p>
      <CompareClient locale={locale} />
    </main>
  );
}
