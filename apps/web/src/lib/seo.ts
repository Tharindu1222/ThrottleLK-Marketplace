import type { Metadata } from 'next';

if (
  process.env.NODE_ENV === 'production' &&
  !process.env.NEXT_PUBLIC_SITE_URL?.trim()
) {
  throw new Error('NEXT_PUBLIC_SITE_URL is required in production');
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const AUTH_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
};

export function absoluteUrl(path: string) {
  return `${SITE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  locale?: string;
  robots?: Metadata['robots'];
  image?: string;
}): Metadata {
  const url = absoluteUrl(input.path);
  const locale = input.locale === 'si' ? 'si_LK' : 'en_LK';
  const title = `${input.title} | ThrottleLK`;
  const languages =
    input.locale === 'si' || input.locale === 'en'
      ? {
          en: absoluteUrl(input.path.replace(/^\/si/, '/en')),
          si: absoluteUrl(input.path.replace(/^\/en/, '/si')),
          'x-default': absoluteUrl(input.path.replace(/^\/si/, '/en')),
        }
      : undefined;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url, languages },
    robots: input.robots,
    openGraph: {
      title,
      description: input.description,
      url,
      siteName: 'ThrottleLK',
      locale,
      type: 'website',
      images: input.image ? [{ url: input.image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: input.description,
      images: input.image ? [input.image] : undefined,
    },
  };
}

export function listingJsonLd(listing: {
  title: string;
  description: string;
  priceLkr: number;
  slug: string;
  locale: string;
  status?: string | null;
  image?: string | null;
}) {
  const sold = listing.status === 'sold';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description.slice(0, 5000),
    image: listing.image || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'LKR',
      price: listing.priceLkr,
      availability: sold
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      url: absoluteUrl(`/${listing.locale}/bikes/${listing.slug}`),
    },
  };
}

export function websiteJsonLd(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ThrottleLK',
    url: absoluteUrl(`/${locale}`),
    inLanguage: locale === 'si' ? 'si-LK' : 'en-LK',
  };
}

export function faqPageJsonLd(
  items: Array<{ question: string; answer: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  locale: string,
  items: Array<{ name: string; path: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path.startsWith('/') ? item.path : `/${locale}${item.path}`),
    })),
  };
}
