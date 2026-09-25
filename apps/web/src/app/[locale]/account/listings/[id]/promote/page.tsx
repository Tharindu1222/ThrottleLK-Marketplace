import { notFound } from 'next/navigation';
import { PromoteListingForm } from '@/components/promote-listing-form';
import { isLocale, type Locale } from '@/lib/i18n';

export default async function PromoteBikePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <PromoteListingForm
      locale={locale}
      kind="bike"
      listingId={id}
      title=""
      backHref={`/${locale}/account/listings`}
    />
  );
}
