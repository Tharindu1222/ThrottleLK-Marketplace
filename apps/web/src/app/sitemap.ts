import type { MetadataRoute } from 'next';
import { guides } from '@/content/guides';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { absoluteUrl } from '@/lib/seo';

type Brand = { slug: string };
type District = { slug: string };
type ListingSlug = { slug: string; sellerId?: string; updatedAt?: string };
type DealerSlug = { slug: string };

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const { data, meta } = await apiGetWithMeta<T[]>(path, {
      searchParams: { page: String(page), limit: '100' },
    });
    all.push(...(data ?? []));
    hasNext = Boolean(meta?.hasNextPage);
    page += 1;
    if (page > 500) break;
  }
  return all;
}

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
      fetchAllPages<ListingSlug>('/api/v1/listings/seo-slugs'),
      fetchAllPages<DealerSlug>('/api/v1/dealers/seo-slugs'),
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
