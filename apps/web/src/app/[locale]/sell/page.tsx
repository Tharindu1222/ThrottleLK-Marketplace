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
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          {t(locale, 'postAnAdEyebrow')}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t(locale, 'postAnAd')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t(locale, 'postAnAdHint')}
        </p>
      </div>
      <SellLoginGate locale={locale}>
        <SellForm locale={locale} />
      </SellLoginGate>
    </main>
  );
}
