import { notFound } from 'next/navigation';
import { AdminOverview } from '@/components/admin/admin-overview';
import { isLocale, type Locale } from '@/lib/i18n';

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  return <AdminOverview locale={raw as Locale} />;
}
