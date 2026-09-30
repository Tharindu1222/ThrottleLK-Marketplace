import {
  ListingCard,
  type BrowseListingCard,
} from '@/components/listing-card';
import { PartCard, type BrowsePartCard } from '@/components/part-card';
import { PromotedAutoplayStrip } from '@/components/promoted-autoplay-strip';
import { apiGet } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';

export type PromotedSurface = 'browse' | 'detail';
export type PromotedKind = 'bike' | 'part';

type PromotedBikeCard = BrowseListingCard;
type PromotedPartCard = BrowsePartCard;

export async function PromotedListingsRail({
  locale,
  surface,
  kind,
  limit = 8,
  excludeId,
  variant = 'browse',
}: {
  locale: Locale;
  surface: PromotedSurface;
  kind: PromotedKind;
  limit?: number;
  /** Current listing/part id — API does not exclude it. */
  excludeId?: string;
  /** browse = compact autoplay strip; detail = card grid */
  variant?: 'browse' | 'detail';
}) {
  const cards =
    kind === 'bike'
      ? await apiGet<PromotedBikeCard[]>('/api/v1/promotions/live', {
          searchParams: {
            surface,
            kind: 'bike',
            limit: String(limit),
          },
        }).catch(() => [] as PromotedBikeCard[])
      : await apiGet<PromotedPartCard[]>('/api/v1/promotions/live', {
          searchParams: {
            surface,
            kind: 'part',
            limit: String(limit),
          },
        }).catch(() => [] as PromotedPartCard[]);

  const items = excludeId
    ? cards.filter((card) => card.id !== excludeId)
    : cards;

  if (items.length === 0) return null;

  if (variant === 'browse') {
    return (
      <PromotedAutoplayStrip
        locale={locale}
        eyebrow={t(
          locale,
          kind === 'part' ? 'homeLatestPartsEyebrow' : 'homeLatestBikesEyebrow',
        )}
        heading={t(locale, 'promotedSection')}
        bikes={kind === 'bike' ? (items as PromotedBikeCard[]) : undefined}
        parts={kind === 'part' ? (items as PromotedPartCard[]) : undefined}
      />
    );
  }

  const gridClass = 'mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4';
  const sectionClass = 'mt-14 border-t border-black/10 pt-10';

  return (
    <section
      aria-labelledby="promoted-listings-heading"
      className={sectionClass}
    >
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
        {t(locale, 'homeLatestBikesEyebrow')}
      </p>
      <h2
        id="promoted-listings-heading"
        className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl"
      >
        {t(locale, 'promotedSection')}
      </h2>
      <ul className={gridClass}>
        {kind === 'bike'
          ? (items as PromotedBikeCard[]).map((listing) => (
              <li key={listing.id}>
                <ListingCard
                  locale={locale}
                  listing={listing}
                  headingLevel="h3"
                  showFavourite={false}
                />
              </li>
            ))
          : (items as PromotedPartCard[]).map((part) => (
              <li key={part.id}>
                <PartCard
                  locale={locale}
                  part={part}
                  showFavourite={false}
                />
              </li>
            ))}
      </ul>
    </section>
  );
}
