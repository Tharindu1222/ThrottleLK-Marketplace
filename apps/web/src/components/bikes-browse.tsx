import { redirect } from 'next/navigation';
import {
  BrowseFilters,
  type BrowseFilterState,
} from '@/components/browse-filters';
import { ListingCard, type BrowseListingCard } from '@/components/listing-card';
import { Pagination } from '@/components/pagination';
import { SaveSearchButton } from '@/components/save-search-button';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';
import { hrefWithPage } from '@/lib/pagination';

type Brand = { id: string; name: string; slug: string };
type District = { id: string; name: string; slug: string };
type Category = { id: string; name: string; slug: string };

export async function BikesBrowse({
  locale,
  filterState,
  page,
  heading,
  intro,
  faqTitle,
  faqItems,
  emptyHint,
  listPath,
  pagerState,
}: {
  locale: Locale;
  filterState: BrowseFilterState;
  page: number;
  heading?: string;
  intro?: string;
  faqTitle?: string;
  faqItems?: string[];
  emptyHint?: string;
  listPath: string;
  pagerState?: BrowseFilterState;
}) {
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

  const pageFilters = pagerState ?? filterState;

  if (pager && pager.total > 0 && pager.page > pager.totalPages) {
    redirect(hrefWithPage(listPath, pageFilters, pager.totalPages));
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1
        id="listing-results"
        className="font-[family-name:var(--font-display)] text-4xl tracking-wide"
      >
        {heading ?? t(locale, 'browse')}
      </h1>
      {intro ? <p className="mt-3 max-w-3xl text-muted">{intro}</p> : null}

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
                {emptyHint ?? t(locale, 'noListings')}
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
              hrefForPage={(next) => hrefWithPage(listPath, pageFilters, next)}
            />
          ) : null}
        </div>
      </div>
      {faqTitle && faqItems?.length ? (
        <section className="mt-12 max-w-3xl border-t border-black/10 pt-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
            {faqTitle}
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/90">
            {faqItems.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
