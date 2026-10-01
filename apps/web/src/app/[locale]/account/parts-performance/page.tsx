import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n';

export default async function PartsPerformancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  redirect(`/${raw}/account/performance?stock=parts`);
}
