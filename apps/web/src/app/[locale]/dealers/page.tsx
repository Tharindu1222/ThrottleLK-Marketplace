import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Pagination } from '@/components/pagination';
import { VerifiedDealerBadge } from '@/components/verified-dealer-badge';
import { apiGetWithMeta } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { hrefWithPage, parsePageParam } from '@/lib/pagination';
import { pageMetadata } from '@/lib/seo';

type Dealer = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  coverImageUrl: string | null;
  verifiedAt?: string | null;
  city?: { name: string } | null;
  district?: { name: string } | null;
};

function spStr(
  sp: Record<string, string | string[] | undefined>,
  key: string,
) {
  const v = sp[key];
  return typeof v === 'string' ? v : undefined;
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
  const q = spStr(sp, 'q');
  const type = spStr(sp, 'type') === 'parts' ? 'parts' : 'bike';
  const path = hrefWithPage(`/${locale}/dealers`, { q, type }, page);
  return pageMetadata({
    title:
      page > 1
        ? `Dealers in Sri Lanka — page ${page}`
        : 'Bike dealers and parts dealers in Sri Lanka',
    description: 'Browse approved bike showrooms and parts shops on ThrottleLK.',
    path,
  });
}

export default async function DealersIndexPage({
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
  const type = spStr(sp, 'type') === 'parts' ? 'parts' : 'bike';
  const page = parsePageParam(spStr(sp, 'page'));
  const apiPath =
    type === 'parts' ? '/api/v1/parts-dealers' : '/api/v1/dealers';
  const detailBase =
    type === 'parts'
      ? `/${locale}/parts-dealers`
      : `/${locale}/dealers`;
  const applyHref =
    type === 'parts'
      ? `/${locale}/parts-dealers/apply`
      : `/${locale}/dealers/apply`;
  const mapHref =
    type === 'parts'
      ? `/${locale}/parts-dealers/map`
      : `/${locale}/dealers/map`;

  const dealerPage = await apiGetWithMeta<Dealer[]>(apiPath, {
    searchParams: { q, page: String(page), limit: '20' },
  }).catch(() => ({ data: [] as Dealer[], meta: undefined }));

  const dealers = dealerPage.data;
  const pager = dealerPage.meta;

  if (pager && pager.total > 0 && pager.page > pager.totalPages) {
    redirect(
      hrefWithPage(`/${locale}/dealers`, { q, type }, pager.totalPages),
    );
  }

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      active
        ? 'bg-foreground text-white'
        : 'border border-black/15 bg-background hover:border-accent/40'
    }`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            id="dealer-results"
            className="font-[family-name:var(--font-display)] text-4xl tracking-wide"
          >
            {t(locale, 'dealersNav')}
          </h1>
          <p className="mt-2 text-muted">{t(locale, 'dealersHubSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={mapHref}
            className="inline-flex items-center justify-center rounded-full border border-black/15 bg-background px-5 py-2.5 text-sm font-medium transition hover:border-accent/40"
          >
            {t(locale, 'dealersMapView')}
          </Link>
          <Link
            href={applyHref}
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.75)] transition hover:brightness-110"
          >
            {type === 'parts'
              ? t(locale, 'becomePartsDealer')
              : t(locale, 'becomeDealer')}
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={hrefWithPage(`/${locale}/dealers`, { q, type: 'bike' }, 1)}
          className={tabClass(type === 'bike')}
        >
          {t(locale, 'bikeDealersTab')}
        </Link>
        <Link
          href={hrefWithPage(`/${locale}/dealers`, { q, type: 'parts' }, 1)}
          className={tabClass(type === 'parts')}
        >
          {t(locale, 'partsDealersTab')}
        </Link>
      </div>

      <form
        method="get"
        action={`/${locale}/dealers`}
        className="mt-8 flex flex-wrap gap-2"
      >
        <input type="hidden" name="type" value={type} />
        <input
          name="q"
          defaultValue={q}
          placeholder={t(locale, 'searchPlaceholder')}
          className="min-w-[220px] flex-1 bg-background px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-sm text-white"
        >
          {t(locale, 'search')}
        </button>
      </form>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dealers.length === 0 ? (
          <p className="text-muted">
            {type === 'parts'
              ? t(locale, 'noPartsDealersYet')
              : t(locale, 'noBikeDealersYet')}
          </p>
        ) : (
          dealers.map((dealer) => {
            const location = [dealer.city?.name, dealer.district?.name]
              .filter(Boolean)
              .join(', ');
            return (
              <Link
                key={dealer.id}
                href={`${detailBase}/${dealer.slug}`}
                className="overflow-hidden border border-black/10 bg-surface/40 hover:border-accent/40"
              >
                {dealer.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dealer.coverImageUrl}
                    alt={dealer.name}
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-background/50 text-sm text-muted">
                    No photo
                  </div>
                )}
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl">
                      {dealer.name}
                    </h2>
                    {dealer.verifiedAt ? (
                      <VerifiedDealerBadge locale={locale} />
                    ) : null}
                  </div>
                  {location ? (
                    <p className="mt-2 text-sm text-muted">{location}</p>
                  ) : null}
                  {dealer.address ? (
                    <p className="mt-1 text-sm text-muted">{dealer.address}</p>
                  ) : null}
                </div>
              </Link>
            );
          })
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
            hrefWithPage(`/${locale}/dealers`, { q, type }, next)
          }
        />
      ) : null}
    </main>
  );
}
