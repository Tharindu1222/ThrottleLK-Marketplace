import { notFound } from 'next/navigation';
import { SellLoginGate } from '@/components/auth-required-link';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { SellForm } from './sell-form';

export default async function SellPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="flex flex-1 flex-col bg-[#f4f4f5]">
      <div className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 pt-8 pb-[calc(2rem+var(--compare-tray-offset,0px))] sm:px-6 md:pt-10">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="break-words font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground sm:text-[2.5rem]">
            {t(locale, 'postAnAd')}
          </h1>
          <p className="mx-auto mt-2.5 max-w-lg text-sm leading-relaxed text-muted sm:text-[15px]">
            {t(locale, 'postAnAdHint')}
          </p>
        </div>
        <SellLoginGate locale={locale}>
          <SellForm locale={locale} />
        </SellLoginGate>
      </div>
    </main>
  );
}
