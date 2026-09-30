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
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 pt-8 pb-[calc(2rem+var(--compare-tray-offset,0px))] sm:px-8 lg:px-10 lg:pt-12 lg:pb-[calc(3rem+var(--compare-tray-offset,0px))]">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs tracking-[0.28em] text-accent uppercase">
          ThrottleLK
        </p>
        <h1 className="break-words font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
          {t(locale, 'compare')}
        </h1>
        <p className="max-w-xl break-words text-sm text-muted sm:text-base">
          {t(locale, 'compareHint')}
        </p>
      </div>
      <CompareClient locale={locale} />
    </main>
  );
}
