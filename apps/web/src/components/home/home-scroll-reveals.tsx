'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Light scroll reveals for Discover / brand / district (not Categories). */
export function HomeScrollReveals({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ default: gsap }, { ScrollTrigger }]) => {
        if (cancelled || !rootRef.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
          root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
            const kids = el.querySelectorAll<HTMLElement>('[data-reveal-child]');
            const targets = kids.length > 0 ? Array.from(kids) : [el];

            gsap.fromTo(
              targets,
              { y: 28, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.65,
                ease: 'power2.out',
                stagger: kids.length > 0 ? 0.07 : 0,
                scrollTrigger: {
                  trigger: el,
                  start: 'top 88%',
                  once: true,
                },
              },
            );
          });
        }, root);
        revert = () => ctx.revert();
      },
    );

    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
