import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { pickPopularHomeBrands } from '@/lib/home-shop';
import { HomeHeroRail } from './home-hero-rail';
import { HomeHeroShowcase } from './home-hero-showcase';

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
    <section className="relative isolate overflow-hidden bg-[#090909]">
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

      <div className="relative z-10 mx-auto grid w-full max-w-[1360px] gap-6 px-5 pt-8 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-x-8 lg:gap-y-6 lg:px-10 lg:pt-10 lg:pb-12 xl:px-12">
        <div className="relative z-20 order-1 flex min-w-0 flex-col justify-center">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-white/65 uppercase">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
              />
              {t(locale, 'tagline')}
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-[3.15rem] leading-[1.02] font-semibold text-white sm:text-6xl lg:text-[4.6rem] xl:text-[5rem]">
              <span className="block">{t(locale, 'homeHeroLine1')}</span>
              <span className="text-accent">{t(locale, 'homeHeroAccent')}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              {t(locale, 'support')}
            </p>
          </div>
          <div className="order-3 lg:order-2">
            <HomeHeroShowcase locale={locale} />
          </div>

        <form
          action={`/${locale}/bikes`}
          method="get"
          role="search"
          className="relative z-20 order-2 rounded-2xl bg-white p-1.5 shadow-[0_22px_48px_-20px_rgba(0,0,0,0.65)] lg:order-3 lg:col-span-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f4f4] text-black/45"
              >
                <SearchIcon />
              </span>
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="hero-bike-search"
                  className="block text-xs font-medium text-black/50"
                >
                  {t(locale, 'homeHeroSearchLabel')}
                </label>
                <input
                  id="hero-bike-search"
                  name="q"
                  type="search"
                  placeholder={t(locale, 'homeHeroSearchHint')}
                  autoComplete="off"
                  className="mt-0.5 w-full bg-transparent text-[15px] text-black outline-none placeholder:text-black/35"
                />
              </div>
            </div>

            {districts.length > 0 ? (
              <div className="flex items-center gap-3 border-t border-black/8 px-3 py-2.5 sm:w-[16rem] sm:border-t-0 sm:border-l">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f4f4] text-black/45"
                >
                  <PinIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="hero-district"
                    className="block text-xs font-medium text-black/50"
                  >
                    {t(locale, 'homeHeroLocationLabel')}
                  </label>
                  <select
                    id="hero-district"
                    name="districtId"
                    defaultValue=""
                    className="mt-0.5 w-full max-w-full bg-transparent text-[15px] text-black outline-none"
                  >
                    <option value="">{t(locale, 'homeAllSriLanka')}</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition hover:brightness-110 sm:self-center sm:px-7"
            >
              <SearchIcon className="h-4 w-4 text-white" />
              {t(locale, 'search')}
            </button>
          </div>
        </form>

        <HomeHeroRail locale={locale} popular={popular} />
      </div>
    </section>
  );
}

function SearchIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.2" />
    </svg>
  );
}

