import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { BreadcrumbLabels } from '@/components/breadcrumbs';
import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';

type Seller = {
  id: string;
  displayName: string;
  memberSince: string;
  dealerSlug?: string | null;
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

  if (seller.dealerSlug) {
    redirect(`/${locale}/dealers/${seller.dealerSlug}`);
  }

  const listings = await apiGet<BrowseListingCard[]>('/api/v1/listings', {
    searchParams: { sellerId: seller.id },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <BreadcrumbLabels labels={{ [id]: seller.displayName }} />
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
      <div className="mt-6 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <p className="text-muted sm:col-span-2 lg:col-span-3">
            No active bikes from this seller.
          </p>
        ) : (
          listings.map((listing) => (
            <ListingCard
              key={listing.id}
              locale={locale}
              listing={listing}
            />
          ))
        )}
      </div>
    </main>
  );
}
