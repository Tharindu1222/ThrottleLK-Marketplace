import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import { DealerApplyForm } from './apply-form';

export default async function DealerApplyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="bg-white">
      <DealerApplyForm locale={locale} />
    </main>
  );
}
