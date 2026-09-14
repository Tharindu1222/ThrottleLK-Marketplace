import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { categoryHref, type BikeCategory } from '@/lib/bike-categories';

export function BikeCategoryCard({
  locale,
  category,
}: {
  locale: Locale;
  category: BikeCategory;
}) {
  return (
    <Link
      href={categoryHref(locale, category.slug)}
      className="group relative block h-[220px] overflow-hidden border border-black/10 bg-surface transition duration-500 ease-out hover:-translate-y-1.5 hover:border-accent hover:shadow-[0_20px_40px_-20px_rgba(225,6,0,0.45)] sm:h-[240px] lg:h-[260px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={category.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/20 transition duration-500 group-hover:via-background/60"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-accent transition duration-500 ease-out group-hover:scale-x-100"
      />
      <div className="relative flex h-full flex-col justify-end p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-foreground sm:text-2xl">
              {category.name}
            </h3>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              {category.description}
            </p>
            <p className="mt-2 truncate text-[11px] tracking-wide text-foreground/45 uppercase">
              {category.examples}
            </p>
          </div>
          <span
            aria-hidden
            className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center border border-black/15 text-foreground/70 transition duration-300 group-hover:translate-x-0.5 group-hover:border-accent group-hover:bg-accent group-hover:text-white"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
