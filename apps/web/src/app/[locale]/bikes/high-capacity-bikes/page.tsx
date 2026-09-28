import type { Metadata } from 'next';
import {
  BikeCategoryBrowsePage,
  categoryLandingMetadata,
} from '@/components/bike-category-browse-page';
import { getBikeCategory } from '@/lib/bike-categories';

export const revalidate = 120;

const SLUG = 'high-capacity-bikes';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const category = getBikeCategory(SLUG);
  return category ? categoryLandingMetadata(category, locale, SLUG) : {};
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  return (
    <BikeCategoryBrowsePage
      locale={locale}
      categorySlug={SLUG}
      searchParams={await searchParams}
    />
  );
}
