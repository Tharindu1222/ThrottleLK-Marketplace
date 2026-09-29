import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { EditListingForm } from './edit-listing-form';

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
        {t(locale, 'editListingEyebrow')}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t(locale, 'editListingPage')}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {t(locale, 'editListingHint')}
      </p>
      <EditListingForm locale={locale} listingId={id} />
    </div>
  );
}
