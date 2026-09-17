import { notFound } from 'next/navigation';
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
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
          {t(locale, 'postAnAd')}
        </h1>
        <p className="mt-2 text-muted">{t(locale, 'postAnAdHint')}</p>
      </div>
      <SellForm locale={locale} />
    </main>
  );
}
