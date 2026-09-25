'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { HERO_BIKES } from '@/lib/hero-bikes';
import { t, type Locale } from '@/lib/i18n';

export function HomeHeroShowcase({ locale }: { locale: Locale }) {
  const [index, setIndex] = useState(0);
  const current = HERO_BIKES[index] ?? HERO_BIKES[0];
  const total = HERO_BIKES.length;

  useEffect(() => {
    if (total < 2) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, 6000);
    return () => window.clearInterval(id);
  }, [total, index]);

  if (!current) return null;

  return (
    <div className="relative isolate h-[280px] overflow-visible sm:h-[360px] lg:h-[440px]">
      <div
        aria-hidden
        className="absolute bottom-[8%] left-[8%] h-32 w-[80%] rounded-full bg-white/14 blur-3xl"
      />

      {HERO_BIKES.map((bike) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={bike.src}
          src={bike.src}
          alt=""
          aria-hidden
          className="hidden"
        />
      ))}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current.src}
        src={current.src}
        alt={current.alt}
        className="absolute bottom-0 left-1/2 h-full w-auto max-w-none origin-bottom -translate-x-1/2 scale-[var(--hero-bike-scale)] object-contain object-bottom drop-shadow-[0_28px_50px_rgba(0,0,0,0.55)] lg:left-0 lg:translate-x-0"
        style={
          { '--hero-bike-scale': String(current.scale) } as CSSProperties
        }
      />

      {total > 1 ? (
        <div
          className="absolute right-0 bottom-1 z-10 flex"
          role="tablist"
          aria-label={t(locale, 'homeHeroFeaturedLabel')}
        >
          {HERO_BIKES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${t(locale, 'homeHeroFeaturedLabel')} ${i + 1}`}
              className="relative h-11 w-9"
              onClick={() => setIndex(i)}
            >
              <span
                className={`absolute top-1/2 left-1/2 h-1 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  i === index ? 'bg-white' : 'bg-white/30'
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
