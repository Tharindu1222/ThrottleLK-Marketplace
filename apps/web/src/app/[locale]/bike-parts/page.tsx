import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PartBrowseFilters } from '@/components/part-browse-filters';
import { PartCard, type BrowsePartCard } from '@/components/part-card';
import { Pagination } from '@/components/pagination';
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
  const kind = spStr(sp, 'kind') === 'modified' ? 'modified' : 'spare';
  const filters = { ...filterStateFrom(sp), kind };
  return pageMetadata({
    title:
      page > 1
        ? `Bike parts — page ${page}`
        : 'Motorcycle bike parts in Sri Lanka',
    description:
      'Browse spare and modified parts from approved parts dealers on ThrottleLK.',
    path: hrefWithPage(`/${locale}/bike-parts`, filters, page),
  });
}

export default async function BikePartsPage({
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
  const kind = spStr(sp, 'kind') === 'modified' ? 'modified' : 'spare';
  const filterState = filterStateFrom(sp);
  const page = parsePageParam(spStr(sp, 'page'));
  const query = { ...filterState, kind };
  const apiPath =
    kind === 'modified' ? '/api/v1/modified-parts' : '/api/v1/spare-parts';

  const [result, brands, districts, categories] = await Promise.all([
    apiGetWithMeta<BrowsePartCard[]>(apiPath, {
      searchParams: {
        ...filterState,
        page: String(page),
        limit: '24',
      },
    }).catch(() => ({ data: [] as BrowsePartCard[], meta: undefined })),
    apiGet<Brand[]>('/api/v1/brands').catch(() => [] as Brand[]),
    apiGet<District[]>('/api/v1/locations/districts').catch(
      () => [] as District[],
    ),
    apiGet<Category[]>('/api/v1/part-categories').catch(
      () => [] as Category[],
    ),
  ]);

  const pager = result.meta;
  if (pager && pager.total > 0 && pager.page > pager.totalPages) {
    redirect(hrefWithPage(`/${locale}/bike-parts`, query, pager.totalPages));
  }

  const total = pager?.total ?? result.data.length;
  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      active
        ? 'bg-foreground text-white'
        : 'border border-black/15 bg-background hover:border-accent/40'
    }`;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1
        id="part-results"
        className="font-[family-name:var(--font-display)] text-4xl tracking-wide"
      >
        {t(locale, 'bikePartsTitle')}
      </h1>
      <p className="mt-2 text-muted">{t(locale, 'bikePartsSubtitle')}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={hrefWithPage(`/${locale}/bike-parts`, { ...filterState, kind: 'spare' }, 1)}
          className={tabClass(kind === 'spare')}
        >
          {t(locale, 'sparePartsNav')}
        </Link>
        <Link
          href={hrefWithPage(
            `/${locale}/bike-parts`,
            { ...filterState, kind: 'modified' },
            1,
          )}
          className={tabClass(kind === 'modified')}
        >
          {t(locale, 'modifiedPartsNav')}
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-[calc(4.25rem+1rem)] lg:z-10 lg:max-h-[calc(100vh-5.25rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
          <PartBrowseFilters
            locale={locale}
            actionPath={`/${locale}/bike-parts`}
            brands={brands}
            districts={districts}
            categories={categories}
            initial={filterState}
            hiddenFields={{ kind }}
          />
        </aside>

        <div>
          <p className="mb-4 text-sm text-muted">
            {total === 1
              ? t(locale, 'resultCountPartsOne')
              : t(locale, 'resultCountParts').replace('{count}', String(total))}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.length === 0 ? (
              <p className="text-muted sm:col-span-2 xl:col-span-3">
                {t(locale, 'noPartsYet')}
              </p>
            ) : (
              result.data.map((part) => (
                <PartCard key={part.id} locale={locale} part={part} />
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
                hrefWithPage(`/${locale}/bike-parts`, query, next)
              }
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
