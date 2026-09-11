import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
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
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        Edit listing
      </h1>
      <EditListingForm locale={locale} listingId={id} />
    </main>
  );
}
