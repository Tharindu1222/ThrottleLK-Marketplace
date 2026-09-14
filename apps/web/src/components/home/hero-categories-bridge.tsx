'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero stays sticky; Categories covers it while scrolling.
 * No vertical offset on categories — keeps hero flush (no white gap).
 */
export function HeroCategoriesBridge({
  hero,
  categories,
}: {
  hero: ReactNode;
  categories: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const heroEl = wrap.querySelector<HTMLElement>('[data-hero-panel]');
    const riseEl = wrap.querySelector<HTMLElement>('[data-categories-rise]');
    if (!heroEl || !riseEl) return;

    const ctx = gsap.context(() => {
      // Fade only — no scale (scale left black/empty gutters on the sides)
      gsap.fromTo(
        heroEl,
        { opacity: 1 },
        {
          opacity: 0.35,
          ease: 'none',
          scrollTrigger: {
            trigger: riseEl,
            start: 'top bottom',
            end: 'top 10%',
            scrub: 0.8,
          },
        },
      );
    }, wrap);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      {/* Pull under sticky header (height + border) — no white strip on top */}
      <div className="sticky top-0 z-0 -mt-[calc(4rem+1px)] overflow-hidden bg-background sm:-mt-[calc(4.25rem+1px)]">
        <div data-hero-panel className="will-change-[opacity]">
          {hero}
        </div>
      </div>

      <div
        data-categories-rise
        className="relative z-10 bg-background shadow-[0_-16px_40px_rgba(0,0,0,0.12)]"
      >
        {categories}
      </div>
    </div>
  );
}
