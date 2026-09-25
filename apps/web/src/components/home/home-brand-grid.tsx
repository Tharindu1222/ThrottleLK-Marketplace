import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

export type HomeBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
};

export function HomeBrandGrid({
  locale,
  brands,
}: {
  locale: Locale;
  brands: HomeBrand[];
}) {
  return (
    <ul className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
      {brands.map((brand) => (
        <li key={brand.id}>
          <Link
            href={`/${locale}/bikes?brandId=${brand.id}`}
            className="group flex h-[4.25rem] flex-col items-center justify-center rounded-xl bg-white px-2 py-1.5 ring-1 ring-black/8 transition hover:ring-accent"
            title={brand.name}
          >
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="line-clamp-2 text-center text-[10px] leading-tight font-medium text-black/70 transition group-hover:text-black sm:text-xs">
                {brand.name}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
