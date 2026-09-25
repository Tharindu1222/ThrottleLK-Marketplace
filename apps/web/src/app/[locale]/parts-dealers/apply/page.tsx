import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
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
      <PartsDealerApplyForm locale={locale} />
    </main>
  );
}
