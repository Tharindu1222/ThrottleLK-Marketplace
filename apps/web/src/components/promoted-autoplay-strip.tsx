'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MarketplaceImage } from '@/components/marketplace-image';
import type { BrowseListingCard } from '@/components/listing-card';
import type { BrowsePartCard } from '@/components/part-card';
import { t, type Locale } from '@/lib/i18n';
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
  const base = part.kind === 'modified' ? 'modified-parts' : 'spare-parts';
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

function fillSequence(cards: StripCard[]) {
  if (cards.length === 0) return [];
  const minWidth = 1200;
  const slot = 192 + 12;
  const repeat = Math.max(1, Math.ceil(minWidth / (cards.length * slot)));
  return Array.from({ length: repeat }, () => cards).flat();
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
      <article className="overflow-hidden border border-black/10 bg-white shadow-[0_1px_2px_rgba(15,15,15,0.06)] transition duration-200 hover:border-accent/40">
        <Link
          href={card.href}
          tabIndex={hidden ? -1 : undefined}
          className="block"
          aria-label={hidden ? undefined : card.title}
        >
          <div className="relative aspect-[5/3] bg-surface">
            {card.imageUrl ? (
              <MarketplaceImage
                src={card.imageUrl}
                alt=""
                sizes="192px"
                className="object-cover"
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
          <div className="px-2.5 py-2">
            <p className="truncate font-[family-name:var(--font-display)] text-sm leading-snug tracking-wide text-foreground">
              {card.title}
            </p>
            <p className="mt-0.5 font-[family-name:var(--font-display)] text-sm leading-none tracking-wide text-accent">
              {card.price}
            </p>
          </div>
        </Link>
      </article>
    </li>
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
  const [reduced, setReduced] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (cards.length === 0) return null;

  const sequence = reduced ? cards : fillSequence(cards);
  const pauseLabel = userPaused
    ? t(locale, 'promoStripPlay')
    : t(locale, 'promoStripPause');
  const duration = `${Math.max(24, sequence.length * 5)}s`;

  return (
    <section
      aria-labelledby="promoted-listings-heading"
      aria-roledescription="carousel"
      className="mb-8 min-w-0 max-w-full border-b border-black/10 pb-6"
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
            {eyebrow}
          </p>
          <h2
            id="promoted-listings-heading"
            className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl"
          >
            {heading}
          </h2>
        </div>
        {reduced ? null : (
          <button
            type="button"
            onClick={() => setUserPaused((value) => !value)}
            className="mb-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-accent/40 hover:text-accent"
          >
            {userPaused ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                <path d="M8 5.5v13l11-6.5-11-6.5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
              </svg>
            )}
            {pauseLabel}
          </button>
        )}
      </div>

      <div className="promo-strip-scroller mt-4 w-full min-w-0 overflow-hidden">
        <div
          className="promo-strip-track flex w-max"
          data-paused={userPaused ? 'true' : 'false'}
          style={{ ['--promo-strip-duration' as string]: duration }}
        >
          <ul className="flex shrink-0 gap-3 pr-3">
            {sequence.map((card, index) => (
              <PromoChip
                key={`${card.id}-${index}`}
                card={card}
                hidden={!reduced && index >= cards.length}
              />
            ))}
          </ul>
          {reduced ? null : (
            <ul className="flex shrink-0 gap-3 pr-3" aria-hidden>
              {sequence.map((card, index) => (
                <PromoChip
                  key={`loop-${card.id}-${index}`}
                  card={card}
                  hidden
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
