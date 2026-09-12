import type { Locale } from '@/lib/i18n';

export type BikeCategory = {
  name: string;
  slug: string;
  description: string;
  examples: string;
  image: string;
  /** Closest seeded taxonomy slug(s) for browse filtering */
  taxonomySlugs: string[];
};

export const bikeCategories: BikeCategory[] = [
  {
    name: 'Scooters',
    slug: 'scooters',
    description: 'Easy • Practical • City Ready',
    examples: 'Dio · RayZR · Ntorq',
    image: '/images/categories/scooters.svg',
    taxonomySlugs: ['scooter'],
  },
  {
    name: 'Street Bikes',
    slug: 'street-bikes',
    description: 'Everyday • Stylish • Versatile',
    examples: 'Hornet · FZ · Duke · Gixxer',
    image: '/images/categories/street-bikes.svg',
    taxonomySlugs: ['commuter', 'sports'],
  },
  {
    name: 'High Capacity Bikes',
    slug: 'high-capacity-bikes',
    description: 'Power • Performance • Premium',
    examples: 'CBR · Ninja · R1 · R6 · GSX-R',
    image: '/images/categories/high-capacity-bikes.svg',
    taxonomySlugs: ['sports'],
  },
  {
    name: 'Trail Bikes',
    slug: 'trail-bikes',
    description: 'Road • Dirt • Adventure',
    examples: 'CRF · KLX · WR · XR',
    image: '/images/categories/trail-bikes.svg',
    taxonomySlugs: ['adventure', 'dual-sport'],
  },
  {
    name: 'Classic Bikes',
    slug: 'classic-bikes',
    description: 'Timeless • Iconic • Heritage',
    examples: 'Royal Enfield · CB Series · Vintage',
    image: '/images/categories/classic-bikes.svg',
    taxonomySlugs: ['cruiser'],
  },
  {
    name: 'Electric Bikes',
    slug: 'electric-bikes',
    description: 'Clean • Quiet • Future Ready',
    examples: 'Electric motorbikes & scooters',
    image: '/images/categories/electric-bikes.svg',
    taxonomySlugs: ['electric'],
  },
];

export function categoryHref(locale: Locale, slug: string) {
  return `/${locale}/bikes/${slug}`;
}

export function getBikeCategory(slug: string) {
  return bikeCategories.find((c) => c.slug === slug) ?? null;
}
