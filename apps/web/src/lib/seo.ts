import type { Metadata } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function absoluteUrl(path: string) {
  return `${SITE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  locale?: string;
  robots?: Metadata['robots'];
}): Metadata {
  const url = absoluteUrl(input.path);
  const locale = input.locale === 'si' ? 'si_LK' : 'en_LK';
  const title = `${input.title} | ThrottleLK`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.robots,
    openGraph: {
      title,
      description: input.description,
      url,
      siteName: 'ThrottleLK',
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: input.description,
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
}) {
  const sold = listing.status === 'sold';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description.slice(0, 5000),
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
