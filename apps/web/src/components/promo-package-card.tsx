'use client';

import { t, type Locale } from '@/lib/i18n';

export type PromoTier = 'boost' | 'featured' | 'premium';
export type PromoSurface = 'home' | 'browse' | 'detail';

export type PromoPackageCardData = {
  id: string;
  name: string;
  durationDays: number;
  priceLkr: number;
  tier?: PromoTier;
  surfaces?: PromoSurface[];
};

const ALL_SURFACES: PromoSurface[] = ['home', 'browse', 'detail'];

const SURFACE_I18N: Record<
  PromoSurface,
  'promoSurfaceHome' | 'promoSurfaceBrowse' | 'promoSurfaceDetail'
> = {
  home: 'promoSurfaceHome',
  browse: 'promoSurfaceBrowse',
  detail: 'promoSurfaceDetail',
};

const TIER_I18N: Record<
  PromoTier,
  'promoTierBoost' | 'promoTierFeatured' | 'promoTierPremium'
> = {
  boost: 'promoTierBoost',
  featured: 'promoTierFeatured',
  premium: 'promoTierPremium',
};

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

const TIER_SURFACE_DEFAULTS: Record<PromoTier, PromoSurface[]> = {
  boost: ['browse', 'detail'],
  featured: ['home', 'browse', 'detail'],
  premium: ['home', 'browse', 'detail'],
};

function TierIllustration({
  tier,
  inverted,
}: {
  tier: PromoTier;
  inverted: boolean;
}) {
  if (tier === 'boost') {
    return (
      <svg
        viewBox="0 0 80 80"
        className="h-16 w-16"
        aria-hidden="true"
        fill="none"
      >
        <circle
          cx="40"
          cy="40"
          r="28"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.25"
        />
        <path
          d="M22 48c4-10 10-16 18-16s14 6 18 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="28" cy="50" r="6" stroke="currentColor" strokeWidth="2" />
        <circle cx="52" cy="50" r="6" stroke="currentColor" strokeWidth="2" />
        <path
          d="M34 50h12M40 34v8M36 38h8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M58 22c4 2 7 5 9 9M62 18c6 3 10 8 12 14"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    );
  }

  if (tier === 'featured') {
    return (
      <svg
        viewBox="0 0 80 80"
        className="h-16 w-16"
        aria-hidden="true"
        fill="none"
      >
        <path
          d="M40 12v8M28 18l4 6M52 18l-4 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M22 50c4-12 11-18 18-18s14 6 18 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="28" cy="52" r="6.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="52" cy="52" r="6.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M34.5 52h11M40 32v12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="40"
          cy="28"
          r="3"
          fill={inverted ? 'currentColor' : 'var(--accent)'}
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 80 80"
      className="h-16 w-16"
      aria-hidden="true"
      fill="none"
    >
      <circle
        cx="40"
        cy="40"
        r="30"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.2"
      />
      <circle
        cx="40"
        cy="40"
        r="22"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.35"
      />
      <path
        d="M22 50c4-11 11-17 18-17s14 6 18 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="28" cy="52" r="6.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="52" cy="52" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M34.5 52h11M40 33v11M36 37h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M40 14l2.2 4.4 4.8.7-3.5 3.4.8 4.8L40 25.2l-4.3 2.1.8-4.8-3.5-3.4 4.8-.7L40 14z"
        fill={inverted ? 'currentColor' : 'var(--accent)'}
        opacity={inverted ? 0.95 : 1}
      />
    </svg>
  );
}

export function PromoPackageCard({
  locale,
  pkg,
  selected,
  onSelect,
}: {
  locale: Locale;
  pkg: PromoPackageCardData;
  selected: boolean;
  onSelect: () => void;
}) {
  const tier = pkg.tier ?? 'featured';
  const isPopular = tier === 'featured';
  const included = new Set(
    pkg.surfaces?.length ? pkg.surfaces : TIER_SURFACE_DEFAULTS[tier],
  );

  const ctaLabel = selected
    ? t(locale, 'promoSelected')
    : t(locale, 'promoSelectPlan');

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl px-5 pb-5 pt-6 transition ${
        isPopular
          ? 'bg-accent text-white ring-1 ring-accent md:-translate-y-2 md:pb-6 md:pt-8'
          : selected
            ? 'bg-white text-foreground ring-2 ring-accent'
            : 'bg-white text-foreground ring-1 ring-black/[0.06] hover:ring-black/15'
      }`}
    >
      {isPopular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-md bg-[#0a0a0a] px-3 py-1 text-[11px] font-semibold tracking-wide text-white whitespace-nowrap">
          {t(locale, 'promoMostPopular')}
        </span>
      ) : null}

      <div className="flex flex-1 flex-col">
        <h3
          className={`text-center text-2xl font-bold tracking-tight ${
            isPopular ? 'text-white' : 'text-foreground'
          }`}
        >
          {t(locale, TIER_I18N[tier])}
        </h3>

        <div
          className={`mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full ${
            isPopular ? 'bg-white/15 text-white' : 'bg-black/[0.04] text-foreground'
          }`}
        >
          <TierIllustration tier={tier} inverted={isPopular} />
        </div>

        <div className="mt-5 text-center">
          <p
            className={`text-[11px] font-medium uppercase tracking-[0.14em] ${
              isPopular ? 'text-white/70' : 'text-muted'
            }`}
          >
            {pkg.name}
          </p>
          <p
            className={`mt-1 text-3xl font-bold tracking-tight sm:text-4xl ${
              isPopular ? 'text-white' : 'text-foreground'
            }`}
          >
            {formatLkr(pkg.priceLkr)}
          </p>
          <p
            className={`mt-1 text-sm ${
              isPopular ? 'text-white/80' : 'text-muted'
            }`}
          >
            {t(locale, 'promoteDays').replace(
              '{n}',
              String(pkg.durationDays),
            )}
          </p>
        </div>

        <ul className="mt-6 flex-1 space-y-2.5 text-sm">
          {ALL_SURFACES.map((surface) => {
            const on = included.has(surface);
            return (
              <li
                key={surface}
                className={`flex items-center gap-2 ${
                  on
                    ? isPopular
                      ? 'text-white'
                      : 'text-foreground'
                    : isPopular
                      ? 'text-white/40 line-through'
                      : 'text-muted/60 line-through'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                    on
                      ? isPopular
                        ? 'bg-white/20 text-white'
                        : 'bg-accent/10 text-accent'
                      : isPopular
                        ? 'bg-white/10 text-white/40'
                        : 'bg-black/5 text-muted/50'
                  }`}
                  aria-hidden="true"
                >
                  {on ? '✓' : '–'}
                </span>
                <span>{t(locale, SURFACE_I18N[surface])}</span>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onSelect}
          className={`mt-6 w-full rounded-md px-4 py-2.5 text-sm font-semibold transition ${
            isPopular
              ? 'bg-white text-[#0a0a0a] hover:bg-white/90'
              : selected
                ? 'bg-accent text-white hover:brightness-110'
                : 'bg-[#0a0a0a] text-white hover:bg-accent'
          }`}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
