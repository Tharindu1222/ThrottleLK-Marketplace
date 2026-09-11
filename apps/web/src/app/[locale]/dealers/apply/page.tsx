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
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        Become a dealer
      </h1>
      <p className="mt-2 text-muted">
        Create a ThrottleLK showroom. Admin approval is required before it goes
        public.
      </p>
      <DealerApplyForm locale={locale} />
    </main>
  );
}
