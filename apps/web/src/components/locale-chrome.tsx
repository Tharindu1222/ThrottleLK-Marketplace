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
import { t } from '@/lib/i18n';

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
  const isHome = /^\/(en|si)\/?$/.test(pathname);
  const isSell = /\/(en|si)\/sell(\/|$)/.test(pathname);
  const isDealerApply =
    /\/(en|si)\/(dealers|parts-dealers)\/apply(\/|$)/.test(pathname);
  const showTray =
    !isAuth &&
    !isAccount &&
    !isCompare &&
    !isDealersMap &&
    !isSell &&
    !isDealerApply;
  const showBreadcrumbs =
    !isAuth && !isAccount && !isHome && !isDealerApply;

  if (isAdmin) {
    return (
      <>
        <a href="#main-content" className="skip-link">
          {t(locale, 'skipToContent')}
        </a>
        {children}
      </>
    );
  }

  return (
    <BreadcrumbLabelProvider>
      <div className="flex min-h-screen min-w-0 max-w-full flex-col">
        <a
          href="#main-content"
          className="skip-link"
        >
          {t(locale, 'skipToContent')}
        </a>
        <SiteHeader locale={locale} />
        {showBreadcrumbs ? <SiteBreadcrumbs locale={locale} /> : null}
        <div
          id="main-content"
          className={`${isDealerApply ? '' : 'flex min-w-0 flex-1 flex-col'} relative z-0 max-w-full`}
          style={
            showTray
              ? { paddingBottom: 'max(5rem, var(--compare-tray-offset, 0px))' }
              : undefined
          }
        >
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
