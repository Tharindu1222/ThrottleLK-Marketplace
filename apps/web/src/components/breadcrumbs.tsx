'use client';

import Link from 'next/link';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { getBikeCategory } from '@/lib/bike-categories';
import { t, type Locale } from '@/lib/i18n';

export type Crumb = {
  label: string;
  href?: string;
};

const LabelCtx = createContext<{
  labels: Record<string, string>;
  setLabels: (next: Record<string, string>) => void;
}>({
  labels: {},
  setLabels: () => undefined,
});

export function BreadcrumbLabelProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const value = useMemo(() => ({ labels, setLabels }), [labels]);
  return <LabelCtx.Provider value={value}>{children}</LabelCtx.Provider>;
}

/** Override slug → display label from a page (listing title, brand name, …). */
export function BreadcrumbLabels({
  labels,
}: {
  labels: Record<string, string>;
}) {
  const { setLabels } = useContext(LabelCtx);
  const key = JSON.stringify(labels);
  useEffect(() => {
    setLabels(labels);
    return () => setLabels({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures labels
  }, [key, setLabels]);
  return null;
}

function humanize(segment: string) {
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function staticLabel(locale: Locale, segment: string): string | null {
  const map: Record<string, string> = {
    bikes: t(locale, 'allBikes'),
    brands: t(locale, 'brandsNav'),
    dealers: t(locale, 'dealersNav'),
    map: t(locale, 'dealersMap'),
    sell: t(locale, 'sell'),
    compare: t(locale, 'compare'),
    guides: t(locale, 'guidesNav'),
    locations: t(locale, 'locationsNav'),
    sellers: t(locale, 'sellersNav'),
    account: t(locale, 'accountNav'),
    profile: t(locale, 'profile'),
    listings: t(locale, 'myListings'),
    favourites: t(locale, 'favourites'),
    messages: t(locale, 'messages'),
    notifications: t(locale, 'notifications'),
    'saved-searches': t(locale, 'savedSearches'),
    edit: t(locale, 'editListing'),
    apply: t(locale, 'dealerApply'),
    login: t(locale, 'login'),
    register: t(locale, 'register'),
    'forgot-password': t(locale, 'forgotPassword'),
    'reset-password': t(locale, 'resetPassword'),
    'verify-email': t(locale, 'verifyEmail'),
  };
  return map[segment] ?? null;
}

/**
 * Only real routes get hrefs. Namespace folders without an index page
 * (sellers, brands, locations, account, …) stay as plain text or are skipped.
 */
function isLinkablePath(segments: string[]): boolean {
  const path = segments.join('/');
  const [a, b, c] = segments;

  if (path === 'bikes') return true;
  if (a === 'bikes' && b && !getBikeCategory(b) && segments.length === 2) {
    // /bikes/[listing-slug]
    return true;
  }
  // Category marketing paths redirect — still ok to show as current; don't link mid-path

  if (path === 'dealers') return true;
  if (path === 'dealers/apply') return true;
  if (path === 'dealers/map') return true;
  if (
    a === 'dealers' &&
    b &&
    b !== 'apply' &&
    b !== 'map' &&
    segments.length === 2
  )
    return true;

  if (path === 'guides') return true;
  if (a === 'guides' && b && segments.length === 2) return true;

  if (path === 'sell') return true;
  if (path === 'compare') return true;
  if (path === 'login') return true;
  if (path === 'register') return true;
  if (path === 'forgot-password') return true;
  if (path === 'reset-password') return true;
  if (path === 'verify-email') return true;

  if (path === 'account/profile') return true;
  if (path === 'account/listings') return true;
  if (path === 'account/favourites') return true;
  if (path === 'account/messages') return true;
  if (a === 'account' && b === 'messages' && c && segments.length === 3) {
    return true;
  }
  if (path === 'account/notifications') return true;
  if (path === 'account/saved-searches') return true;

  return false;
}

/** Path prefixes that are only folders — omit from crumbs (no real index page). */
const SKIP_SEGMENTS = new Set([
  'sellers',
  'brands',
  'locations',
  'account',
]);

export function buildCrumbs(
  pathname: string,
  locale: Locale,
  overrides: Record<string, string> = {},
): Crumb[] {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [];

  const pathLocale = parts[0];
  if (pathLocale !== 'en' && pathLocale !== 'si') return [];

  const rest = parts.slice(1);
  if (rest.length === 0) return [];
  if (rest[0] === 'admin') return [];

  const crumbs: Crumb[] = [{ label: t(locale, 'home'), href: `/${locale}` }];

  const built: string[] = [];
  rest.forEach((segment, index) => {
    built.push(segment);
    const isLast = index === rest.length - 1;

    // Skip empty namespace folders (unless it's the only/last segment — shouldn't happen)
    if (!isLast && SKIP_SEGMENTS.has(segment)) {
      return;
    }

    const category = getBikeCategory(segment);
    const label =
      overrides[segment] ??
      (category ? category.name : null) ??
      staticLabel(locale, segment) ??
      humanize(segment);

    const path = built.join('/');
    const href =
      !isLast && isLinkablePath(built) ? `/${locale}/${path}` : undefined;

    crumbs.push({ label, href });
  });

  return crumbs;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length < 2) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-black/[0.06] bg-surface/40"
    >
      <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-6 py-3 text-[11px] tracking-[0.14em] uppercase sm:text-xs">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li
              key={`${item.label}-${i}`}
              className="flex min-w-0 items-center gap-2"
            >
              {i > 0 ? (
                <span className="text-muted/50" aria-hidden>
                  ›
                </span>
              ) : null}
              {last || !item.href ? (
                <span
                  className={
                    last
                      ? 'truncate font-medium text-foreground'
                      : 'truncate text-muted'
                  }
                  aria-current={last ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="truncate text-muted transition hover:text-foreground"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SiteBreadcrumbs({ locale }: { locale: Locale }) {
  const pathname = usePathname() || '';
  const { labels } = useContext(LabelCtx);
  const items = useMemo(
    () => buildCrumbs(pathname, locale, labels),
    [pathname, locale, labels],
  );
  return <Breadcrumbs items={items} />;
}
