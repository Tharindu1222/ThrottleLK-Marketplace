import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { NewPartListingForm } from '../../new/part-form';

export default async function EditPartListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
        {t(locale, 'editListingEyebrow')}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t(locale, 'editListingPage')}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {t(locale, 'listPartHint')}
      </p>
      <NewPartListingForm locale={locale} listingId={id} />
    </div>
  );
}
