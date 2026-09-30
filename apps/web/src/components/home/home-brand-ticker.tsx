'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const tweenRef = useRef<{ kill: () => void; pause: () => void; play: () => void } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const items = useMemo(() => tickerBrands(brands), [brands]);
  const row = useMemo(() => {
    if (items.length === 0) return [];
    return items.length < 10 ? [...items, ...items, ...items] : items;
  }, [items]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || row.length === 0 || reduceMotion) return;

    let cancelled = false;
    void import('gsap').then(({ default: gsap }) => {
      if (cancelled || !trackRef.current) return;
      const tween = gsap.to(trackRef.current, {
        xPercent: -50,
        duration: Math.max(36, row.length * 2.4),
        ease: 'none',
        repeat: -1,
      });
      tweenRef.current = tween;
    });

    return () => {
      cancelled = true;
      tweenRef.current?.kill();
      tweenRef.current = null;
    };
  }, [row.length, reduceMotion]);

  if (row.length === 0) return null;

  function pause() {
    tweenRef.current?.pause();
  }

  function play() {
    tweenRef.current?.play();
  }

  return (
    <div
      className="relative mt-3 mb-2 w-full min-w-0 max-w-full overflow-hidden bg-[#111] text-white"
      onMouseEnter={pause}
      onMouseLeave={play}
      onFocusCapture={pause}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          play();
        }
      }}
    >
      {reduceMotion ? null : (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[5.5rem] z-10 w-8 bg-gradient-to-r from-[#111] to-transparent sm:left-28"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#111] to-transparent"
          />
        </>
      )}

      <div className="flex min-w-0 items-stretch">
        <p className="relative z-20 flex shrink-0 items-center bg-accent px-3 text-[11px] font-semibold tracking-[0.18em] text-white uppercase sm:px-5">
          {t(locale, 'homeBrandTickerLabel')}
        </p>

        <div className={reduceMotion ? 'min-w-0 flex-1' : 'min-w-0 flex-1 overflow-hidden'}>
          <div
            ref={trackRef}
            className={reduceMotion ? undefined : 'flex w-max will-change-transform'}
          >
            {(reduceMotion ? [0] : [0, 1]).map((copy) => (
              <ul
                key={copy}
                className={
                  reduceMotion
                    ? 'flex flex-wrap items-center gap-x-1 gap-y-1 px-2 py-1'
                    : 'flex items-center py-0 pr-10 lg:py-3.5'
                }
                aria-hidden={copy === 1}
                aria-label={
                  copy === 0 ? t(locale, 'homeBrandTickerAria') : undefined
                }
              >
                {row.map((brand, index) => (
                  <li key={`${copy}-${brand.id}-${index}`} className="flex items-center">
                    <Link
                      href={`/${locale}/bikes?brandId=${brand.id}`}
                      className="px-3 font-[family-name:var(--font-display)] text-[15px] tracking-[0.04em] text-white/90 uppercase transition hover:text-accent focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent max-lg:inline-flex max-lg:min-h-11 max-lg:items-center sm:text-base"
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
