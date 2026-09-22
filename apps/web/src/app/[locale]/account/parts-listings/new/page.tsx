import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { NewPartListingForm } from './part-form';

export default async function NewPartListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div className="w-full">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
        {t(locale, 'listPartTitle')}
      </h1>
      <p className="mt-2 text-sm text-muted">{t(locale, 'listPartHint')}</p>
      <NewPartListingForm locale={locale} />
    </div>
  );
}
