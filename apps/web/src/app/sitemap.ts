import type { MetadataRoute } from 'next';
import { guides } from '@/content/guides';
import { apiGet } from '@/lib/api';
import { absoluteUrl } from '@/lib/seo';

type Brand = { slug: string };
type District = { slug: string };
type Listing = { slug: string; sellerId?: string; updatedAt?: string };
type Dealer = { slug: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/en'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/si'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/en/bikes'), changeFrequency: 'hourly', priority: 0.9 },
    { url: absoluteUrl('/si/bikes'), changeFrequency: 'hourly', priority: 0.9 },
    {
      url: absoluteUrl('/en/guides'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/en/dealers'),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  for (const guide of guides) {
    base.push({
      url: absoluteUrl(`/en/guides/${guide.slug}`),
      changeFrequency: 'monthly',
      priority: 0.55,
      lastModified: new Date(guide.publishedAt),
    });
  }

  try {
    const [brands, districts, listings, dealers] = await Promise.all([
      apiGet<Brand[]>('/api/v1/brands'),
      apiGet<District[]>('/api/v1/locations/districts'),
      apiGet<Listing[]>('/api/v1/listings'),
      apiGet<Dealer[]>('/api/v1/dealers'),
    ]);

    for (const brand of brands) {
      base.push({
        url: absoluteUrl(`/en/brands/${brand.slug}`),
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
    for (const district of districts) {
      base.push({
        url: absoluteUrl(`/en/locations/${district.slug}`),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
    for (const dealer of dealers) {
      base.push({
        url: absoluteUrl(`/en/dealers/${dealer.slug}`),
        changeFrequency: 'daily',
        priority: 0.65,
      });
    }

    const sellerIds = new Set<string>();
    for (const listing of listings) {
      base.push({
        url: absoluteUrl(`/en/bikes/${listing.slug}`),
        changeFrequency: 'daily',
        priority: 0.6,
        lastModified: listing.updatedAt
          ? new Date(listing.updatedAt)
          : undefined,
      });
      if (listing.sellerId) sellerIds.add(listing.sellerId);
    }
    for (const sellerId of sellerIds) {
      base.push({
        url: absoluteUrl(`/en/sellers/${sellerId}`),
        changeFrequency: 'daily',
        priority: 0.55,
      });
    }
  } catch {
    // API unavailable during build — return static entries only
  }

  return base;
}
