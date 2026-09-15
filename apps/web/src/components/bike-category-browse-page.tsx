import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { apiGet } from '@/lib/api';
import { getBikeCategory, type BikeCategory } from '@/lib/bike-categories';
import { isLocale } from '@/lib/i18n';

type Category = { id: string; name: string; slug: string };

export function categoryPageMetadata(category: BikeCategory): Metadata {
  return {
    title: `${category.name} for Sale in Sri Lanka`,
    description: `${category.description}. ${category.examples}. Buy and sell on ThrottleLK — Sri Lanka's motorbike marketplace.`,
  };
}

/** Category marketing URLs redirect into the shared bikes browse filters. */
export async function BikeCategoryBrowsePage({
  locale: raw,
  categorySlug,
}: {
  locale: string;
  categorySlug: string;
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

  if (matched) {
    redirect(`/${raw}/bikes?categoryId=${matched.id}`);
  }
  redirect(`/${raw}/bikes`);
}
