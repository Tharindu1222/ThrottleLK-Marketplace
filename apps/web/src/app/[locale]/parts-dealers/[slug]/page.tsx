import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BreadcrumbLabels } from '@/components/breadcrumbs';
import { DealerShowroomProfile } from '@/components/dealer-showroom-profile';
import {
  PartCard,
  type BrowsePartCard,
} from '@/components/part-card';
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
    const dealer = await apiGet<DealerShowroom>(`/api/v1/parts-dealers/${slug}`);
    const canonicalSlug = dealer.slug || slug;
    return pageMetadata({
      title: `${dealer.name} — parts shop`,
      description:
        dealer.description?.slice(0, 160) ??
        `${dealer.name} showroom on ThrottleLK`,
      path: `/${locale}/parts-dealers/${canonicalSlug}`,
    });
  } catch {
    return { title: 'Parts shop not found' };
  }
}

export default async function PartsDealerShowroomPage({
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
  const kindRaw = typeof sp.kind === 'string' ? sp.kind : undefined;
  const kind =
    kindRaw === 'spare' || kindRaw === 'modified' ? kindRaw : undefined;
  const pageRaw = sp.page;
  const page = parsePageParam(typeof pageRaw === 'string' ? pageRaw : undefined);

  let dealer: DealerShowroom;
  try {
    dealer = await apiGet<DealerShowroom>(`/api/v1/parts-dealers/${slug}`);
  } catch {
    notFound();
  }

  if (dealer.slug && dealer.slug !== slug) {
    redirect(
      hrefWithPage(
        `/${locale}/parts-dealers/${dealer.slug}`,
        { kind },
        page,
      ),
    );
  }

  const listingPage = await apiGetWithMeta<BrowsePartCard[]>(
    '/api/v1/part-listings',
    {
      searchParams: {
        partsDealerId: dealer.id,
        kind,
        page: String(page),
      },
    },
  );
  const listings = listingPage.data;
  const pager = listingPage.meta;
  if (pager && pager.total > 0 && pager.page > pager.totalPages) {
    redirect(
      hrefWithPage(
        `/${locale}/parts-dealers/${slug}`,
        { kind },
        pager.totalPages,
      ),
    );
  }

  const partTotal = pager?.total ?? listings.length;
  const countLabel =
    partTotal === 1
      ? t(locale, 'resultCountPartsOne')
      : t(locale, 'resultCountParts').replace('{count}', String(partTotal));

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
              : t(locale, 'partsShowroom')
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
            {t(locale, 'showroomPartsHeading')}
          </h2>

          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label={t(locale, 'partKindFilter')}
          >
            <Link
              href={hrefWithPage(
                `/${locale}/parts-dealers/${slug}`,
                { kind: undefined },
                1,
              )}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                !kind
                  ? 'bg-foreground text-white'
                  : 'border border-black/15 bg-background hover:border-accent/40'
              }`}
              aria-current={!kind ? 'page' : undefined}
            >
              {t(locale, 'allPartsNav')}
            </Link>
            <Link
              href={hrefWithPage(
                `/${locale}/parts-dealers/${slug}`,
                { kind: 'spare' },
                1,
              )}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                kind === 'spare'
                  ? 'bg-foreground text-white'
                  : 'border border-black/15 bg-background hover:border-accent/40'
              }`}
              aria-current={kind === 'spare' ? 'page' : undefined}
            >
              {t(locale, 'spareTab')}
            </Link>
            <Link
              href={hrefWithPage(
                `/${locale}/parts-dealers/${slug}`,
                { kind: 'modified' },
                1,
              )}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                kind === 'modified'
                  ? 'bg-foreground text-white'
                  : 'border border-black/15 bg-background hover:border-accent/40'
              }`}
              aria-current={kind === 'modified' ? 'page' : undefined}
            >
              {t(locale, 'modifiedTab')}
            </Link>
          </div>

          <div className="mt-6 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.length === 0 ? (
              <p className="text-muted sm:col-span-2 lg:col-span-3 xl:col-span-4">
                {t(
                  locale,
                  kind === 'modified'
                    ? 'noShopModifiedPartsYet'
                    : kind === 'spare'
                      ? 'noShopSparePartsYet'
                      : 'noShopPartsYet',
                )}
              </p>
            ) : (
              listings.map((listing) => (
                <PartCard key={listing.id} locale={locale} part={listing} />
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
                hrefWithPage(
                  `/${locale}/parts-dealers/${slug}`,
                  { kind },
                  next,
                )
              }
            />
          ) : null}
        </section>
    </main>
  );
}
