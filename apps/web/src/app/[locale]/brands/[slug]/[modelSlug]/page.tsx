import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type Model = {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  brand?: { id: string; name: string; slug: string };
};
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
  params: Promise<{ locale: string; slug: string; modelSlug: string }>;
}): Promise<Metadata> {
  const { locale, slug, modelSlug } = await params;
  try {
    const model = await apiGet<Model>(`/api/v1/models/${modelSlug}`);
    const brandName = model.brand?.name ?? slug;
    return pageMetadata({
      title: `${brandName} ${model.name} for sale in Sri Lanka`,
      description: `Find ${brandName} ${model.name} bikes on ThrottleLK — prices, specs, and seller contact.`,
      path: `/${locale}/brands/${slug}/${modelSlug}`,
    });
  } catch {
    return { title: 'Model not found' };
  }
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; modelSlug: string }>;
}) {
  const { locale: raw, slug, modelSlug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  let model: Model;
  try {
    model = await apiGet<Model>(`/api/v1/models/${modelSlug}`);
  } catch {
    notFound();
  }

  if (model.brand && model.brand.slug !== slug) {
    notFound();
  }

  const listings = await apiGet<Listing[]>('/api/v1/listings', {
    searchParams: { modelId: model.id },
  });
  const brandName = model.brand?.name ?? 'Bike';

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm text-muted">
        <Link href={`/${locale}/brands/${slug}`} className="hover:text-accent">
          {brandName}
        </Link>
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
        {brandName} {model.name}
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Active {brandName} {model.name} listings on ThrottleLK.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <p className="text-muted">No active listings for this model yet.</p>
        ) : (
          listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/${locale}/bikes/${listing.slug}`}
              className="border border-black/10 bg-surface/40 p-4 hover:border-accent/40"
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
