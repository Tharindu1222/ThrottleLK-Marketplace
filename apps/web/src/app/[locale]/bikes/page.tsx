import { notFound } from 'next/navigation';
import { BrowseFilters } from '@/components/browse-filters';
import { ListingCard, type BrowseListingCard } from '@/components/listing-card';
import { SaveSearchButton } from '@/components/save-search-button';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import Link from 'next/link';

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
  const page = spStr(sp, 'page');

  const [listingPage, brands, districts, categories] = await Promise.all([
    apiGetWithMeta<BrowseListingCard[]>('/api/v1/listings', {
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
        page,
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

  const listings = listingPage.data;
  const total = listingPage.meta?.total ?? listings.length;
  const pager = listingPage.meta;

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filterState)) {
      if (value) params.set(key, value);
    }
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    return `/${locale}/bikes${qs ? `?${qs}` : ''}`;
  }

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
          {pager && pager.totalPages > 1 ? (
            <nav
              className="mt-8 flex items-center justify-between text-sm"
              aria-label={t(locale, 'pagination')}
            >
              {pager.hasPreviousPage ? (
                <Link href={pageHref(pager.page - 1)} className="text-accent">
                  {t(locale, 'pagePrev')}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                {t(locale, 'pageOf')
                  .replace('{page}', String(pager.page))
                  .replace('{pages}', String(pager.totalPages))}
              </span>
              {pager.hasNextPage ? (
                <Link href={pageHref(pager.page + 1)} className="text-accent">
                  {t(locale, 'pageNext')}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>
      </div>
    </main>
  );
}
