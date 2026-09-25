'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import type { HomeBrand } from '@/components/home/home-brand-grid';
import { t, type Locale } from '@/lib/i18n';

function tickerBrands(brands: HomeBrand[]): HomeBrand[] {
  return brands
    .filter((brand) => {
      const name = brand.name.trim();
      return name.length > 0 && name.toLowerCase() !== 'other';
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function HomeBrandTicker({
  locale,
  brands,
}: {
  locale: Locale;
  brands: HomeBrand[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const items = useMemo(() => tickerBrands(brands), [brands]);
  const row = useMemo(() => {
    if (items.length === 0) return [];
    return items.length < 10 ? [...items, ...items, ...items] : items;
  }, [items]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || row.length === 0) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const tween = gsap.to(track, {
      xPercent: -50,
      duration: Math.max(36, row.length * 2.4),
      ease: 'none',
      repeat: -1,
    });
    tweenRef.current = tween;

    return () => {
      tween.kill();
      tweenRef.current = null;
    };
  }, [row.length]);

  if (row.length === 0) return null;

  function pause() {
    tweenRef.current?.pause();
  }

  function play() {
    tweenRef.current?.play();
  }

  return (
    <div
      className="relative mt-3 mb-2 overflow-hidden bg-[#111] text-white"
      onMouseEnter={pause}
      onMouseLeave={play}
      onFocusCapture={pause}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          play();
        }
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[5.5rem] z-10 w-8 bg-gradient-to-r from-[#111] to-transparent sm:left-28"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#111] to-transparent"
      />

      <div className="flex items-stretch">
        <p className="relative z-20 flex shrink-0 items-center bg-accent px-3 text-[11px] font-semibold tracking-[0.18em] text-white uppercase sm:px-5">
          {t(locale, 'homeBrandTickerLabel')}
        </p>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            ref={trackRef}
            className="flex w-max will-change-transform"
          >
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                className="flex items-center py-3.5 pr-10"
                aria-hidden={copy === 1}
                aria-label={
                  copy === 0 ? t(locale, 'homeBrandTickerAria') : undefined
                }
              >
                {row.map((brand, index) => (
                  <li key={`${copy}-${brand.id}-${index}`} className="flex items-center">
                    <Link
                      href={`/${locale}/bikes?brandId=${brand.id}`}
                      className="px-3 font-[family-name:var(--font-display)] text-[15px] tracking-[0.04em] text-white/90 uppercase transition hover:text-accent focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-base"
                      tabIndex={copy === 1 ? -1 : 0}
                    >
                      {brand.name}
                    </Link>
                    <span aria-hidden className="text-accent">
                      ·
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
