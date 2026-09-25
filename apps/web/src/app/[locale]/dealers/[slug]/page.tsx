import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { BreadcrumbLabels } from '@/components/breadcrumbs';
import { DealerShowroomProfile } from '@/components/dealer-showroom-profile';
import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';
import { Pagination } from '@/components/pagination';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import type { DealerShowroom } from '@/lib/dealer-showroom';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { hrefWithPage, parsePageParam } from '@/lib/pagination';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const dealer = await apiGet<DealerShowroom>(`/api/v1/dealers/${slug}`);
    const canonicalSlug = dealer.slug || slug;
    return pageMetadata({
      title: `${dealer.name} — motorcycle dealer`,
      description:
        dealer.description?.slice(0, 160) ??
        `${dealer.name} showroom on ThrottleLK`,
      path: `/${locale}/dealers/${canonicalSlug}`,
    });
  } catch {
    return { title: 'Dealer not found' };
  }
}

export default async function DealerShowroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const sp = await searchParams;
  const pageRaw = sp.page;
  const page = parsePageParam(typeof pageRaw === 'string' ? pageRaw : undefined);

  let dealer: DealerShowroom;
  try {
    dealer = await apiGet<DealerShowroom>(`/api/v1/dealers/${slug}`);
  } catch {
    notFound();
  }

  if (dealer.slug && dealer.slug !== slug) {
    redirect(`/${locale}/dealers/${dealer.slug}`);
  }

  const listingPage = await apiGetWithMeta<BrowseListingCard[]>(
    '/api/v1/listings',
    {
      searchParams: { dealerId: dealer.id, page: String(page) },
    },
  );
  const listings = listingPage.data;
  const pager = listingPage.meta;
  if (pager && pager.total > 0 && pager.page > pager.totalPages) {
    redirect(
      hrefWithPage(`/${locale}/dealers/${slug}`, {}, pager.totalPages),
    );
  }

  const bikeTotal = pager?.total ?? listings.length;
  const countLabel =
    bikeTotal === 1
      ? t(locale, 'resultCountOne')
      : t(locale, 'resultCount').replace('{count}', String(bikeTotal));

  return (
    <main className="pb-10">
      <div className="mx-auto max-w-7xl px-5 pt-4 sm:px-8 lg:px-10">
        <BreadcrumbLabels labels={{ [slug]: dealer.name }} />
      </div>
      <DealerShowroomProfile
          locale={locale}
          dealer={dealer}
          countLabel={countLabel}
          eyebrow={
            dealer.verifiedAt
              ? t(locale, 'verifiedDealer')
              : t(locale, 'sellerDealer')
          }
        />

        <section
          className="mx-auto mt-8 max-w-7xl px-5 sm:px-8 lg:px-10"
          aria-labelledby="listing-results"
        >
          <h2
            id="listing-results"
            className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-foreground sm:text-3xl"
          >
            {t(locale, 'showroomBikesHeading')}
          </h2>

          <div className="mt-4 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.length === 0 ? (
              <p className="text-muted sm:col-span-2 lg:col-span-3 xl:col-span-4">
                {t(locale, 'showroomEmptyBikes')}
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
                hrefWithPage(`/${locale}/dealers/${slug}`, {}, next)
              }
            />
          ) : null}
        </section>
    </main>
  );
}
