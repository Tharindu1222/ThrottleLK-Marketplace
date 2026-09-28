import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BikesBrowse } from '@/components/bikes-browse';
import { getBikeCategory, type BikeCategory } from '@/lib/bike-categories';
import { apiGet } from '@/lib/api';
import { isLocale } from '@/lib/i18n';
import { parsePageParam } from '@/lib/pagination';
import { pageMetadata } from '@/lib/seo';

type Category = { id: string; name: string; slug: string };

export async function BikeCategoryBrowsePage({
  locale: raw,
  categorySlug,
  searchParams,
}: {
  locale: string;
  categorySlug: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!isLocale(raw)) notFound();
  const marketing = getBikeCategory(categorySlug);
  if (!marketing) notFound();

  const categories = await apiGet<Category[]>('/api/v1/categories', {
    searchParams: { scope: 'public' },
  }).catch(() => [] as Category[]);

  const matched = categories.find((c) =>
    marketing.taxonomySlugs.includes(c.slug),
  );
  if (!matched) notFound();

  const page = parsePageParam(
    typeof searchParams?.page === 'string' ? searchParams.page : undefined,
  );

  return (
    <BikesBrowse
      locale={raw}
      filterState={{ categoryId: matched.id }}
      page={page}
      heading={`${marketing.name} for sale`}
      intro={marketing.description}
      listPath={`/${raw}/bikes/${categorySlug}`}
    />
  );
}

export function categoryLandingMetadata(
  category: BikeCategory,
  locale: string,
  categorySlug: string,
): Metadata {
  return pageMetadata({
    title: `${category.name} for Sale in Sri Lanka`,
    description: `${category.description}. ${category.examples}. Buy and sell on ThrottleLK — Sri Lanka's motorbike marketplace.`,
    path: `/${locale}/bikes/${categorySlug}`,
    locale,
  });
}
