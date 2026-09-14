import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { HomeHero } from '@/components/home/home-hero';
import { BikeCategoryGrid } from '@/components/home/bike-category-grid';
import { HomeScrollReveals } from '@/components/home/home-scroll-reveals';
import { HeroCategoriesBridge } from '@/components/home/hero-categories-bridge';
import { HomeBrandGrid } from '@/components/home/home-brand-grid';
import { apiGet } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';

type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
};
type District = { id: string; name: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  return {
    title: "Sri Lanka's Motorbike Marketplace",
    description:
      'Buy and sell motorbikes across Sri Lanka — from private sellers and dealers. Browse scooters, street bikes, trail bikes and more on ThrottleLK.',
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const [brands, districts] = await Promise.all([
    apiGet<Brand[]>('/api/v1/brands').catch(() => [] as Brand[]),
    apiGet<District[]>('/api/v1/locations/districts').catch(
      () => [] as District[],
    ),
  ]);

  return (
    <main>
      <HeroCategoriesBridge
        hero={<HomeHero locale={locale} />}
        categories={<BikeCategoryGrid locale={locale} />}
      />

      <HomeScrollReveals>
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="border-t border-black/10 pt-12" data-reveal>
            <p className="mb-2 text-xs tracking-[0.35em] text-accent uppercase">
              Discover
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
              Browse by brand
            </h2>
            <p className="mt-2 text-sm text-muted">
              Explore motorbikes from makers popular across Sri Lanka.
            </p>
            <HomeBrandGrid locale={locale} brands={brands} />
          </div>

          <div className="mt-12" data-reveal>
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
              Browse by district
            </h2>
            <p className="mt-2 text-sm text-muted">
              Find motorbikes listed near you.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {districts.map((district) => (
                <li key={district.id}>
                  <Link
                    href={`/${locale}/locations/${district.slug}`}
                    className="inline-block border border-black/12 px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground"
                  >
                    {district.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </HomeScrollReveals>
    </main>
  );
}
