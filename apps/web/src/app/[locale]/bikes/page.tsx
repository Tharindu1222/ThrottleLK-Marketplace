import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { BrowseFilters } from '@/components/browse-filters';
import { ListingCard, type BrowseListingCard } from '@/components/listing-card';
import { Pagination } from '@/components/pagination';
import { SaveSearchButton } from '@/components/save-search-button';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { hrefWithPage, parsePageParam } from '@/lib/pagination';
import { pageMetadata } from '@/lib/seo';

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

function filterStateFrom(
  sp: Record<string, string | string[] | undefined>,
) {
  return {
    q: spStr(sp, 'q'),
    brandId: spStr(sp, 'brandId'),
    modelId: spStr(sp, 'modelId'),
    categoryId: spStr(sp, 'categoryId'),
    districtId: spStr(sp, 'districtId'),
    minPrice: spStr(sp, 'minPrice'),
    maxPrice: spStr(sp, 'maxPrice'),
    minYear: spStr(sp, 'minYear'),
    maxYear: spStr(sp, 'maxYear'),
    condition: spStr(sp, 'condition'),
    sort: spStr(sp, 'sort'),
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const page = parsePageParam(spStr(sp, 'page'));
  const path = hrefWithPage(`/${locale}/bikes`, filterStateFrom(sp), page);
  const title =
    page > 1
      ? `Motorcycles for sale in Sri Lanka — page ${page}`
      : 'Motorcycles for sale in Sri Lanka';
  return pageMetadata({
    title,
    description:
      'Browse used and new motorbikes and scooters from private sellers and dealers across Sri Lanka.',
    path,
  });
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
  const filterState = filterStateFrom(sp);
  const page = parsePageParam(spStr(sp, 'page'));

  const [listingPage, brands, districts, categories] = await Promise.all([
    apiGetWithMeta<BrowseListingCard[]>('/api/v1/listings', {
      searchParams: {
        ...filterState,
        page: String(page),
      },
    }),
    apiGet<Brand[]>('/api/v1/brands'),
    apiGet<District[]>('/api/v1/locations/districts'),
    apiGet<Category[]>('/api/v1/categories', {
      searchParams: { scope: 'public' },
    }),
  ]);

  const listings = listingPage.data;
  const pager = listingPage.meta;
  const total = pager?.total ?? listings.length;

  if (pager && pager.total > 0 && pager.page > pager.totalPages) {
    redirect(hrefWithPage(`/${locale}/bikes`, filterState, pager.totalPages));
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1
        id="listing-results"
        className="font-[family-name:var(--font-display)] text-4xl tracking-wide"
      >
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
            {total === 1
              ? t(locale, 'resultCountOne')
              : t(locale, 'resultCount').replace('{count}', String(total))}
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
          {pager ? (
            <Pagination
              page={pager.page}
              totalPages={pager.totalPages}
              hasPreviousPage={pager.hasPreviousPage}
              hasNextPage={pager.hasNextPage}
              total={pager.total}
              limit={pager.limit}
              ariaLabel={t(locale, 'pagination')}
              previousLabel={t(locale, 'pagePrev')}
              nextLabel={t(locale, 'pageNext')}
              pageOfTemplate={t(locale, 'pageOf')}
              showingTemplate={t(locale, 'showingRange')}
              hrefForPage={(next) =>
                hrefWithPage(`/${locale}/bikes`, filterState, next)
              }
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
