import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BikesBrowse } from '@/components/bikes-browse';
import { browseFilterState } from '@/lib/browse-filter-state';
import { browseCanonicalPath, isFacetedSearch } from '@/lib/search-index';
import { isLocale, type Locale } from '@/lib/i18n';
import { hrefWithPage, parsePageParam } from '@/lib/pagination';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 60;

function spStr(
  sp: Record<string, string | string[] | undefined>,
  key: string,
) {
  const v = sp[key];
  return typeof v === 'string' ? v : undefined;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const page = parsePageParam(spStr(sp, 'page'));
  const faceted = isFacetedSearch(sp);
  const path = faceted
    ? browseCanonicalPath(locale, page)
    : hrefWithPage(`/${locale}/bikes`, browseFilterState(sp), page);
  const title =
    page > 1
      ? `Motorcycles for sale in Sri Lanka — page ${page}`
      : 'Motorcycles for sale in Sri Lanka';
  return pageMetadata({
    title,
    description:
      'Browse used and new motorbikes and scooters from private sellers and dealers across Sri Lanka.',
    path,
    locale,
    robots: faceted ? { index: false, follow: true } : undefined,
  });
}

export default async function BikesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;
  const filterState = browseFilterState(sp);
  const page = parsePageParam(spStr(sp, 'page'));

  return (
    <BikesBrowse
      locale={locale}
      filterState={filterState}
      page={page}
      listPath={`/${locale}/bikes`}
    />
  );
}
