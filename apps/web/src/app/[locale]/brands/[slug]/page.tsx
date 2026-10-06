import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BikesBrowse } from '@/components/bikes-browse';
import { apiGet } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { browseFilterState } from '@/lib/browse-filter-state';
import { parsePageParam } from '@/lib/pagination';
import { isFacetedSearch } from '@/lib/search-index';
import { pageMetadata } from '@/lib/seo';

type Brand = { id: string; name: string; slug: string };

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
    const brand = await apiGet<Brand>(`/api/v1/brands/${slug}`);
    return pageMetadata({
      title: `${brand.name} motorcycles for sale in Sri Lanka`,
      description: `Browse used and new ${brand.name} bikes and scooters on ThrottleLK. Compare year, mileage and district asking prices.`,
      path: `/${locale}/brands/${brand.slug}`,
      locale,
      robots: isFacetedSearch(sp) ? { index: false, follow: true } : undefined,
    });
  } catch {
    return { title: 'Brand not found' };
  }
}

export default async function BrandPage({
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

  let brand: Brand;
  try {
    brand = await apiGet<Brand>(`/api/v1/brands/${slug}`);
  } catch {
    notFound();
  }

  return (
    <BikesBrowse
      locale={locale}
      heading={`${brand.name}`}
      intro={t(locale, 'brandLandingIntro')}
      faqTitle={t(locale, 'brandLandingFaqTitle')}
      faqItems={[
        {
          question: t(locale, 'brandLandingFaq1Q'),
          answer: t(locale, 'brandLandingFaq1'),
        },
        {
          question: t(locale, 'brandLandingFaq2Q'),
          answer: t(locale, 'brandLandingFaq2'),
        },
      ]}
      filterState={{
        ...browseFilterState(sp),
        brandId: brand.id,
      }}
      page={pageFrom(sp)}
      listPath={`/${locale}/brands/${brand.slug}`}
    />
  );
}
