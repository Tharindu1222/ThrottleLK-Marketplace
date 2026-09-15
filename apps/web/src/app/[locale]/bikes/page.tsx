import { notFound } from 'next/navigation';
import { BrowseFilters } from '@/components/browse-filters';
import { ListingCard, type BrowseListingCard } from '@/components/listing-card';
import { SaveSearchButton } from '@/components/save-search-button';
import { apiGet } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';

type Brand = { id: string; name: string; slug: string };
type District = { id: string; name: string; slug: string };
type Category = { id: string; name: string; slug: string };

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
    apiGet<BrowseListingCard[]>('/api/v1/listings', {
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
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        {t(locale, 'browse')}
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-[calc(4.25rem+1rem)] lg:z-10 lg:max-h-[calc(100vh-5.25rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
          <BrowseFilters
            locale={locale}
            brands={brands}
            districts={districts}
            categories={categories}
            initial={filterState}
          />
          <SaveSearchButton locale={locale} filters={filterState} />
        </aside>

        <div>
          <p className="mb-4 text-sm text-muted">
            {listings.length === 1
              ? t(locale, 'resultCountOne')
              : t(locale, 'resultCount').replace(
                  '{count}',
                  String(listings.length),
                )}
          </p>
          <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {listings.length === 0 ? (
              <p className="text-muted sm:col-span-2 xl:col-span-3">
                {t(locale, 'noListings')}
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
        </div>
      </div>
    </main>
  );
}
