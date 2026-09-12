import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

export function HomeHero({ locale }: { locale: Locale }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            'linear-gradient(rgba(242,239,230,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(242,239,230,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 pt-10 pb-6 sm:pt-14 sm:pb-8">
        <h1 className="max-w-4xl">
          <span className="block font-[family-name:var(--font-display)] text-xs tracking-[0.35em] text-accent uppercase sm:text-sm">
            Sri Lanka&apos;s Motorbike Marketplace
          </span>
          <span className="mt-4 block font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Find Your Ride.
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-base text-foreground/90 sm:text-lg">
          Buy and sell motorbikes across Sri Lanka — from private sellers and
          dealers.
        </p>
        <p className="mt-2 max-w-lg text-sm text-muted sm:text-base">
          Discover the right bike for your style, budget and journey.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/bikes`}
            className="inline-flex items-center bg-accent px-5 py-3 font-[family-name:var(--font-display)] text-lg tracking-wide text-background transition hover:brightness-110"
          >
            Browse Bikes
          </Link>
          <Link
            href={`/${locale}/sell`}
            className="inline-flex items-center border border-white/20 bg-transparent px-5 py-3 font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground transition hover:border-accent/60 hover:text-white"
          >
            Sell Your Bike
          </Link>
        </div>
      </div>
    </section>
  );
}
