import type { Metadata } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function absoluteUrl(path: string) {
  return `${SITE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(input.path);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${input.title} | ThrottleLK`,
      description: input.description,
      url,
      siteName: 'ThrottleLK',
      locale: 'en_LK',
      type: 'website',
    },
  };
}

export function listingJsonLd(listing: {
  title: string;
  description: string;
  priceLkr: number;
  slug: string;
  locale: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description.slice(0, 5000),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'LKR',
      price: listing.priceLkr,
      availability: 'https://schema.org/InStock',
      url: absoluteUrl(`/${listing.locale}/bikes/${listing.slug}`),
    },
  };
}
