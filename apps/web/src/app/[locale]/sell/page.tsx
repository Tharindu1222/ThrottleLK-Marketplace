import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
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
          Post an Ad
        </h1>
        <p className="mt-2 text-muted">
          List your motorbike in a few steps. Ads go to admin review before they
          appear publicly.
        </p>
      </div>
      <SellForm locale={locale} />
    </main>
  );
}
