import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BikesBrowse } from '@/components/bikes-browse';
import { apiGet } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { parsePageParam } from '@/lib/pagination';
import { isFacetedSearch } from '@/lib/search-index';
import { pageMetadata } from '@/lib/seo';

type Model = {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  brand?: { id: string; name: string; slug: string };
};

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
  params: Promise<{ locale: string; slug: string; modelSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale, slug, modelSlug } = await params;
  const sp = await searchParams;
  try {
    const model = await apiGet<Model>(`/api/v1/models/${modelSlug}`);
    const brandName = model.brand?.name ?? slug;
    const brandSlug = model.brand?.slug ?? slug;
    return pageMetadata({
      title: `${brandName} ${model.name} for sale in Sri Lanka`,
      description: `Find ${brandName} ${model.name} bikes on ThrottleLK — current asking prices from sellers.`,
      path: `/${locale}/brands/${brandSlug}/${model.slug}`,
      locale,
      robots: isFacetedSearch(sp) ? { index: false, follow: true } : undefined,
    });
  } catch {
    return { title: 'Model not found' };
  }
}

export default async function ModelPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string; modelSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw, slug, modelSlug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;

  let model: Model;
  try {
    model = await apiGet<Model>(`/api/v1/models/${modelSlug}`);
  } catch {
    notFound();
  }

  if (model.brand && model.brand.slug !== slug) {
    notFound();
  }

  const brandName = model.brand?.name ?? slug;

  return (
    <BikesBrowse
      locale={locale}
      heading={`${brandName} ${model.name}`}
      intro={t(locale, 'modelLandingIntro')}
      faqTitle={t(locale, 'modelLandingFaqTitle')}
      faqItems={[
        {
          question: t(locale, 'modelLandingFaq1Q'),
          answer: t(locale, 'modelLandingFaq1'),
        },
        {
          question: t(locale, 'modelLandingFaq2Q'),
          answer: t(locale, 'modelLandingFaq2'),
        },
      ]}
      filterState={{ brandId: model.brandId, modelId: model.id }}
      page={pageFrom(sp)}
      listPath={`/${locale}/brands/${slug}/${model.slug}`}
      pagerState={{}}
    />
  );
}
