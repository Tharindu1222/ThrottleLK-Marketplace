import { notFound } from 'next/navigation';
import { AdminLayoutClient } from '@/components/admin/admin-layout-client';
import { isLocale, type Locale } from '@/lib/i18n';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return <AdminLayoutClient locale={locale}>{children}</AdminLayoutClient>;
}
