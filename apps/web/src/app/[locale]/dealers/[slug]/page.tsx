import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Pagination } from '@/components/pagination';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { hrefWithPage, parsePageParam } from '@/lib/pagination';
import { pageMetadata } from '@/lib/seo';
import { BreadcrumbLabels } from '@/components/breadcrumbs';
import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';

type DealerImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isCover?: boolean;
};

type Dealer = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  coverImageUrl: string | null;
  images: DealerImage[];
  district?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const dealer = await apiGet<Dealer>(`/api/v1/dealers/${slug}`);
    return pageMetadata({
      title: `${dealer.name} — motorcycle dealer`,
      description:
        dealer.description?.slice(0, 160) ??
        `${dealer.name} showroom on ThrottleLK`,
      path: `/${locale}/dealers/${slug}`,
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

  let dealer: Dealer;
  try {
    dealer = await apiGet<Dealer>(`/api/v1/dealers/${slug}`);
  } catch {
    notFound();
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

  const photos = [...(dealer.images ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const location = [dealer.city?.name, dealer.district?.name]
    .filter(Boolean)
    .join(', ');

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <BreadcrumbLabels labels={{ [slug]: dealer.name }} />
      <p className="text-sm tracking-[0.25em] text-accent uppercase">Dealer</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl tracking-wide">
        {dealer.name}
      </h1>

      {photos.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className={`overflow-hidden border border-black/10 bg-surface/40 ${
                index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageUrl}
                alt={`${dealer.name} photo ${index + 1}`}
                className={`w-full object-cover ${
                  index === 0 ? 'aspect-[16/10] sm:h-full' : 'aspect-[4/3]'
                }`}
              />
            </div>
          ))}
        </div>
      ) : null}

      {dealer.description ? (
        <p className="mt-8 max-w-3xl text-lg leading-relaxed text-muted">
          {dealer.description}
        </p>
      ) : null}

      <section className="mt-8 grid gap-4 border border-black/10 bg-surface/40 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {location ? (
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">Location</p>
            <p className="mt-1">{location}</p>
          </div>
        ) : null}
        {dealer.address ? (
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">Address</p>
            <p className="mt-1">{dealer.address}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">Phone</p>
          <p className="mt-1">
            <a href={`tel:${dealer.phone}`} className="hover:text-accent">
              {dealer.phone}
            </a>
          </p>
        </div>
        {dealer.whatsapp ? (
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">WhatsApp</p>
            <p className="mt-1">
              <a
                href={`https://wa.me/${dealer.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent"
              >
                {dealer.whatsapp}
              </a>
            </p>
          </div>
        ) : null}
        {dealer.email ? (
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">Email</p>
            <p className="mt-1">
              <a href={`mailto:${dealer.email}`} className="hover:text-accent">
                {dealer.email}
              </a>
            </p>
          </div>
        ) : null}
        {dealer.website ? (
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">Website</p>
            <p className="mt-1">
              <a
                href={dealer.website}
                target="_blank"
                rel="noreferrer"
                className="break-all hover:text-accent"
              >
                {dealer.website.replace(/^https?:\/\//, '')}
              </a>
            </p>
          </div>
        ) : null}
      </section>

      <h2
        id="listing-results"
        className="mt-12 font-[family-name:var(--font-display)] text-2xl tracking-wide"
      >
        Inventory
      </h2>
      <div className="mt-6 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <p className="text-muted sm:col-span-2 lg:col-span-3">
            No active bikes in this showroom yet.
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
    </main>
  );
}
