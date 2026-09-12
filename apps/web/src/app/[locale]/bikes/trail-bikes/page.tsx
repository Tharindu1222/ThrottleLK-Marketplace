import type { Metadata } from 'next';
import {
  BikeCategoryBrowsePage,
  categoryPageMetadata,
} from '@/components/bike-category-browse-page';
import { getBikeCategory } from '@/lib/bike-categories';

const SLUG = 'trail-bikes';

export async function generateMetadata(): Promise<Metadata> {
  const category = getBikeCategory(SLUG);
  return category ? categoryPageMetadata(category) : {};
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <BikeCategoryBrowsePage locale={locale} categorySlug={SLUG} />;
}
