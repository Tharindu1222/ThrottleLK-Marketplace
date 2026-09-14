import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type Seller = {
  id: string;
  displayName: string;
  memberSince: string;
};

type Listing = {
  id: string;
  slug: string;
  title: string;
  priceLkr: number;
  manufactureYear: number;
  coverImageUrl?: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  try {
    const seller = await apiGet<Seller>(`/api/v1/sellers/${id}`);
    return pageMetadata({
      title: `${seller.displayName} — seller on ThrottleLK`,
      description: `Active motorcycle listings from ${seller.displayName}`,
      path: `/${locale}/sellers/${id}`,
    });
  } catch {
    return { title: 'Seller not found' };
  }
}

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  let seller: Seller;
  try {
    seller = await apiGet<Seller>(`/api/v1/sellers/${id}`);
  } catch {
    notFound();
  }

  const listings = await apiGet<Listing[]>('/api/v1/listings', {
    searchParams: { sellerId: seller.id },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm tracking-[0.25em] text-accent uppercase">Seller</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
        {seller.displayName}
      </h1>
      <p className="mt-3 text-sm text-muted">
        Member since{' '}
        {new Date(seller.memberSince).toLocaleDateString('en-LK', {
          year: 'numeric',
          month: 'short',
        })}
      </p>

      <h2 className="mt-12 font-[family-name:var(--font-display)] text-2xl tracking-wide">
        Active listings
      </h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <p className="text-muted">No active bikes from this seller.</p>
        ) : (
          listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/${locale}/bikes/${listing.slug}`}
              className="block overflow-hidden border border-black/10 bg-surface/40 transition hover:border-accent/50"
            >
              {listing.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.coverImageUrl}
                  alt=""
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center bg-background/50 text-sm text-muted">
                  No photo
                </div>
              )}
              <div className="p-4">
                <p className="font-[family-name:var(--font-display)] text-lg">
                  {listing.title}
                </p>
                <p className="mt-1 text-accent">
                  Rs. {listing.priceLkr.toLocaleString('en-LK')}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {listing.manufactureYear}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
