import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';
import { PartCard, type BrowsePartCard } from '@/components/part-card';
import { t, type Locale } from '@/lib/i18n';

export function HomeMarketplacePreview({
  locale,
  bikes,
  parts,
}: {
  locale: Locale;
  bikes: BrowseListingCard[];
  parts: BrowsePartCard[];
}) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl space-y-16 px-5 py-14 sm:px-6 sm:py-16 lg:px-8">
        <PreviewSection
          eyebrow={t(locale, 'homeLatestBikesEyebrow')}
          titleId="home-latest-bikes"
          title={t(locale, 'homeLatestBikesTitle')}
          subtitle={t(locale, 'homeLatestBikesSubtitle')}
          browseHref={`/${locale}/bikes`}
          browseLabel={t(locale, 'homeBrowseAllBikes')}
          empty={bikes.length === 0}
          emptyMessage={t(locale, 'homeNoBikesPreview')}
        >
          {bikes.map((listing) => (
            <li key={listing.id}>
              <ListingCard
                locale={locale}
                listing={listing}
                headingLevel="h3"
                showFavourite={false}
              />
            </li>
          ))}
        </PreviewSection>

        <PreviewSection
          eyebrow={t(locale, 'homeLatestPartsEyebrow')}
          titleId="home-latest-parts"
          title={t(locale, 'homeLatestPartsTitle')}
          subtitle={t(locale, 'homeLatestPartsSubtitle')}
          browseHref={`/${locale}/bike-parts`}
          browseLabel={t(locale, 'homeBrowseAllParts')}
          empty={parts.length === 0}
          emptyMessage={t(locale, 'homeNoPartsPreview')}
        >
          {parts.map((part) => (
            <li key={part.id}>
              <PartCard locale={locale} part={part} showFavourite={false} />
            </li>
          ))}
        </PreviewSection>
      </div>
    </div>
  );
}

function PreviewSection({
  eyebrow,
  titleId,
  title,
  subtitle,
  browseHref,
  browseLabel,
  empty,
  emptyMessage,
  children,
}: {
  eyebrow: string;
  titleId: string;
  title: string;
  subtitle: string;
  browseHref: string;
  browseLabel: string;
  empty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={titleId} data-reveal>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
            {eyebrow}
          </p>
          <h2
            id={titleId}
            className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
        </div>
        <Link
          href={browseHref}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#0a0a0a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent"
        >
          {browseLabel}
        </Link>
      </div>

      {empty ? (
        <p className="rounded-md border border-dashed border-black/15 bg-white px-4 py-10 text-sm text-muted">
          {emptyMessage}{' '}
          <Link
            href={browseHref}
            className="font-medium text-foreground underline decoration-black/20 underline-offset-4 transition hover:text-accent hover:decoration-accent"
          >
            {browseLabel}
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {children}
        </ul>
      )}
    </section>
  );
}
