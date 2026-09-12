import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { HomeHero } from '@/components/home/home-hero';
import { BikeCategoryGrid } from '@/components/home/bike-category-grid';
import { apiGet } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';

type Brand = { id: string; name: string; slug: string };
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
      <HomeHero locale={locale} />
      <BikeCategoryGrid locale={locale} />

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="border-t border-white/10 pt-12">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
            Browse by brand
          </h2>
          <p className="mt-2 text-sm text-muted">
            Explore motorbikes from makers popular across Sri Lanka.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {brands.map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/${locale}/brands/${brand.slug}`}
                  className="inline-block border border-white/12 px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground"
                >
                  {brand.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12">
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
                  className="inline-block border border-white/12 px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground"
                >
                  {district.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
