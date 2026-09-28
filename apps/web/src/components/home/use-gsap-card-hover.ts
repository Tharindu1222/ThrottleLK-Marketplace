'use client';

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';

const ACCENT = '#e10600';

export function useGsapCardHover(
  rootRef: RefObject<HTMLElement | null>,
  {
    selector,
    lift = 0,
  }: {
    selector?: string;
    lift?: number;
  } = {},
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cards = selector
      ? Array.from(root.querySelectorAll<HTMLElement>(selector))
      : [root];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tweens = new Map<HTMLElement, gsap.core.Tween>();

    const paint = (el: HTMLElement, active: boolean) => {
      tweens.get(el)?.kill();
      const outline = {
        outlineColor: active ? ACCENT : 'transparent',
        outlineWidth: active ? 2 : 0,
      };
      if (reduced) {
        gsap.set(el, outline);
        return;
      }
      tweens.set(
        el,
        gsap.to(el, {
          ...outline,
          ...(lift
            ? {
                y: active ? -lift : 0,
                boxShadow: active
                  ? '0 12px 24px -14px rgba(0,0,0,0.32)'
                  : '0 0 0 0 rgba(0,0,0,0)',
              }
            : {}),
          duration: 0.32,
          ease: 'power2.out',
          overwrite: true,
        }),
      );
    };

    const cleanups: Array<() => void> = [];
    cards.forEach((el) => {
      gsap.set(el, {
        outlineStyle: 'solid',
        outlineColor: 'transparent',
        outlineWidth: 0,
        outlineOffset: 0,
        ...(lift ? { y: 0, boxShadow: '0 0 0 0 rgba(0,0,0,0)' } : {}),
      });
      const enter = () => paint(el, true);
      const leave = () => paint(el, false);
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
      el.addEventListener('focus', enter);
      el.addEventListener('blur', leave);
      cleanups.push(() => {
        el.removeEventListener('pointerenter', enter);
        el.removeEventListener('pointerleave', leave);
        el.removeEventListener('focus', enter);
        el.removeEventListener('blur', leave);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
      tweens.forEach((tween) => tween.kill());
    };
  }, [selector, lift]);
}
