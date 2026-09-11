import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type Brand = { id: string; name: string; slug: string };
type Model = { id: string; name: string; slug: string };
type Listing = {
  id: string;
  slug: string;
  title: string;
  priceLkr: number;
  manufactureYear: number;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const brand = await apiGet<Brand>(`/api/v1/brands/${slug}`);
    return pageMetadata({
      title: `${brand.name} motorcycles for sale in Sri Lanka`,
      description: `Browse used and new ${brand.name} bikes and scooters on ThrottleLK.`,
      path: `/${locale}/brands/${slug}`,
    });
  } catch {
    return { title: 'Brand not found' };
  }
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  let brand: Brand;
  try {
    brand = await apiGet<Brand>(`/api/v1/brands/${slug}`);
  } catch {
    notFound();
  }

  const [models, listings] = await Promise.all([
    apiGet<Model[]>(`/api/v1/brands/${brand.id}/models`),
    apiGet<Listing[]>('/api/v1/listings', {
      searchParams: { brandId: brand.id },
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm tracking-[0.25em] text-accent uppercase">Brand</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
        {brand.name}
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        {brand.name} motorcycles and scooters listed on ThrottleLK across Sri
        Lanka.
      </p>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
          Models
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {models.map((model) => (
            <li key={model.id}>
              <Link
                href={`/${locale}/brands/${brand.slug}/${model.slug}`}
                className="border border-white/15 px-3 py-1.5 text-sm hover:border-accent"
              >
                {model.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
          Active listings
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.length === 0 ? (
            <p className="text-muted">No active {brand.name} listings yet.</p>
          ) : (
            listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/${locale}/bikes/${listing.slug}`}
                className="border border-white/10 bg-surface/40 p-4 hover:border-accent/40"
              >
                <h3 className="font-[family-name:var(--font-display)] text-xl">
                  {listing.title}
                </h3>
                <p className="mt-2 text-accent">
                  Rs. {listing.priceLkr.toLocaleString('en-LK')}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {listing.manufactureYear}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
