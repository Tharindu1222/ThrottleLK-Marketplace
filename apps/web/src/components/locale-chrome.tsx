'use client';

import { usePathname } from 'next/navigation';
import {
  BreadcrumbLabelProvider,
  SiteBreadcrumbs,
} from '@/components/breadcrumbs';
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
  const isAuth =
    /\/(en|si)\/(login|register|forgot-password|reset-password|verify-email)(\/|$)/.test(
      pathname,
    );
  const isAccount = /\/(en|si)\/account(\/|$)/.test(pathname);
  const isCompare = /\/(en|si)\/compare(\/|$)/.test(pathname);
  const isDealersMap = /\/(en|si)\/dealers\/map(\/|$)/.test(pathname);
  const showTray = !isAuth && !isAccount && !isCompare && !isDealersMap;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <BreadcrumbLabelProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader locale={locale} />
        {!isAuth && !isAccount ? <SiteBreadcrumbs locale={locale} /> : null}
        <div className={`flex-1 ${showTray ? 'pb-20' : ''}`}>
          {children}
        </div>
        {!isAuth && !isAccount && !isDealersMap ? (
          <SiteFooter locale={locale} />
        ) : null}
        {showTray ? <CompareTray locale={locale} /> : null}
      </div>
    </BreadcrumbLabelProvider>
  );
}
