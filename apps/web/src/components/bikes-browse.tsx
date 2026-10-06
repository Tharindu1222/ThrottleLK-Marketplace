import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BrowseFilters,
  type BrowseFilterState,
} from '@/components/browse-filters';
import { ListingCard, type BrowseListingCard } from '@/components/listing-card';
import { Pagination } from '@/components/pagination';
import { PartCard, type BrowsePartCard } from '@/components/part-card';
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
  const partSearch: Record<string, string> = { limit: '4' };
  if (filterState.brandId) partSearch.brandId = filterState.brandId;
  if (filterState.modelId) partSearch.modelId = filterState.modelId;

  const [listingPage, brands, districts, categories, spareParts, modifiedParts, accessoryParts] =
    await Promise.all([
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
    apiGet<BrowsePartCard[]>('/api/v1/part-listings', {
      searchParams: { ...partSearch, kind: 'spare' },
    }).catch(() => [] as BrowsePartCard[]),
    apiGet<BrowsePartCard[]>('/api/v1/part-listings', {
      searchParams: { ...partSearch, kind: 'modified' },
    }).catch(() => [] as BrowsePartCard[]),
    apiGet<BrowsePartCard[]>('/api/v1/part-listings', {
      searchParams: { ...partSearch, kind: 'accessory' },
    }).catch(() => [] as BrowsePartCard[]),
  ]);

  let similarSpare = spareParts;
  let similarModified = modifiedParts;
  let similarAccessories = accessoryParts;
  const filteredParts = Boolean(filterState.brandId || filterState.modelId);
  const matchedBrand =
    filteredParts &&
    (spareParts.length > 0 ||
      modifiedParts.length > 0 ||
      accessoryParts.length > 0);
  if (filteredParts && !matchedBrand) {
    const [fallbackSpare, fallbackModified, fallbackAccessories] =
      await Promise.all([
      apiGet<BrowsePartCard[]>('/api/v1/part-listings', {
        searchParams: { kind: 'spare', limit: '4' },
      }).catch(() => [] as BrowsePartCard[]),
      apiGet<BrowsePartCard[]>('/api/v1/part-listings', {
        searchParams: { kind: 'modified', limit: '4' },
      }).catch(() => [] as BrowsePartCard[]),
      apiGet<BrowsePartCard[]>('/api/v1/part-listings', {
        searchParams: { kind: 'accessory', limit: '4' },
      }).catch(() => [] as BrowsePartCard[]),
    ]);
    similarSpare = fallbackSpare;
    similarModified = fallbackModified;
    similarAccessories = fallbackAccessories;
  }

  const listings = listingPage.data;
  const pager = listingPage.meta;
  const total = pager?.total ?? listings.length;

  const pageFilters = pagerState ?? filterState;

  if (pager && pager.total > 0 && pager.page > pager.totalPages) {
    redirect(hrefWithPage(listPath, pageFilters, pager.totalPages));
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          {t(locale, 'homeBrowseEyebrow')}
        </p>
        <h1
          id="listing-results"
          className="mt-2 break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          {heading ?? t(locale, 'browse')}
        </h1>
        {intro ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            {intro}
          </p>
        ) : null}
      </header>

      <div className="mt-6 grid w-full min-w-0 grid-cols-1 gap-8 lg:mt-5 lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)] lg:items-start">
        <aside className="w-full min-w-0 space-y-2 lg:sticky lg:top-[calc(4.25rem+0.75rem)] lg:z-10 lg:self-start">
          <BrowseFilters
            locale={locale}
            brands={brands}
            districts={districts}
            categories={categories}
            initial={filterState}
            actionPath={listPath}
          />
          <SaveSearchButton locale={locale} filters={filterState} />
        </aside>

        <div className="w-full min-w-0">
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
          <div className="grid w-full min-w-0 auto-rows-fr grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
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
      <SimilarParts
        locale={locale}
        title={
          filteredParts && !matchedBrand
            ? t(locale, 'homeLatestPartsTitle')
            : t(locale, 'similarParts')
        }
        seeMoreLabel={t(locale, 'seeMore')}
        seeMoreHref={partsSeeMoreHref(locale, filterState, matchedBrand)}
        spareTitle={t(locale, 'compatibleSpareParts')}
        modifiedTitle={t(locale, 'compatibleModifiedParts')}
        accessoryTitle={t(locale, 'compatibleRiderAccessories')}
        spare={similarSpare}
        modified={similarModified}
        accessories={similarAccessories}
      />
      {faqTitle && faqItems?.length ? (
        <section className="mt-12 max-w-3xl border-t border-black/10 pt-8">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: safeJsonLd(faqPageJsonLd(faqItems)),
            }}
          />
          <h2 className="break-words text-2xl font-bold tracking-tight text-foreground">
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

function partsSeeMoreHref(
  locale: Locale,
  filters: BrowseFilterState,
  matchedBrand: boolean,
) {
  if (!matchedBrand) return `/${locale}/bike-parts`;
  const params = new URLSearchParams();
  if (filters.brandId) params.set('brandId', filters.brandId);
  if (filters.modelId) params.set('modelId', filters.modelId);
  const query = params.toString();
  return query ? `/${locale}/bike-parts?${query}` : `/${locale}/bike-parts`;
}

function SimilarParts({
  locale,
  title,
  seeMoreLabel,
  seeMoreHref,
  spareTitle,
  modifiedTitle,
  accessoryTitle,
  spare,
  modified,
  accessories,
}: {
  locale: Locale;
  title: string;
  seeMoreLabel: string;
  seeMoreHref: string;
  spareTitle: string;
  modifiedTitle: string;
  accessoryTitle: string;
  spare: BrowsePartCard[];
  modified: BrowsePartCard[];
  accessories: BrowsePartCard[];
}) {
  if (spare.length === 0 && modified.length === 0 && accessories.length === 0) {
    return null;
  }
  const groups = [
    { key: 'spare', heading: spareTitle, items: spare },
    { key: 'modified', heading: modifiedTitle, items: modified },
    { key: 'accessory', heading: accessoryTitle, items: accessories },
  ].filter((group) => group.items.length > 0);

  return (
    <section className="mt-14 border-t border-black/10 pt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
          {title}
        </h2>
        <Link
          href={seeMoreHref}
          className="inline-flex items-center justify-center rounded-full border border-black/15 px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground transition hover:border-accent hover:text-accent"
        >
          {seeMoreLabel}
        </Link>
      </div>
      <div className="space-y-10">
        {groups.map((group) => (
          <div key={group.key}>
            <h3 className="mb-4 text-sm font-semibold tracking-[0.14em] text-muted uppercase">
              {group.heading}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {group.items.map((part) => (
                <PartCard key={part.id} locale={locale} part={part} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
