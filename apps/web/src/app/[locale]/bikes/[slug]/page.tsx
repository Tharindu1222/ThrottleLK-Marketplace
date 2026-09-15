import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { listingJsonLd, pageMetadata } from '@/lib/seo';
import { ListingActions } from '@/components/listing-actions';
import { ListingGallery } from '@/components/listing-gallery';
import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';
import { ReportListing } from '@/components/report-listing';
import { BreadcrumbLabels } from '@/components/breadcrumbs';
import { ContactPanel } from './contact-panel';

const SIMILAR_ROW_SIZE = 4;

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
  brandId?: string;
  modelId?: string;
  coverImageUrl?: string | null;
  images?: { id: string; imageUrl: string; isCover: boolean }[];
  seller?: { id: string; displayName: string } | null;
};

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-black/10 bg-surface px-4 py-3">
      <dt className="text-[11px] tracking-[0.14em] text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
        {value}
      </dd>
    </div>
  );
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

  const metaParts = [
    String(listing.manufactureYear),
    listing.mileage != null
      ? `${listing.mileage.toLocaleString('en-LK')} km`
      : null,
    listing.engineCc != null ? `${listing.engineCc} cc` : null,
    listing.condition,
  ].filter(Boolean);

  const specs: { label: string; value: string }[] = [
    { label: t(locale, 'year'), value: String(listing.manufactureYear) },
    {
      label: t(locale, 'mileage'),
      value:
        listing.mileage != null
          ? `${listing.mileage.toLocaleString('en-LK')} km`
          : '—',
    },
    { label: t(locale, 'condition'), value: listing.condition },
    { label: t(locale, 'fuel'), value: listing.fuelType },
    { label: t(locale, 'transmission'), value: listing.transmission },
    {
      label: t(locale, 'cc'),
      value: listing.engineCc != null ? String(listing.engineCc) : '—',
    },
  ];
  if (listing.colour) {
    specs.push({ label: t(locale, 'colour'), value: listing.colour });
  }

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

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <BreadcrumbLabels labels={{ [slug]: listing.title }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)] lg:items-start lg:gap-10">
        <article className="min-w-0 space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex border border-accent/25 bg-accent/5 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-accent uppercase">
                  {listing.condition}
                </span>
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl leading-[0.95] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {listing.title}
              </h1>
              <p className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-accent sm:text-4xl">
                {formatLkr(listing.priceLkr)}
              </p>
              {metaParts.length ? (
                <p className="text-sm text-muted">
                  {metaParts.map((part, i) => (
                    <span key={`${part}-${i}`}>
                      {i > 0 ? (
                        <span className="mx-2 text-black/25" aria-hidden>
                          ·
                        </span>
                      ) : null}
                      {part}
                    </span>
                  ))}
                </p>
              ) : null}
              {listing.seller ? (
                <p className="text-sm text-muted">
                  {t(locale, 'seller')}:{' '}
                  <Link
                    href={`/${locale}/sellers/${listing.seller.id}`}
                    className="font-medium text-accent transition hover:underline"
                  >
                    {listing.seller.displayName}
                  </Link>
                </p>
              ) : null}
            </div>
            <div className="shrink-0 sm:pt-1">
              <ListingActions locale={locale} listing={listing} />
            </div>
          </header>

          <ListingGallery
            locale={locale}
            title={listing.title}
            coverImageUrl={listing.coverImageUrl}
            images={listing.images}
          />

          <section>
            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {specs.map((spec) => (
                <SpecCell
                  key={spec.label}
                  label={spec.label}
                  value={spec.value}
                />
              ))}
            </dl>
          </section>

          <div className="lg:hidden">
            <ContactPanel locale={locale} listing={listing} />
          </div>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground">
              {t(locale, 'description')}
            </h2>
            <div className="max-w-2xl whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
              {listing.description}
            </div>
          </section>

          <div className="pt-2">
            <ReportListing locale={locale} listingId={listing.id} />
          </div>
        </article>

        <aside className="hidden lg:sticky lg:top-[calc(4.25rem+1rem)] lg:block lg:self-start">
          <ContactPanel locale={locale} listing={listing} />
        </aside>
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
    </main>
  );
}
