'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { popularBrandLogoSrc } from '@/lib/home-shop';
import { t, type Locale } from '@/lib/i18n';
import type { HomeHeroBrand } from './home-hero';

export function HomeHeroRail({
  locale,
  popular,
}: {
  locale: Locale;
  popular: HomeHeroBrand[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || reduceMotion || popular.length === 0) return;

    const tween = gsap.to(track, {
      xPercent: -50,
      duration: Math.max(28, popular.length * 3.6),
      ease: 'none',
      repeat: -1,
    });
    tweenRef.current = tween;

    return () => {
      tween.kill();
      tweenRef.current = null;
    };
  }, [popular.length, reduceMotion]);

  if (popular.length === 0) return null;

  function pause() {
    tweenRef.current?.pause();
  }

  function play() {
    tweenRef.current?.play();
  }

  return (
    <div
      className="order-4 flex items-center gap-4 lg:col-span-2"
      onMouseEnter={pause}
      onMouseLeave={play}
      onFocusCapture={pause}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          play();
        }
      }}
    >
      <p className="shrink-0 text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
        {t(locale, 'homePopular')}
      </p>
      <div
        className={
          reduceMotion
            ? 'relative min-w-0 flex-1'
            : 'relative min-h-10 min-w-0 flex-1 overflow-hidden'
        }
      >
        {reduceMotion ? null : (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#0d0d0d] to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#0d0d0d] to-transparent"
            />
          </>
        )}
        <div
          ref={trackRef}
          className={reduceMotion ? undefined : 'flex w-max will-change-transform'}
        >
          {(reduceMotion ? [0] : [0, 1]).map((copy) => (
            <ul
              key={copy}
              className={
                reduceMotion
                  ? 'flex flex-wrap items-center gap-x-8 gap-y-3'
                  : 'flex items-center gap-8 pr-8'
              }
              aria-hidden={copy === 1}
              aria-label={copy === 0 ? t(locale, 'homePopular') : undefined}
            >
              {popular.map((brand) => {
                const logo = popularBrandLogoSrc(brand.name);
                if (!logo) return null;
                return (
                  <li key={`${copy}-${brand.id}`} className="shrink-0">
                    <Link
                      href={`/${locale}/bikes?brandId=${brand.id}`}
                      aria-label={brand.name}
                      className="inline-flex h-10 items-center opacity-80 transition hover:opacity-100 focus-visible:rounded-sm focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      tabIndex={copy === 1 ? -1 : 0}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logo}
                        alt=""
                        className="h-7 w-auto max-w-[8.5rem] object-contain brightness-0 invert"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
