import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { HeroBikeOrbit } from './hero-bike-orbit';

export function HomeHero({ locale }: { locale: Locale }) {
  return (
    <section className="relative isolate h-[min(72svh,720px)] min-h-[520px] max-h-[800px] overflow-hidden bg-background">
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
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/bikes`}
              className="inline-flex items-center bg-accent px-6 py-3 font-[family-name:var(--font-display)] text-lg tracking-wide text-white transition hover:brightness-110 lg:px-7 lg:py-3.5 lg:text-xl"
            >
              Browse Bikes
            </Link>
            <Link
              href={`/${locale}/sell`}
              className="inline-flex items-center border border-white/35 bg-transparent px-6 py-3 font-[family-name:var(--font-display)] text-lg tracking-wide text-white transition hover:border-accent hover:text-white lg:px-7 lg:py-3.5 lg:text-xl"
            >
              Sell Your Bike
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
