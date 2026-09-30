import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { HomeDiscover } from '@/components/home/home-discover';
import { HomeHero } from '@/components/home/home-hero';
import { HomeMarketplacePreview } from '@/components/home/home-marketplace-preview';
import { HomeShop } from '@/components/home/home-shop';
import type { HomeBrand } from '@/components/home/home-brand-grid';
import type { BrowseListingCard } from '@/components/listing-card';
import type { BrowsePartCard } from '@/components/part-card';
import { apiGet } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 120;

const HomeScrollReveals = dynamic(
  () =>
    import('@/components/home/home-scroll-reveals').then(
      (mod) => mod.HomeScrollReveals,
    ),
);

type District = { id: string; name: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  return pageMetadata({
    title: "Sri Lanka's Motorbike Marketplace",
    description:
      'Buy and sell motorbikes across Sri Lanka — from private sellers and dealers. Browse scooters, street bikes, trail bikes and more on ThrottleLK.',
    path: `/${raw}`,
    locale: raw,
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const [brands, districts, preview] = await Promise.all([
    apiGet<HomeBrand[]>('/api/v1/brands').catch(() => [] as HomeBrand[]),
    apiGet<District[]>('/api/v1/locations/districts').catch(
      () => [] as District[],
    ),
    apiGet<{ bikes: BrowseListingCard[]; parts: BrowsePartCard[] }>(
      '/api/v1/home/marketplace-preview',
    ).catch(() => ({
      bikes: [] as BrowseListingCard[],
      parts: [] as BrowsePartCard[],
    })),
  ]);

  const previewBikes = preview.bikes.slice(0, 8);
  const previewParts = preview.parts.slice(0, 8);

  return (
    <main className="w-full min-w-0 max-w-full max-lg:overflow-x-clip">
      <HomeHero locale={locale} districts={districts} brands={brands} />
      <HomeShop locale={locale} brands={brands} />

      <HomeScrollReveals>
        <HomeMarketplacePreview
          locale={locale}
          bikes={previewBikes}
          parts={previewParts}
        />
        <HomeDiscover
          locale={locale}
          brands={brands}
          districts={districts}
        />
      </HomeScrollReveals>
    </main>
  );
}
