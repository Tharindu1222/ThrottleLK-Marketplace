'use client';

import { usePathname } from 'next/navigation';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { CompareTray } from '@/components/compare-tray';
import type { Locale } from '@/lib/i18n';

export function LocaleChrome({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = /\/(en|si)\/admin(\/|$)/.test(pathname);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <div className="flex-1 pb-20">{children}</div>
      <SiteFooter locale={locale} />
      <CompareTray locale={locale} />
    </div>
  );
}
