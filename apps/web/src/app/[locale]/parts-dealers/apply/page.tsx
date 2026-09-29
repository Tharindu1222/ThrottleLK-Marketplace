import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import { PartsDealerApplyForm } from './apply-form';

export default async function PartsDealerApplyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="bg-white">
      <PartsDealerApplyForm locale={locale} />
    </main>
  );
}
