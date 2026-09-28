'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { HOME_PILLARS } from '@/lib/home-shop';
import { t, type Locale } from '@/lib/i18n';
import { useGsapCardHover } from './use-gsap-card-hover';

export function HomePillarCards({ locale }: { locale: Locale }) {
  const listRef = useRef<HTMLUListElement>(null);
  useGsapCardHover(listRef, { selector: '[data-pillar-card]', lift: 6 });

  return (
    <ul ref={listRef} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {HOME_PILLARS.map((pillar) => (
        <li key={pillar.id}>
          <Link
            href={pillar.href(locale)}
            data-pillar-card
            className="group flex h-full items-center gap-3 rounded-2xl bg-[#f6f6f6] px-3 py-3 outline-none transition-colors hover:bg-[#efefef] focus-visible:bg-[#efefef]"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pillar.image}
                alt=""
                className="h-14 w-14 object-contain"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold text-foreground">
                  {t(locale, pillar.titleKey)}
                </span>
                <span
                  aria-hidden
                  className="text-accent transition group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">
                {t(locale, pillar.promiseKey)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
