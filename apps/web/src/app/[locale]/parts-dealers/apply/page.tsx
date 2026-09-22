import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { PartsDealerApplyForm } from './apply-form';

export default async function DealerApplyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
        {t(locale, 'becomePartsDealer')}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
        {t(locale, 'becomePartsDealerHint')}
      </p>
      <div className="mt-8">
        <PartsDealerApplyForm locale={locale} />
      </div>
    </main>
  );
}
