import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BikesBrowse } from '@/components/bikes-browse';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { browseFilterState } from '@/lib/browse-filter-state';
import { parsePageParam } from '@/lib/pagination';
import { isFacetedSearch } from '@/lib/search-index';
import { pageMetadata } from '@/lib/seo';

type District = { id: string; name: string; slug: string };

function pageFrom(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const value = searchParams.page;
  return parsePageParam(typeof value === 'string' ? value : undefined);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const sp = await searchParams;
  try {
    const district = await apiGet<District>(
      `/api/v1/locations/districts/by-slug/${slug}`,
    );
    const { meta } = await apiGetWithMeta('/api/v1/listings', {
      searchParams: { districtId: district.id, limit: '1' },
    });
    const empty = (meta?.total ?? 0) === 0;
    return pageMetadata({
      title: `Motorcycles for sale in ${district.name}`,
      description: `Browse bikes and scooters listed in ${district.name} on ThrottleLK.`,
      path: `/${locale}/locations/${district.slug}`,
      locale,
      robots:
        empty || isFacetedSearch(sp)
          ? { index: false, follow: true }
          : undefined,
    });
  } catch {
    return { title: 'Location not found' };
  }
}

export default async function LocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;

  let district: District;
  try {
    district = await apiGet<District>(
      `/api/v1/locations/districts/by-slug/${slug}`,
    );
  } catch {
    notFound();
  }

  return (
    <BikesBrowse
      locale={locale}
      heading={district.name}
      emptyHint={t(locale, 'locationEmptyHint')}
      filterState={{
        ...browseFilterState(sp),
        districtId: district.id,
      }}
      page={pageFrom(sp)}
      listPath={`/${locale}/locations/${district.slug}`}
    />
  );
}
