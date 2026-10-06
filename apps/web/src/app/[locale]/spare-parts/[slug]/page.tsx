import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { BreadcrumbLabels } from '@/components/breadcrumbs';
import { ListingDescription } from '@/components/listing-description';
import { ListingGallery } from '@/components/listing-gallery';
import { VerifiedDealerBadge } from '@/components/verified-dealer-badge';
import { LocationPinIcon } from '@/components/listing-spec-sheet';
import { PartViewTracker } from '@/components/part-view-tracker';
import { PromotedListingsRail } from '@/components/promoted-listings-rail';
import { apiGet } from '@/lib/api';
import { readAccessCookie } from '@/lib/session-cookie';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { PartContactBar } from '@/components/part-contact-bar';
import { PartAccessoriesRail } from '@/components/part-accessories-rail';
import { ReportListing } from '@/components/report-listing';

type PartDetail = {
  id: string;
  slug: string;
  kind: 'spare' | 'modified' | string;
  title: string;
  description: string;
  priceLkr: number;
  negotiable?: boolean;
  condition: string;
  phone: string | null;
  whatsapp: string | null;
  categoryName?: string | null;
  districtName?: string | null;
  cityName?: string | null;
  dealerVerified?: boolean;
  coverImageUrl?: string | null;
  images?: { id: string; imageUrl: string; isCover: boolean }[];
  partsDealer?: {
    id: string;
    name: string;
    slug: string;
    verifiedAt?: string | null;
  } | null;
  fitments?: Array<{
    brandId?: string | null;
    modelId?: string | null;
    brandName?: string | null;
    modelName?: string | null;
  }>;
};

async function viewerToken() {
  const raw = readAccessCookie(await cookies());
  return raw ? decodeURIComponent(raw) : undefined;
}

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const part = await apiGet<PartDetail>(`/api/v1/spare-parts/${slug}`, {
      token: await viewerToken(),
    });
    return pageMetadata({
      title: `${part.title} — Rs. ${part.priceLkr.toLocaleString('en-LK')}`,
      description: part.description.slice(0, 160),
      path: `/${locale}/spare-parts/${part.slug || slug}`,
    });
  } catch {
    return { title: 'Part not found' };
  }
}

export default async function SparePartDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  let part: PartDetail;
  try {
    part = await apiGet<PartDetail>(`/api/v1/spare-parts/${slug}`, {
      token: await viewerToken(),
    });
  } catch {
    notFound();
  }

  if (part.slug && part.slug !== slug) {
    redirect(`/${locale}/spare-parts/${part.slug}`);
  }

  const location = [part.cityName, part.districtName].filter(Boolean).join(', ');
  const fitmentLabel = (part.fitments ?? [])
    .map((f) => [f.brandName, f.modelName].filter(Boolean).join(' '))
    .filter(Boolean)
    .slice(0, 6)
    .join(' · ');
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 pt-8 pb-[calc(2rem+var(--compare-tray-offset,0px))] sm:px-8 lg:px-10 lg:pb-8">
      <BreadcrumbLabels labels={{ [slug]: part.title }} />
      <PartViewTracker partListingId={part.id} />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start lg:gap-x-10">
        <header className="min-w-0 space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex border border-accent/25 bg-accent/5 px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] text-accent uppercase">
              {t(locale, 'sparePartBadge')}
            </span>
            <span className="inline-flex border border-black/12 bg-white px-2.5 py-1 text-[11px] font-medium tracking-[0.14em] text-foreground/80 uppercase">
              {part.condition}
            </span>
            {part.dealerVerified ? (
              <VerifiedDealerBadge locale={locale} />
            ) : null}
          </div>
          <h1 className="break-words font-[family-name:var(--font-display)] text-3xl leading-[0.95] tracking-tight text-foreground sm:text-4xl">
            {part.title}
          </h1>
          <p className="flex min-w-0 flex-col gap-1 font-[family-name:var(--font-display)] text-3xl tracking-wide text-accent sm:block">
            <span className="break-words">{formatLkr(part.priceLkr)}</span>
            {part.negotiable ? (
              <span className="break-words font-sans text-sm font-normal tracking-normal text-muted sm:ml-2 sm:align-middle">
                · {t(locale, 'negotiable')}
              </span>
            ) : null}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
            {location ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 break-words">
                <LocationPinIcon />
                {location}
              </span>
            ) : null}
            {part.categoryName ? <span>{part.categoryName}</span> : null}
            {part.partsDealer ? (
              <span>
                {t(locale, 'seller')}:{' '}
                <Link
                  href={`/${locale}/parts-dealers/${part.partsDealer.slug}`}
                  className="font-medium text-accent transition hover:underline"
                >
                  {part.partsDealer.name}
                </Link>
              </span>
            ) : null}
          </div>
        </header>

        <ListingGallery
          locale={locale}
          title={part.title}
          coverImageUrl={part.coverImageUrl}
          images={(part.images ?? []).map((img) => ({
            ...img,
            isCover: Boolean(img.isCover),
          }))}
        />

        <div className="min-w-0 space-y-6">
          <PartContactBar
            locale={locale}
            partId={part.id}
            partSlug={part.slug}
            partKind={part.kind}
            title={part.title}
            phone={part.phone}
            whatsapp={part.whatsapp}
            sellerName={part.partsDealer?.name ?? 'Seller'}
          />

          {fitmentLabel ? (
            <section className="space-y-2 rounded-xl border border-black/10 bg-white p-4 sm:p-5">
              <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide">
                Fitment
              </h2>
              <p className="min-w-0 break-words text-sm text-muted">{fitmentLabel}</p>
            </section>
          ) : null}
        </div>

        <section className="min-w-0 space-y-3 border-t border-black/10 pt-8 lg:col-start-1 lg:border-t-0 lg:pt-0">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground">
            {t(locale, 'description')}
          </h2>
          <ListingDescription locale={locale} text={part.description} />
          <ReportListing locale={locale} partListingId={part.id} />
        </section>
      </div>

      <PromotedListingsRail
        locale={locale}
        surface="detail"
        kind="part"
        limit={4}
        excludeId={part.id}
        variant="detail"
      />
      <PartAccessoriesRail
        locale={locale}
        excludeId={part.id}
        brandId={part.fitments?.[0]?.brandId}
        modelId={part.fitments?.[0]?.modelId}
      />
    </main>
  );
}
