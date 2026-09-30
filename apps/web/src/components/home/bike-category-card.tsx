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
          ? 'group relative flex aspect-[4/3] w-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06] outline-none transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_36px_-22px_rgba(0,0,0,0.35)] hover:ring-black/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0'
          : 'group relative flex h-[260px] w-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06] outline-none transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_18px_36px_-22px_rgba(0,0,0,0.35)] hover:ring-black/10 motion-reduce:hover:translate-y-0'
      }
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={category.image}
          alt=""
          className="absolute inset-0 h-full w-full object-contain object-center p-3 pb-1 transition duration-500 group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      <div className="relative flex h-14 shrink-0 items-center justify-between gap-2 px-3 pb-3">
        <div className="min-w-0">
          <p className="text-[13px] leading-snug font-semibold break-words text-foreground [overflow-wrap:anywhere]">
            {category.name}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[11px] break-words text-muted [overflow-wrap:anywhere]">
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
