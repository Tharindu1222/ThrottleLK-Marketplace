import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type District = { id: string; name: string; slug: string };
type City = { id: string; name: string; slug: string };
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
    const district = await apiGet<District>(
      `/api/v1/locations/districts/by-slug/${slug}`,
    );
    return pageMetadata({
      title: `Motorcycles for sale in ${district.name}`,
      description: `Browse bikes and scooters listed in ${district.name} on ThrottleLK.`,
      path: `/${locale}/locations/${slug}`,
    });
  } catch {
    return { title: 'Location not found' };
  }
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  let district: District;
  try {
    district = await apiGet<District>(
      `/api/v1/locations/districts/by-slug/${slug}`,
    );
  } catch {
    notFound();
  }

  const [cities, listings] = await Promise.all([
    apiGet<City[]>(`/api/v1/locations/districts/${district.id}/cities`),
    apiGet<Listing[]>('/api/v1/listings', {
      searchParams: { districtId: district.id },
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm tracking-[0.25em] text-accent uppercase">
        Location
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
        Bikes in {district.name}
      </h1>
      <p className="mt-3 text-muted">
        Cities: {cities.map((c) => c.name).join(', ')}
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <p className="text-muted">No active listings in {district.name} yet.</p>
        ) : (
          listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/${locale}/bikes/${listing.slug}`}
              className="border border-white/10 bg-surface/40 p-4 hover:border-accent/40"
            >
              <h2 className="font-[family-name:var(--font-display)] text-xl">
                {listing.title}
              </h2>
              <p className="mt-2 text-accent">
                Rs. {listing.priceLkr.toLocaleString('en-LK')}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
