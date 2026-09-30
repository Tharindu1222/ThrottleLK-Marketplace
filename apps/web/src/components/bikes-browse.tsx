import { redirect } from 'next/navigation';
import {
  BrowseFilters,
  type BrowseFilterState,
} from '@/components/browse-filters';
import { ListingCard, type BrowseListingCard } from '@/components/listing-card';
import { Pagination } from '@/components/pagination';
import { PromotedListingsRail } from '@/components/promoted-listings-rail';
import { SaveSearchButton } from '@/components/save-search-button';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';
import { hrefWithPage } from '@/lib/pagination';
import { faqPageJsonLd } from '@/lib/seo';
import { safeJsonLd } from '@/lib/json-ld';

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
  faqItems?: Array<{ question: string; answer: string }>;
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
      <header>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          {t(locale, 'homeBrowseEyebrow')}
        </p>
        <h1
          id="listing-results"
          className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          {heading ?? t(locale, 'browse')}
        </h1>
        {intro ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            {intro}
          </p>
        ) : null}
      </header>

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

        <div className="min-w-0">
          <PromotedListingsRail
            locale={locale}
            surface="browse"
            kind="bike"
            limit={6}
            variant="browse"
          />
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
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safeJsonLd(faqPageJsonLd(faqItems)),
            }}
          />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {faqTitle}
          </h2>
          <dl className="mt-4 space-y-5 text-sm leading-relaxed text-foreground/90">
            {faqItems.map((item) => (
              <div key={item.question}>
                <dt className="font-medium text-foreground">{item.question}</dt>
                <dd className="mt-1 text-muted">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </main>
  );
}
