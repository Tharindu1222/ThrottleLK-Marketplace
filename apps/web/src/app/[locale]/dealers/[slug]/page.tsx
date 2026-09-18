import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { BreadcrumbLabels } from '@/components/breadcrumbs';
import { DealerMapEmbed } from '@/components/dealer-map-embed';
import { DealerShareButton } from '@/components/dealer-share-button';
import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';
import { Pagination } from '@/components/pagination';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { hrefWithPage, parsePageParam } from '@/lib/pagination';
import { pageMetadata } from '@/lib/seo';

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
  latitude: number | null;
  longitude: number | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  ownerAvatarUrl: string | null;
  ownerDisplayName: string | null;
  createdAt?: string;
  verifiedAt?: string | null;
  images: DealerImage[];
  district?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
};

function Icon({
  children,
  className = 'text-accent',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`h-[18px] w-[18px] shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const dealer = await apiGet<Dealer>(`/api/v1/dealers/${slug}`);
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

  let dealer: Dealer;
  try {
    dealer = await apiGet<Dealer>(`/api/v1/dealers/${slug}`);
  } catch {
    notFound();
  }

  // Canonical URL follows the showroom name (API may have just resynced the slug).
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

  const cover =
    dealer.coverImageUrl ??
    [...(dealer.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0]
      ?.imageUrl ??
    null;
  const location = [dealer.city?.name, dealer.district?.name]
    .filter(Boolean)
    .join(', ');
  const waDigits = dealer.whatsapp?.replace(/\D/g, '') ?? '';
  const initials = (dealer.ownerDisplayName || dealer.name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const infoItems: {
    key: string;
    label: string;
    icon: ReactNode;
    content: ReactNode;
  }[] = [];

  if (location) {
    infoItems.push({
      key: 'location',
      label: t(locale, 'location'),
      icon: (
        <Icon>
          <path
            d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.8 12 21 12 21Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="10.5"
            r="2.2"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </Icon>
      ),
      content: location,
    });
  }
  if (dealer.address) {
    infoItems.push({
      key: 'address',
      label: t(locale, 'addressLabel'),
      icon: (
        <Icon>
          <path
            d="M4.5 9.5 12 4l7.5 5.5V19a1 1 0 0 1-1 1h-4.5v-5h-4v5H5.5a1 1 0 0 1-1-1V9.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </Icon>
      ),
      content: dealer.address,
    });
  }

  const contactLinks: {
    key: string;
    href: string;
    label: string;
    value: string;
    external?: boolean;
    icon: ReactNode;
  }[] = [];

  if (dealer.email) {
    contactLinks.push({
      key: 'email',
      href: `mailto:${dealer.email}`,
      label: t(locale, 'email'),
      value: dealer.email,
      icon: (
        <Icon>
          <rect
            x="3.5"
            y="6"
            width="17"
            height="12"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="m4.5 7.5 7.5 6 7.5-6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Icon>
      ),
    });
  }
  if (dealer.website) {
    contactLinks.push({
      key: 'website',
      href: dealer.website,
      label: t(locale, 'websiteUrl'),
      value: dealer.website.replace(/^https?:\/\//, ''),
      external: true,
      icon: (
        <Icon>
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M4.5 12h15M12 4.5c2.2 2.4 3.3 4.9 3.3 7.5S14.2 17.1 12 19.5C9.8 17.1 8.7 14.6 8.7 12S9.8 6.9 12 4.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </Icon>
      ),
    });
  }
  if (dealer.facebookUrl) {
    contactLinks.push({
      key: 'facebook',
      href: dealer.facebookUrl,
      label: t(locale, 'socialFacebook'),
      value: t(locale, 'visitFacebook'),
      external: true,
      icon: (
        <Icon>
          <path
            d="M14 8.5h2.5V5.8H14c-2.1 0-3.5 1.3-3.5 3.5V11H8.5v2.7H10.5V19H13.5v-5.3H16l.5-2.7h-3V9.4c0-.5.3-.9.9-.9Z"
            fill="currentColor"
            stroke="none"
          />
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </Icon>
      ),
    });
  }
  if (dealer.tiktokUrl) {
    contactLinks.push({
      key: 'tiktok',
      href: dealer.tiktokUrl,
      label: t(locale, 'socialTiktok'),
      value: t(locale, 'visitTiktok'),
      external: true,
      icon: (
        <Icon>
          <path
            d="M14 5.5c.6 1.8 2 3.1 3.8 3.5v2.4c-1.3-.1-2.5-.6-3.5-1.4v5.3a4.7 4.7 0 1 1-4.7-4.7c.3 0 .5 0 .8.1v2.5a2.2 2.2 0 1 0 1.5 2.1V5.5H14Z"
            fill="currentColor"
            stroke="none"
          />
        </Icon>
      ),
    });
  }

  const hasMap = dealer.latitude != null && dealer.longitude != null;
  const hasDetails = infoItems.length > 0 || contactLinks.length > 0;
  const bikeTotal = pager?.total ?? listings.length;
  const memberYear = dealer.createdAt
    ? new Date(dealer.createdAt).getFullYear()
    : null;
  const directionsHref = hasMap
    ? `https://www.google.com/maps/dir/?api=1&destination=${dealer.latitude},${dealer.longitude}`
    : dealer.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [dealer.address, location].filter(Boolean).join(', '),
        )}`
      : location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
        : null;
  const bikeLabel =
    bikeTotal === 1
      ? t(locale, 'resultCountOne')
      : t(locale, 'resultCount').replace('{count}', String(bikeTotal));
  const linkFocus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2';
  const chip =
    'inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-3.5 text-sm font-medium text-foreground shadow-[0_1px_2px_rgba(15,15,15,0.06),0_4px_14px_-4px_rgba(15,15,15,0.18)] ring-1 ring-black/[0.04] transition hover:text-accent';
  const chipAction = `${chip} ${linkFocus}`;
  const chipPrimary =
    'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-[0_2px_4px_rgba(15,15,15,0.12),0_8px_20px_-6px_rgba(225,6,0,0.45)] transition';
  const chipWhatsapp =
    'inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white shadow-[0_2px_4px_rgba(15,15,15,0.1),0_8px_20px_-6px_rgba(37,211,102,0.5)] transition hover:bg-[#1ebe57]';

  return (
    <main className="bg-[#f7f8f9]">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <BreadcrumbLabels labels={{ [slug]: dealer.name }} />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <article className="mt-4 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04),0_20px_48px_-28px_rgba(15,15,15,0.35)] ring-1 ring-black/[0.06]">
          {/* Cover */}
          <div className="relative isolate h-[160px] bg-zinc-200 sm:h-[220px] lg:h-[260px]">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(145deg,#111_0%,#333_50%,#e10600_160%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
          </div>

          {/* Identity strip + contact */}
          <div className="relative px-5 pb-5 sm:px-8 sm:pb-6">
            <div className="-mt-11 flex items-end gap-4 sm:-mt-12 sm:gap-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-[3px] ring-white shadow-[0_10px_28px_-12px_rgba(0,0,0,0.4)] sm:h-28 sm:w-28">
                {dealer.ownerAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dealer.ownerAvatarUrl}
                    alt={dealer.ownerDisplayName || dealer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-foreground font-[family-name:var(--font-display)] text-xl tracking-wide text-white sm:text-2xl">
                    {initials || '?'}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <p className="text-[11px] font-medium tracking-[0.28em] text-accent uppercase">
                  {t(locale, 'sellerDealer')}
                </p>
                <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-2xl leading-tight tracking-wide text-foreground sm:text-3xl lg:text-4xl">
                  {dealer.name}
                </h1>
              </div>
            </div>

            {dealer.description ? (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted line-clamp-3">
                {dealer.description}
              </p>
            ) : null}

            {/* One unified meta + action strip */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-2xl bg-white p-1">
              {location ? (
                <span className={chip}>
                  <span className="text-accent" aria-hidden>
                    <Icon>
                      <path
                        d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.8 12 21 12 21Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="10.5"
                        r="2.2"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                    </Icon>
                  </span>
                  {location}
                </span>
              ) : null}
              <span className={chip}>{bikeLabel}</span>
              {memberYear ? (
                <span className={chip}>
                  {t(locale, 'memberSince').replace(
                    '{year}',
                    String(memberYear),
                  )}
                </span>
              ) : null}

              <a
                href={`tel:${dealer.phone}`}
                aria-label={`${t(locale, 'phoneLabel')}: ${dealer.phone}`}
                className={`${chipPrimary} bg-accent hover:bg-accent/90 ${linkFocus}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="h-4 w-4"
                >
                  <path
                    d="M6.5 4.5h3l1.2 3.2-1.6 1.1a12 12 0 0 0 5.1 5.1l1.1-1.6 3.2 1.2v3A1.5 1.5 0 0 1 17 18 13.5 13.5 0 0 1 3.5 4.5 1.5 1.5 0 0 1 5 3h1.5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
                {dealer.phone}
              </a>
              {dealer.whatsapp ? (
                <a
                  href={`https://wa.me/${waDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${t(locale, 'whatsapp')}: ${dealer.whatsapp}`}
                  className={`${chipWhatsapp} ${linkFocus}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                    className="h-4 w-4"
                  >
                    <path d="M12.04 2.5A9.5 9.5 0 0 0 3.4 16.3L2.5 21.5l5.3-.9A9.5 9.5 0 1 0 12.04 2.5Zm5.5 13.5c-.23.65-1.33 1.2-1.85 1.28-.47.07-1.07.1-1.73-.11-.4-.12-.91-.3-1.57-.59-2.76-1.2-4.56-3.98-4.7-4.16-.13-.18-1.1-1.46-1.1-2.79 0-1.32.69-1.97.94-2.24.25-.27.54-.34.72-.34h.52c.17 0 .4-.06.62.47.23.55.77 1.9.84 2.03.07.14.12.3 0 .48-.1.18-.16.3-.32.46-.16.16-.33.35-.48.47-.16.13-.33.28-.14.55.18.27.82 1.35 1.76 2.18 1.21 1.07 2.23 1.4 2.54 1.56.32.16.5.13.69-.08.18-.2.79-.92 1-.1.23.24.23 1.37.02 1.66Z" />
                  </svg>
                  {dealer.whatsapp}
                </a>
              ) : null}

              <DealerShareButton
                label={t(locale, 'shareShowroom')}
                copiedLabel={t(locale, 'linkCopied')}
                title={dealer.name}
                className={chipAction}
              />
              {directionsHref ? (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className={chipAction}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="h-4 w-4 text-accent"
                  >
                    <path
                      d="M12 3.5 19.5 12 12 20.5 4.5 12 12 3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 8v4.5l3 1.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t(locale, 'getDirections')}
                </a>
              ) : null}
            </div>
          </div>

          {/* Details left + map right */}
          {hasDetails || hasMap ? (
            <section className="border-t border-black/[0.05]">
              <div
                className={`grid items-stretch ${hasMap ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]' : ''}`}
              >
                {hasDetails ? (
                  <div className="flex flex-col gap-4 px-5 py-4 sm:px-8 sm:py-5">
                    {infoItems.length > 0 ? (
                      <ul className="divide-y divide-black/[0.05]">
                        {infoItems.map((item) => (
                          <li
                            key={item.key}
                            className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                          >
                            <span className="mt-0.5 text-accent">
                              {item.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] tracking-[0.14em] text-muted uppercase">
                                {item.label}
                              </p>
                              <div className="mt-0.5 text-[15px] leading-snug text-foreground">
                                {item.content}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {contactLinks.length > 0 ? (
                      <ul className="flex flex-col gap-2.5">
                        {contactLinks.map((link) => (
                          <li key={link.key}>
                            <a
                              href={link.href}
                              {...(link.external
                                ? { target: '_blank', rel: 'noreferrer' }
                                : {})}
                              className={`group flex min-h-12 items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,15,15,0.06),0_6px_16px_-6px_rgba(15,15,15,0.2)] ring-1 ring-black/[0.05] transition hover:ring-accent/30 hover:shadow-[0_4px_16px_-6px_rgba(225,6,0,0.35)] motion-safe:hover:-translate-y-0.5 ${linkFocus}`}
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                                {link.icon}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[11px] tracking-[0.14em] text-muted uppercase">
                                  {link.label}
                                </span>
                                <span className="mt-0.5 block truncate text-[15px] font-medium text-foreground underline-offset-2 group-hover:text-accent group-hover:underline">
                                  {link.value}
                                </span>
                              </span>
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition group-hover:bg-accent/10 group-hover:text-accent"
                                aria-hidden
                              >
                                {link.external ? (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-4 w-4"
                                  >
                                    <path
                                      d="M10 6H6.5A1.5 1.5 0 0 0 5 7.5v10A1.5 1.5 0 0 0 6.5 19h10a1.5 1.5 0 0 0 1.5-1.5V14M14 5h5v5M12 12 19 5"
                                      stroke="currentColor"
                                      strokeWidth="1.7"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-4 w-4"
                                  >
                                    <path
                                      d="m9 6 6 6-6 6"
                                      stroke="currentColor"
                                      strokeWidth="1.7"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                {hasMap ? (
                  <div className="relative min-h-[14rem] border-t border-black/[0.05] lg:min-h-[16rem] lg:border-t-0 lg:border-l lg:border-black/[0.05]">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${dealer.latitude}&mlon=${dealer.longitude}#map=16/${dealer.latitude}/${dealer.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`absolute top-3 right-3 z-[1] rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium text-accent shadow-sm underline-offset-2 hover:underline ${linkFocus}`}
                    >
                      {t(locale, 'openInMaps')}
                    </a>
                    <DealerMapEmbed
                      latitude={dealer.latitude!}
                      longitude={dealer.longitude!}
                      className="absolute inset-0 h-full min-h-[14rem] w-full border-0 bg-zinc-100"
                    />
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </article>

        <section className="mt-12">
          <p className="text-[11px] tracking-[0.22em] text-muted uppercase">
            {t(locale, 'sellerDealer')}
          </p>
          <h2
            id="listing-results"
            className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl"
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
        </section>
      </div>
    </main>
  );
}
