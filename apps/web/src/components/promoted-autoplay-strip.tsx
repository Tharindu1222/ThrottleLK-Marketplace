'use client';

import Link from 'next/link';
import { MarketplaceImage } from '@/components/marketplace-image';
import type { BrowseListingCard } from '@/components/listing-card';
import type { BrowsePartCard } from '@/components/part-card';
import type { Locale } from '@/lib/i18n';
import { partListingBase } from '@/lib/part-kind';
import { composeListingTitle } from '@/lib/listing-title';
import { promoCardBadgeLabel } from '@/lib/promo-tier';

type StripCard = {
  id: string;
  href: string;
  title: string;
  price: string;
  imageUrl?: string | null;
  badge: string | null;
};

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-US')}`;
}

function partHref(locale: Locale, part: BrowsePartCard) {
  const base = partListingBase(part.kind);
  return `/${locale}/${base}/${part.slug}`;
}

function toCards(
  locale: Locale,
  bikes?: BrowseListingCard[],
  parts?: BrowsePartCard[],
): StripCard[] {
  if (bikes) {
    return bikes.map((listing) => ({
      id: listing.id,
      href: `/${locale}/bikes/${listing.slug}`,
      title: composeListingTitle({
        title: listing.title,
        brandName: listing.brandName,
        modelName: listing.modelName,
        manufactureYear: listing.manufactureYear,
      }),
      price: formatLkr(listing.priceLkr),
      imageUrl: listing.coverImageUrl,
      badge: promoCardBadgeLabel(locale, listing.tier, listing.isTop),
    }));
  }
  return (parts ?? []).map((part) => ({
    id: part.id,
    href: partHref(locale, part),
    title: part.title,
    price: formatLkr(part.priceLkr),
    imageUrl: part.coverImageUrl,
    badge: promoCardBadgeLabel(locale, part.tier, part.isTop),
  }));
}

function PromoChip({
  card,
  hidden,
}: {
  card: StripCard;
  hidden?: boolean;
}) {
  return (
    <li
      className="w-44 shrink-0 sm:w-48"
      aria-hidden={hidden || undefined}
    >
      <article className="w-full min-w-0 overflow-hidden border border-black/10 bg-white shadow-[0_1px_2px_rgba(15,15,15,0.06)] transition duration-200 hover:border-accent/40">
        <Link
          href={card.href}
          tabIndex={hidden ? -1 : undefined}
          className="block"
          aria-label={hidden ? undefined : card.title}
        >
          <div className="relative aspect-[5/3] w-full bg-surface">
            {card.imageUrl ? (
              <MarketplaceImage
                src={card.imageUrl}
                alt=""
                sizes="192px"
                className="h-full w-full object-cover"
                fallbackClassName="object-contain p-6 opacity-80 brightness-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[linear-gradient(160deg,#f0f0f0_0%,#fafafa_50%,#ececec_100%)]">
                <MarketplaceImage
                  src="/images/brand/throttlelk-logo.png"
                  alt=""
                  fill={false}
                  width={120}
                  height={32}
                  sizes="120px"
                  className="h-7 w-auto object-contain opacity-80 brightness-0"
                />
              </div>
            )}
            {card.badge ? (
              <span className="absolute top-2 right-2 rounded-sm bg-accent px-1.5 py-0.5 text-[9px] font-bold tracking-[0.12em] text-white uppercase">
                {card.badge}
              </span>
            ) : null}
          </div>
          <div className="min-w-0 px-2.5 py-2">
            <p className="truncate font-[family-name:var(--font-display)] text-sm leading-snug tracking-wide text-foreground">
              {card.title}
            </p>
            <p className="mt-0.5 truncate font-[family-name:var(--font-display)] text-sm leading-none tracking-wide text-accent">
              {card.price}
            </p>
          </div>
        </Link>
      </article>
    </li>
  );
}

export function PromotedCompactCards({
  locale,
  bikes,
  parts,
}: {
  locale: Locale;
  bikes?: BrowseListingCard[];
  parts?: BrowsePartCard[];
}) {
  const cards = toCards(locale, bikes, parts);
  if (cards.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-wrap gap-3">
      {cards.map((card) => (
        <PromoChip key={card.id} card={card} />
      ))}
    </ul>
  );
}

export function PromotedAutoplayStrip({
  locale,
  eyebrow,
  heading,
  bikes,
  parts,
}: {
  locale: Locale;
  eyebrow: string;
  heading: string;
  bikes?: BrowseListingCard[];
  parts?: BrowsePartCard[];
}) {
  const cards = toCards(locale, bikes, parts);

  if (cards.length === 0) return null;

  return (
    <section
      aria-labelledby="promoted-listings-heading"
      aria-roledescription="carousel"
      className="mb-8 w-full min-w-0 max-w-full border-b border-black/10 pb-6"
    >
      <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
            {eyebrow}
          </p>
          <h2
            id="promoted-listings-heading"
            className="mt-1 break-words font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl"
          >
            {heading}
          </h2>
        </div>
      </div>

      <ul className="mt-4 flex w-full min-w-0 gap-3 overflow-x-auto overscroll-x-contain pb-1">
        {cards.map((card) => (
          <PromoChip key={card.id} card={card} />
        ))}
      </ul>
    </section>
  );
}
