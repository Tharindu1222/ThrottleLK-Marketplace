import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { PartsPerformanceClient } from './parts-performance-client';

export default async function PartsPerformancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
        {t(locale, 'partsPerformance')}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
        {t(locale, 'partsPerformanceSubtitle')}
      </p>
      <div className="mt-6">
        <PartsPerformanceClient locale={locale} />
      </div>
    </div>
  );
}
