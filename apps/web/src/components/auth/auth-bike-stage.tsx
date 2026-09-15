'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const BIKE_SRC =
  '/images/bike/3cd99af1e73ba8f8e1985b681bbd4b6e-removebg-preview.png';

export function AuthBikeStage({ className = '' }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bikeRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const bike = bikeRef.current;
    const glow = glowRef.current;
    const shadow = shadowRef.current;
    if (!root || !bike || !glow || !shadow) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set([bike, glow, shadow], { opacity: 1, clearProps: 'transform' });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(bike, {
        opacity: 0,
        x: -60,
        y: 28,
        scale: 0.95,
        rotate: -3,
      });
      gsap.set(glow, { opacity: 0, scale: 0.7 });
      gsap.set(shadow, { opacity: 0, scaleX: 0.45 });

      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .to(glow, { opacity: 1, scale: 1.05, duration: 1 }, 0)
        .to(
          bike,
          {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1.12,
            rotate: 0,
            duration: 1.2,
          },
          0.1,
        )
        .to(shadow, { opacity: 0.5, scaleX: 1.05, duration: 0.85 }, 0.4);

      const float = gsap.timeline({
        delay: 1.25,
        repeat: -1,
        yoyo: true,
        defaults: { ease: 'sine.inOut' },
      });
      float
        .to(bike, { y: -12, rotate: 1.1, scale: 1.14, duration: 2.6 })
        .to(glow, { scale: 1.15, opacity: 0.95, duration: 2.6 }, 0)
        .to(shadow, { scaleX: 0.95, opacity: 0.35, duration: 2.6 }, 0);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`pointer-events-none relative flex h-full w-full items-center justify-center ${className}`}
    >
      <div
        ref={glowRef}
        aria-hidden
        className="absolute top-1/2 left-1/2 h-[70%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-[80px]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={bikeRef}
        src={BIKE_SRC}
        alt=""
        className="relative z-[1] max-h-full w-auto max-w-[125%] object-contain drop-shadow-[0_28px_50px_rgba(0,0,0,0.55)] select-none sm:max-w-[135%] lg:max-w-[145%]"
        draggable={false}
      />
      <div
        ref={shadowRef}
        aria-hidden
        className="absolute bottom-[6%] left-1/2 h-5 w-[58%] -translate-x-1/2 rounded-[100%] bg-black/55 blur-lg"
      />
    </div>
  );
}
