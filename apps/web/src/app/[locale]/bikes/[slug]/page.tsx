import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { listingJsonLd, pageMetadata } from '@/lib/seo';
import { composeListingTitle } from '@/lib/listing-title';
import { sellerProfileHref } from '@/lib/seller-href';
import { ListingContactBar, ListingToolbar } from '@/components/listing-actions';
import { ListingDescription } from '@/components/listing-description';
import { ListingGallery } from '@/components/listing-gallery';
import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';
import { PartCard, type BrowsePartCard } from '@/components/part-card';
import { ListingViewTracker } from '@/components/listing-view-tracker';
import { ReportListing } from '@/components/report-listing';
import { BreadcrumbLabels } from '@/components/breadcrumbs';
import {
  ListingSpecSheet,
  LocationPinIcon,
  listingLocation,
} from '@/components/listing-spec-sheet';
import { VerifiedDealerBadge } from '@/components/verified-dealer-badge';

const SIMILAR_ROW_SIZE = 4;

type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceLkr: number;
  manufactureYear: number;
  registrationYear?: number | null;
  mileage: number | null;
  engineCc: number | null;
  fuelType: string;
  transmission: string;
  condition: string;
  colour: string | null;
  negotiable?: boolean;
  phone: string | null;
  whatsapp: string | null;
  contactHidden?: boolean;
  brandId?: string;
  modelId?: string;
  brandName?: string | null;
  modelName?: string | null;
  categoryName?: string | null;
  districtName?: string | null;
  cityName?: string | null;
  sellerType?: 'dealer' | 'private' | string | null;
  dealerVerified?: boolean;
  listedAt?: string | null;
  viewCount?: number;
  coverImageUrl?: string | null;
  images?: { id: string; imageUrl: string; isCover: boolean }[];
  seller?: {
    id: string;
    displayName: string;
    dealerSlug?: string | null;
    avatarUrl?: string | null;
  } | null;
};

async function listingViewerToken() {
  const raw = (await cookies()).get('throttlelk_access')?.value;
  return raw ? decodeURIComponent(raw) : undefined;
}

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function displayTitle(listing: Listing) {
  return composeListingTitle({
    title: listing.title,
    brandName: listing.brandName,
    modelName: listing.modelName,
    manufactureYear: listing.manufactureYear,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const listing = await apiGet<Listing>(`/api/v1/listings/${slug}`, {
      token: await listingViewerToken(),
    });
    return pageMetadata({
      title: `${displayTitle(listing)} — Rs. ${listing.priceLkr.toLocaleString('en-LK')}`,
      description: listing.description.slice(0, 160),
      path: `/${locale}/bikes/${slug}`,
    });
  } catch {
    return { title: 'Listing not found' };
  }
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  let listing: Listing;
  try {
    listing = await apiGet<Listing>(`/api/v1/listings/${slug}`, {
      token: await listingViewerToken(),
    });
  } catch {
    notFound();
  }

  const heading = displayTitle(listing);
  const location = listingLocation(listing);
  const sellerKind =
    listing.sellerType === 'dealer'
      ? listing.dealerVerified
        ? t(locale, 'verifiedDealer')
        : t(locale, 'sellerDealer')
      : listing.sellerType === 'private'
        ? t(locale, 'sellerPrivate')
        : null;

  const jsonLd = listingJsonLd({
    title: heading,
    description: listing.description,
    priceLkr: listing.priceLkr,
    slug: listing.slug,
    locale,
  });

  let similarAll: BrowseListingCard[] = [];
  if (listing.brandId) {
    try {
      const byBrand = await apiGet<BrowseListingCard[]>('/api/v1/listings', {
        searchParams: { brandId: listing.brandId },
      });
      similarAll = byBrand.filter((item) => item.id !== listing.id);
    } catch {
      similarAll = [];
    }
  }
  const similarRow = similarAll.slice(0, SIMILAR_ROW_SIZE);
  const hasMoreSimilar = similarAll.length > SIMILAR_ROW_SIZE;
  const seeMoreHref = listing.brandId
    ? `/${locale}/bikes?brandId=${encodeURIComponent(listing.brandId)}`
    : `/${locale}/bikes`;

  let relatedSpare: BrowsePartCard[] = [];
  let relatedModified: BrowsePartCard[] = [];
  try {
    const [spare, modified] = await Promise.all([
      apiGet<BrowsePartCard[]>(`/api/v1/listings/${listing.id}/related-parts`, {
        searchParams: { kind: 'spare', limit: '4' },
      }),
      apiGet<BrowsePartCard[]>(`/api/v1/listings/${listing.id}/related-parts`, {
        searchParams: { kind: 'modified', limit: '4' },
      }),
    ]);
    relatedSpare = spare;
    relatedModified = modified;
  } catch {
    relatedSpare = [];
    relatedModified = [];
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <BreadcrumbLabels labels={{ [slug]: heading }} />
      <ListingViewTracker listingId={listing.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-stretch lg:gap-x-10 lg:gap-y-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-5 md:grid-cols-[minmax(0,1fr)_minmax(20rem,36rem)] md:gap-x-8 lg:col-span-2">
          <div className="min-w-0 space-y-3 md:row-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex border border-accent/25 bg-accent/5 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-accent uppercase">
                {listing.condition}
              </span>
              {sellerKind ? (
                listing.dealerVerified ? (
                  <VerifiedDealerBadge locale={locale} />
                ) : (
                  <span className="inline-flex border border-black/12 bg-white px-2.5 py-1 text-[11px] font-medium tracking-[0.14em] text-foreground/80 uppercase">
                    {sellerKind}
                  </span>
                )
              ) : null}
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl leading-[0.95] tracking-tight text-foreground sm:text-4xl">
              {heading}
            </h1>
            <p className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-accent">
              {formatLkr(listing.priceLkr)}
              {listing.negotiable ? (
                <span className="ml-2 align-middle text-sm font-sans font-normal tracking-normal text-muted">
                  · {t(locale, 'negotiable')}
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
              {location ? (
                <span className="inline-flex items-center gap-1.5">
                  <LocationPinIcon />
                  {location}
                </span>
              ) : null}
              {listing.seller ? (
                <span>
                  {t(locale, 'seller')}:{' '}
                  <Link
                    href={sellerProfileHref(locale, listing.seller)}
                    className="font-medium text-accent transition hover:underline"
                  >
                    {listing.seller.displayName}
                  </Link>
                </span>
              ) : null}
            </div>
          </div>
          <ListingToolbar locale={locale} listing={listing} />
          <div className="col-span-2 md:col-span-1 md:col-start-2 md:self-center">
            <ListingContactBar locale={locale} listing={listing} />
          </div>
        </header>

        <ListingGallery
          locale={locale}
          title={heading}
          coverImageUrl={listing.coverImageUrl}
          images={listing.images}
        />

        <ListingSpecSheet locale={locale} listing={listing} />

        <section className="space-y-3 border-t border-black/10 pt-8 lg:col-start-1 lg:border-t-0 lg:pt-0">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground">
            {t(locale, 'description')}
          </h2>
          <ListingDescription locale={locale} text={listing.description} />
          <div className="pt-4">
            <ReportListing locale={locale} listingId={listing.id} />
          </div>
        </section>
      </div>

      {similarRow.length > 0 ? (
        <section className="mt-14 border-t border-black/10 pt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
              {t(locale, 'similarListings')}
            </h2>
            {hasMoreSimilar ? (
              <Link
                href={seeMoreHref}
                className="inline-flex items-center justify-center rounded-full border border-black/15 px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground transition hover:border-accent hover:text-accent"
              >
                {t(locale, 'seeMore')}
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similarRow.map((item) => (
              <ListingCard key={item.id} locale={locale} listing={item} />
            ))}
          </div>
        </section>
      ) : null}

      {relatedSpare.length > 0 ? (
        <section className="mt-14 border-t border-black/10 pt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
              {t(locale, 'compatibleSpareParts')}
            </h2>
            <Link
              href={`/${locale}/bike-parts?kind=spare&brandId=${encodeURIComponent(listing.brandId ?? '')}&modelId=${encodeURIComponent(listing.modelId ?? '')}`}
              className="inline-flex items-center justify-center rounded-full border border-black/15 px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground transition hover:border-accent hover:text-accent"
            >
              {t(locale, 'seeMore')}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedSpare.map((item) => (
              <PartCard key={item.id} locale={locale} part={item} />
            ))}
          </div>
        </section>
      ) : null}

      {relatedModified.length > 0 ? (
        <section className="mt-14 border-t border-black/10 pt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
              {t(locale, 'compatibleModifiedParts')}
            </h2>
            <Link
              href={`/${locale}/bike-parts?kind=modified&brandId=${encodeURIComponent(listing.brandId ?? '')}&modelId=${encodeURIComponent(listing.modelId ?? '')}`}
              className="inline-flex items-center justify-center rounded-full border border-black/15 px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground transition hover:border-accent hover:text-accent"
            >
              {t(locale, 'seeMore')}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedModified.map((item) => (
              <PartCard key={item.id} locale={locale} part={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
