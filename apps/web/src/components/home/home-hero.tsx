import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { HeroBikeOrbit } from './hero-bike-orbit';

export function HomeHero({ locale }: { locale: Locale }) {
  return (
    <section className="relative isolate h-[100svh] max-h-[900px] min-h-[560px] overflow-hidden bg-[#0a0a0a] pt-[calc(4rem+1px)] sm:pt-[calc(4.25rem+1px)]">
      {/* Diagonal black / white split */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(115deg, #0a0a0a 0%, #0a0a0a 48%, #f5f5f5 48.2%, #f5f5f5 100%)',
        }}
      />

      {/* City silhouette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[18%] h-28 opacity-30 sm:h-36"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 20%, transparent 40%), repeating-linear-gradient(90deg, transparent 0 18px, rgba(128,128,128,0.35) 18px 20px, transparent 20px 38px)',
          maskImage:
            'linear-gradient(to top, black 20%, transparent 100%)',
        }}
      />

      {/* Skewed speed bars */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-10%] right-[-5%] bottom-[-10%] left-[28%] sm:left-[34%]"
      >
        <div className="absolute top-0 left-[8%] h-full w-[18%] origin-center -skew-x-[18deg] bg-accent" />
        <div className="absolute top-0 left-[28%] h-full w-[14%] origin-center -skew-x-[18deg] bg-[var(--gray-bar)]" />
        <div className="absolute top-0 left-[44%] h-full w-[11%] origin-center -skew-x-[18deg] bg-[var(--gray-bar-light)]" />
      </div>

      {/* Ground line */}
      <div
        aria-hidden
        className="absolute right-[8%] bottom-[22%] left-[8%] h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />

      {/* Bike stage — full hero width & height */}
      <div className="pointer-events-none absolute inset-0 z-[5] h-full w-full">
        <div className="pointer-events-auto h-full w-full">
          <HeroBikeOrbit />
        </div>
      </div>

      <div className="relative z-10 flex h-full items-center pl-5 pr-6 sm:pl-8 lg:pl-10 xl:pl-14">
        <div className="relative max-w-lg lg:max-w-2xl">
          <h1 className="max-w-2xl">
            <span className="block font-[family-name:var(--font-display)] text-xs tracking-[0.4em] text-accent uppercase sm:text-sm lg:text-base">
              Sri Lanka&apos;s Motorbike Marketplace
            </span>
            <span className="mt-4 block font-[family-name:var(--font-display)] text-5xl leading-[0.92] tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl">
              Find Your
              <span className="text-accent"> Ride.</span>
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-white/75 sm:text-lg lg:text-xl">
            Buy and sell motorbikes across Sri Lanka — from private sellers and
            dealers.
          </p>
          <form
            action={`/${locale}/bikes`}
            method="get"
            role="search"
            className="mt-8 flex w-full max-w-lg flex-col gap-2 sm:max-w-xl sm:flex-row sm:gap-0 lg:max-w-2xl"
          >
            <label htmlFor="hero-bike-search" className="sr-only">
              {t(locale, 'searchPlaceholder')}
            </label>
            <input
              id="hero-bike-search"
              name="q"
              type="search"
              placeholder={t(locale, 'searchPlaceholder')}
              autoComplete="off"
              className="min-w-0 flex-1 border border-black/20 bg-white px-4 py-3.5 text-base text-black outline-none placeholder:text-black/45 focus:border-accent sm:border-r-0 lg:py-4 lg:text-lg"
            />
            <button
              type="submit"
              className="shrink-0 bg-accent px-6 py-3.5 font-[family-name:var(--font-display)] text-lg tracking-wide text-white transition hover:brightness-110 lg:px-8 lg:py-4 lg:text-xl"
            >
              {t(locale, 'search')}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
