'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero stays sticky; Categories rises from below and covers it while scrolling.
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
      // Categories lifts up over the sticky hero as you scroll
      gsap.fromTo(
        riseEl,
        { y: 80 },
        {
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: riseEl,
            start: 'top bottom',
            end: 'top 12%',
            scrub: 0.8,
          },
        },
      );

      // Hero gently shrinks / fades while Categories covers it
      gsap.fromTo(
        heroEl,
        { scale: 1, opacity: 1 },
        {
          scale: 0.92,
          opacity: 0.45,
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
      <div className="sticky top-0 z-0">
        <div
          data-hero-panel
          className="origin-center will-change-transform"
        >
          {hero}
        </div>
      </div>

      <div
        data-categories-rise
        className="relative z-10 bg-background shadow-[0_-24px_60px_rgba(0,0,0,0.45)] will-change-transform"
      >
        {categories}
      </div>
    </div>
  );
}
