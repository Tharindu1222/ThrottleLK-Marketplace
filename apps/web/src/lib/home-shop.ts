import {
  bikeCategories,
  type BikeCategory,
} from '@/lib/bike-categories';
import type { Locale } from '@/lib/i18n';

export type HomeApiCategory = {
  id: string;
  slug: string;
  coverImageUrl?: string | null;
};

export type ResolvedHomeBikeType = BikeCategory & {
  href: string;
};

/** Full-bleed homepage shell — edge padding only, no max-width cap. */
export const HOME_SHELL =
  'mx-auto w-full px-5 sm:px-8 lg:px-12 xl:px-16';

export const HOME_PILLARS = [
  {
    id: 'bikes',
    href: (locale: Locale) => `/${locale}/bikes`,
    titleKey: 'homePillarBikes',
    promiseKey: 'homePillarBikesPromise',
    image: '/images/bike/2a9e1fb6004427a17b8e2c516d97fbe4-removebg-preview.png',
  },
  {
    id: 'parts',
    href: (locale: Locale) => `/${locale}/bike-parts`,
    titleKey: 'homePillarParts',
    promiseKey: 'homePillarPartsPromise',
    image: '/images/bike/6016e8eabbf7647a517e5a5699b47316-removebg-preview.png',
  },
  {
    id: 'dealers',
    href: (locale: Locale) => `/${locale}/dealers`,
    titleKey: 'homePillarDealers',
    promiseKey: 'homePillarDealersPromise',
    image: '/images/bike/a6beefccb592373d84b06f48f0ac9dd6-removebg-preview.png',
  },
] as const;

const POPULAR_BRAND_NAMES = [
  'Honda',
  'Yamaha',
  'Suzuki',
  'Kawasaki',
  'Ducati',
  'BMW Motorrad',
  'Harley-Davidson',
  'KTM',
  'Royal Enfield',
  'Triumph',
] as const;

const POPULAR_BRAND_LOGO_FILE: Record<string, string> = {
  honda: 'honda.svg',
  yamaha: 'yamaha.svg',
  suzuki: 'suzuki.svg',
  kawasaki: 'kawasaki.svg',
  ducati: 'ducati.svg',
  'bmw motorrad': 'bmw.svg',
  'harley-davidson': 'harley-davidson.svg',
  ktm: 'ktm.svg',
  'royal enfield': 'royal-enfield.svg',
  triumph: 'triumph.svg',
};

const LOCAL_BRAND_LOGO_FILE: Record<string, string> = {
  ...POPULAR_BRAND_LOGO_FILE,
  'bmw-motorrad': 'bmw.svg',
  yezdi: 'yezdi.png',
};

export function popularBrandLogoSrc(name: string): string | null {
  const file = POPULAR_BRAND_LOGO_FILE[name.trim().toLowerCase()];
  return file ? `/images/brands/${file}` : null;
}

export function brandLogoSrc(brand: {
  name: string;
  slug: string;
  logoUrl?: string | null;
}): string {
  const uploaded = brand.logoUrl?.trim();
  if (uploaded) return uploaded;
  const file =
    LOCAL_BRAND_LOGO_FILE[brand.slug] ??
    LOCAL_BRAND_LOGO_FILE[brand.name.trim().toLowerCase()] ??
    `${brand.slug}.svg`;
  return `/images/brands/${file}`;
}

export function pickPopularHomeBrands<
  T extends { id: string; name: string; slug: string },
>(brands: T[]): T[] {
  const byName = new Map(brands.map((brand) => [brand.name.toLowerCase(), brand]));
  return POPULAR_BRAND_NAMES.flatMap((name) => {
    const match = byName.get(name.toLowerCase());
    return match ? [match] : [];
  });
}

export function shouldShowDiscover(
  brands: readonly unknown[],
  districts: readonly unknown[],
): boolean {
  return brands.length > 0 || districts.length > 0;
}

export function resolveHomeBikeTypes(
  locale: Locale,
  apiCategories: HomeApiCategory[],
): ResolvedHomeBikeType[] {
  const coverBySlug = new Map(
    apiCategories.map((c) => [c.slug, c.coverImageUrl ?? null]),
  );

  return bikeCategories.map((category) => {
    const matched = apiCategories.find((c) =>
      category.taxonomySlugs.includes(c.slug),
    );
    const cover = coverBySlug.get(category.slug);
    const href = matched
      ? `/${locale}/bikes?categoryId=${matched.id}`
      : `/${locale}/bikes`;

    return {
      ...category,
      image: cover || category.image,
      href,
    };
  });
}
