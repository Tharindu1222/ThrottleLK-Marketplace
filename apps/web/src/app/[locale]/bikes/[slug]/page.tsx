import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { listingJsonLd, pageMetadata } from '@/lib/seo';
import { ListingActions } from '@/components/listing-actions';
import { ReportListing } from '@/components/report-listing';
import { ContactPanel } from './contact-panel';

type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceLkr: number;
  manufactureYear: number;
  mileage: number | null;
  engineCc: number | null;
  fuelType: string;
  transmission: string;
  condition: string;
  colour: string | null;
  phone: string | null;
  whatsapp: string | null;
  contactHidden?: boolean;
  coverImageUrl?: string | null;
  images?: { id: string; imageUrl: string; isCover: boolean }[];
  seller?: { id: string; displayName: string } | null;
};

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const listing = await apiGet<Listing>(`/api/v1/listings/${slug}`);
    return pageMetadata({
      title: `${listing.title} — Rs. ${listing.priceLkr.toLocaleString('en-LK')}`,
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
    listing = await apiGet<Listing>(`/api/v1/listings/${slug}`);
  } catch {
    notFound();
  }

  const jsonLd = listingJsonLd({
    title: listing.title,
    description: listing.description,
    priceLkr: listing.priceLkr,
    slug: listing.slug,
    locale,
  });

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1.4fr_0.8fr]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>
        <p className="text-sm tracking-[0.2em] text-accent uppercase">
          {t(locale, 'brand')}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide sm:text-5xl">
          {listing.title}
        </h1>
        <p className="mt-4 text-2xl text-accent">{formatLkr(listing.priceLkr)}</p>
        {listing.seller ? (
          <p className="mt-2 text-sm text-muted">
            Seller:{' '}
            <Link
              href={`/${locale}/sellers/${listing.seller.id}`}
              className="text-accent underline"
            >
              {listing.seller.displayName}
            </Link>
          </p>
        ) : null}
        {listing.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverImageUrl}
            alt={listing.title}
            className="mt-6 max-h-[420px] w-full object-cover ring-1 ring-white/10"
          />
        ) : null}
        {listing.images && listing.images.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {listing.images.map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={image.id}
                src={image.imageUrl}
                alt=""
                className="h-16 w-20 object-cover ring-1 ring-white/10"
              />
            ))}
          </div>
        ) : null}
        <ListingActions locale={locale} listing={listing} />
        <dl className="mt-8 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">{t(locale, 'year')}</dt>
            <dd>{listing.manufactureYear}</dd>
          </div>
          <div>
            <dt className="text-muted">{t(locale, 'mileage')}</dt>
            <dd>
              {listing.mileage != null
                ? `${listing.mileage.toLocaleString()} km`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t(locale, 'condition')}</dt>
            <dd>{listing.condition}</dd>
          </div>
          <div>
            <dt className="text-muted">{t(locale, 'fuel')}</dt>
            <dd>{listing.fuelType}</dd>
          </div>
          <div>
            <dt className="text-muted">{t(locale, 'transmission')}</dt>
            <dd>{listing.transmission}</dd>
          </div>
          <div>
            <dt className="text-muted">CC</dt>
            <dd>{listing.engineCc ?? '—'}</dd>
          </div>
        </dl>
        <div className="mt-10 whitespace-pre-wrap text-foreground/90">
          {listing.description}
        </div>
        <ReportListing locale={locale} listingId={listing.id} />
      </article>
      <ContactPanel locale={locale} listing={listing} />
    </main>
  );
}
