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
    <div className="relative isolate border-t border-black/10 bg-[#f4f5f7]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 65% 40% at 6% 0%, rgba(225, 6, 0, 0.04) 0%, transparent 50%), radial-gradient(ellipse 50% 35% at 95% 5%, rgba(15, 23, 42, 0.04) 0%, transparent 45%)',
        }}
      />
      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <AccountSidebar locale={locale} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
