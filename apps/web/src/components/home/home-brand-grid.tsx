import Link from 'next/link';
import { brandLogoSrc } from '@/lib/home-shop';
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
    <ul className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
      {brands.map((brand) => (
        <li key={brand.id}>
          <Link
            href={`/${locale}/bikes?brandId=${brand.id}`}
            className="group flex h-12 items-center justify-center overflow-hidden rounded-lg bg-white px-1.5 py-1.5 ring-1 ring-black/8 transition hover:ring-accent"
            title={brand.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandLogoSrc(brand)}
              alt={brand.name}
              className="max-h-7 w-full object-contain sm:max-h-8"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
