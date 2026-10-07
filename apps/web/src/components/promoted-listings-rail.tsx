import type { BrowseListingCard } from '@/components/listing-card';
import type { BrowsePartCard } from '@/components/part-card';
import {
  PromotedAutoplayStrip,
  PromotedCompactCards,
} from '@/components/promoted-autoplay-strip';
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
  categoryId,
  partKind,
}: {
  locale: Locale;
  surface: PromotedSurface;
  kind: PromotedKind;
  limit?: number;
  /** Current listing/part id — API does not exclude it. */
  excludeId?: string;
  /** browse = scrolling strip; detail = small static cards */
  variant?: 'browse' | 'detail';
  /** Bike category page — only promote ads in this category. */
  categoryId?: string;
  /** Spare, modified, or accessory browse tab. */
  partKind?: string;
}) {
  const cards =
    kind === 'bike'
      ? await apiGet<PromotedBikeCard[]>('/api/v1/promotions/live', {
          searchParams: {
            surface,
            kind: 'bike',
            limit: String(limit),
            ...(categoryId ? { categoryId } : {}),
          },
        }).catch(() => [] as PromotedBikeCard[])
      : await apiGet<PromotedPartCard[]>('/api/v1/promotions/live', {
          searchParams: {
            surface,
            kind: 'part',
            limit: String(limit),
            ...(partKind ? { partKind } : {}),
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

  return (
    <section
      aria-labelledby="promoted-listings-heading"
      className="mt-14 border-t border-black/10 pt-10"
    >
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
        {t(
          locale,
          kind === 'part' ? 'homeLatestPartsEyebrow' : 'homeLatestBikesEyebrow',
        )}
      </p>
      <h2
        id="promoted-listings-heading"
        className="mt-1 break-words font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl"
      >
        {t(locale, 'promotedSection')}
      </h2>
      <PromotedCompactCards
        locale={locale}
        bikes={kind === 'bike' ? (items as PromotedBikeCard[]) : undefined}
        parts={kind === 'part' ? (items as PromotedPartCard[]) : undefined}
      />
    </section>
  );
}
