import { t, type Locale } from '@/lib/i18n';

export type PromoTier = 'boost' | 'featured' | 'premium';

export function isPromoTier(value: unknown): value is PromoTier {
  return value === 'boost' || value === 'featured' || value === 'premium';
}

/** Prefer tier label when present; otherwise fall back to Top for isTop cards. */
export function promoCardBadgeLabel(
  locale: Locale,
  tier?: PromoTier | string | null,
  isTop?: boolean,
): string | null {
  if (isPromoTier(tier)) {
    switch (tier) {
      case 'boost':
        return t(locale, 'promotedBadgeBoost');
      case 'featured':
        return t(locale, 'promotedBadgeFeatured');
      case 'premium':
        return t(locale, 'promotedBadgePremium');
    }
  }
  if (isTop) return t(locale, 'homeTopBadge');
  return null;
}
