'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { categoryHref, type BikeCategory } from '@/lib/bike-categories';
import type { Locale } from '@/lib/i18n';
import { useGsapCardHover } from './use-gsap-card-hover';

export function BikeCategoryCard({
  locale,
  category,
  href,
  variant = 'default',
}: {
  locale: Locale;
  category: BikeCategory;
  href?: string;
  variant?: 'default' | 'compact';
}) {
  const compact = variant === 'compact';
  const cardRef = useRef<HTMLAnchorElement>(null);
  useGsapCardHover(cardRef);

  return (
    <Link
      ref={cardRef}
      href={href ?? categoryHref(locale, category.slug)}
      className={
        compact
          ? 'group relative flex h-auto min-h-[188px] flex-col overflow-hidden rounded-2xl bg-[#f6f6f6] ring-1 ring-black/[0.06] outline-none transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_36px_-22px_rgba(0,0,0,0.35)] hover:ring-black/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:h-[188px] xl:h-[210px]'
          : 'group relative flex h-auto min-h-[220px] flex-col overflow-hidden rounded-2xl bg-[#f6f6f6] ring-1 ring-black/[0.06] outline-none transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_18px_36px_-22px_rgba(0,0,0,0.35)] hover:ring-black/10 motion-reduce:hover:translate-y-0 sm:min-h-[240px] lg:h-[260px] lg:min-h-[260px]'
      }
    >
      <div className="relative flex min-h-[4.5rem] flex-1 items-center justify-center px-3 pt-4 lg:min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={category.image}
          alt=""
          className="h-full max-h-full w-full max-w-full object-contain object-center transition duration-500 group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      <div className="relative flex shrink-0 items-end justify-between gap-2 px-3 pt-1 pb-3">
        <div className="min-w-0">
          <p className="text-[13px] leading-snug font-semibold break-words text-foreground [overflow-wrap:anywhere]">
            {category.name}
          </p>
          <p className="mt-0.5 text-[11px] break-words text-muted [overflow-wrap:anywhere] lg:line-clamp-1">
            {category.description}
          </p>
        </div>
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs text-white transition group-hover:translate-x-0.5"
        >
          →
        </span>
      </div>
    </Link>
  );
}
