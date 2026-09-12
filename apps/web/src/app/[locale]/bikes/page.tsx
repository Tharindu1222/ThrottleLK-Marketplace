import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrowseFilters } from '@/components/browse-filters';
import { SaveSearchButton } from '@/components/save-search-button';
import { apiGet } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';

type Listing = {
  id: string;
  slug: string;
  title: string;
  priceLkr: number;
  manufactureYear: number;
  mileage: number | null;
  condition: string;
  districtId: string;
  coverImageUrl?: string | null;
};

type Brand = { id: string; name: string; slug: string };
type District = { id: string; name: string; slug: string };
type Category = { id: string; name: string; slug: string };

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function spStr(
  sp: Record<string, string | string[] | undefined>,
  key: string,
) {
  const v = sp[key];
  return typeof v === 'string' ? v : undefined;
}

export default async function BikesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;
  const q = spStr(sp, 'q');
  const brandId = spStr(sp, 'brandId');
  const modelId = spStr(sp, 'modelId');
  const categoryId = spStr(sp, 'categoryId');
  const districtId = spStr(sp, 'districtId');
  const minPrice = spStr(sp, 'minPrice');
  const maxPrice = spStr(sp, 'maxPrice');
  const minYear = spStr(sp, 'minYear');
  const maxYear = spStr(sp, 'maxYear');
  const condition = spStr(sp, 'condition');
  const sort = spStr(sp, 'sort');

  const [listings, brands, districts, categories] = await Promise.all([
    apiGet<Listing[]>('/api/v1/listings', {
      searchParams: {
        q,
        brandId,
        modelId,
        categoryId,
        districtId,
        minPrice,
        maxPrice,
        minYear,
        maxYear,
        condition,
        sort,
      },
    }),
    apiGet<Brand[]>('/api/v1/brands'),
    apiGet<District[]>('/api/v1/locations/districts'),
    apiGet<Category[]>('/api/v1/categories', {
      searchParams: { scope: 'public' },
    }),
  ]);

  const filterState = {
    q,
    brandId,
    modelId,
    categoryId,
    districtId,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    condition,
    sort,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        {t(locale, 'browse')}
      </h1>

      <BrowseFilters
        locale={locale}
        brands={brands}
        districts={districts}
        categories={categories}
        initial={filterState}
      />

      <SaveSearchButton locale={locale} filters={filterState} />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <p className="text-muted sm:col-span-2 lg:col-span-3">
            {t(locale, 'noListings')}
          </p>
        ) : (
          listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/${locale}/bikes/${listing.slug}`}
              className="group border border-white/10 bg-surface/40 transition hover:border-accent/40"
            >
              <div className="aspect-[4/3] bg-background/80">
                {listing.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted">
                    No photo
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide group-hover:text-accent">
                  {listing.title}
                </h2>
                <p className="mt-1 text-accent">{formatLkr(listing.priceLkr)}</p>
                <p className="mt-2 text-sm text-muted">
                  {listing.manufactureYear}
                  {listing.mileage != null
                    ? ` · ${listing.mileage.toLocaleString('en-LK')} km`
                    : ''}{' '}
                  · {listing.condition}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
