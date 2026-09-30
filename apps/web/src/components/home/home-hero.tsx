import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { pickPopularHomeBrands } from '@/lib/home-shop';
import { HomeHeroRail } from './home-hero-rail';
import { HomeHeroSearch } from './home-hero-search';
import { HomeHeroShowcase } from './home-hero-showcase';
import { homeHeroHeadingClass, homeHeroSectionClass, homeHeroSupportClass } from './home-hero-layout';

export type HomeHeroDistrict = { id: string; name: string };
export type HomeHeroBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
};
export function HomeHero({
  locale,
  districts,
  brands,
}: {
  locale: Locale;
  districts: HomeHeroDistrict[];
  brands: HomeHeroBrand[];
}) {
  const popular = pickPopularHomeBrands(brands);

  return (
    <section className={`${homeHeroSectionClass()} min-w-0 max-w-full max-lg:min-h-[calc(100svh-4.25rem)]`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 58% 62% at 68% 38%, rgba(225,6,0,0.58) 0%, rgba(120,10,8,0.2) 40%, transparent 68%), radial-gradient(ellipse 40% 36% at 18% 12%, rgba(255,255,255,0.05) 0%, transparent 58%), linear-gradient(180deg, #141010 0%, #090909 62%, #111 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage:
            'radial-gradient(ellipse 58% 52% at 64% 42%, black 10%, transparent 72%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-b from-transparent to-[#0d0d0d]"
      />
      </div>

      <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-[1360px] gap-6 px-5 pt-8 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-x-8 lg:gap-y-6 lg:px-10 lg:pt-10 lg:pb-12 xl:px-12">
        <div className="relative z-20 order-1 flex min-w-0 w-full flex-col justify-center">
            <p className="flex w-full min-w-0 max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs font-semibold tracking-[0.16em] text-white/65 uppercase lg:justify-start lg:text-left">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                {t(locale, 'tagline')}
              </span>
            </p>
            <h1 className={homeHeroHeadingClass(locale)}>
              <span className="inline lg:block">{t(locale, 'homeHeroLine1')}</span>{' '}
              <span className="text-accent">{t(locale, 'homeHeroAccent')}</span>
            </h1>
            <p className={homeHeroSupportClass()}>
              {t(locale, 'support')}
            </p>
          </div>
          <div className="order-3 min-w-0 max-w-full lg:order-2">
            <HomeHeroShowcase locale={locale} />
          </div>

        <HomeHeroSearch locale={locale} districts={districts} />

        <HomeHeroRail locale={locale} popular={popular} />
      </div>
    </section>
  );
}

