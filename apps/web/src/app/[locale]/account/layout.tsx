import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AccountSidebar } from '@/components/account-sidebar';
import { isLocale, type Locale } from '@/lib/i18n';

export default async function AccountLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#f4f5f7] sm:h-[calc(100svh-4.25rem)] lg:flex-row">
      <AccountSidebar locale={locale} />
      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </div>
  );
}
