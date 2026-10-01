import type { MetadataRoute } from 'next';
import { guides } from '@/content/guides';
import { PUBLIC_CATEGORY_SLUGS } from '@/lib/bike-categories';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { absoluteUrl } from '@/lib/seo';

type Brand = { slug: string; id: string };
type District = { slug: string };
type ListingSlug = { slug: string; sellerId?: string; updatedAt?: string };
type DealerSlug = { slug: string };
type PartSlug = { slug: string; kind?: string; updatedAt?: string | null };
type Model = { slug: string };

const LOCALES = ['en', 'si'] as const;

export const revalidate = 3600;

async function fetchAllPages<T>(
  path: string,
  extra?: Record<string, string | undefined>,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const { data, meta } = await apiGetWithMeta<T[]>(path, {
      searchParams: { page: String(page), limit: '100', ...extra },
    });
    all.push(...(data ?? []));
    hasNext = Boolean(meta?.hasNextPage);
    page += 1;
    if (page > 500) break;
  }
  return all;
}

function loc(
  locale: string,
  path: string,
  extras?: Omit<MetadataRoute.Sitemap[number], 'url'>,
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(`/${locale}${path}`),
    ...extras,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    base.push(
      loc(locale, '', { changeFrequency: 'daily', priority: 1 }),
      loc(locale, '/bikes', { changeFrequency: 'hourly', priority: 0.9 }),
      ...PUBLIC_CATEGORY_SLUGS.map((slug) =>
        loc(locale, `/bikes/${slug}`, {
          changeFrequency: 'daily',
          priority: 0.85,
        }),
      ),
      loc(locale, '/guides', { changeFrequency: 'weekly', priority: 0.7 }),
      loc(locale, '/dealers', { changeFrequency: 'daily', priority: 0.7 }),
      loc(locale, '/parts-dealers', { changeFrequency: 'daily', priority: 0.7 }),
      loc(locale, '/spare-parts', { changeFrequency: 'hourly', priority: 0.8 }),
      loc(locale, '/modified-parts', { changeFrequency: 'hourly', priority: 0.8 }),
      loc(locale, '/about', { changeFrequency: 'monthly', priority: 0.4 }),
      loc(locale, '/contact', { changeFrequency: 'yearly', priority: 0.3 }),
      loc(locale, '/terms', { changeFrequency: 'yearly', priority: 0.3 }),
      loc(locale, '/privacy', { changeFrequency: 'yearly', priority: 0.3 }),
      loc(locale, '/rules', { changeFrequency: 'yearly', priority: 0.3 }),
    );
    for (const guide of guides) {
      base.push(
        loc(locale, `/guides/${guide.slug}`, {
          changeFrequency: 'monthly',
          priority: 0.55,
          lastModified: new Date(guide.publishedAt),
        }),
      );
    }
  }

  try {
    const [
      brands,
      districts,
      listings,
      dealers,
      partsDealers,
      spareParts,
      modifiedParts,
      riderAccessories,
    ] = await Promise.all([
      apiGet<Brand[]>('/api/v1/brands'),
      apiGet<District[]>('/api/v1/locations/districts'),
      fetchAllPages<ListingSlug>('/api/v1/listings/seo-slugs'),
      fetchAllPages<DealerSlug>('/api/v1/dealers/seo-slugs'),
      fetchAllPages<DealerSlug>('/api/v1/parts-dealers/seo-slugs'),
      fetchAllPages<PartSlug>('/api/v1/part-listings/seo-slugs', {
        kind: 'spare',
      }),
      fetchAllPages<PartSlug>('/api/v1/part-listings/seo-slugs', {
        kind: 'modified',
      }),
      fetchAllPages<PartSlug>('/api/v1/part-listings/seo-slugs', {
        kind: 'accessory',
      }),
    ]);

    const modelPairs = await Promise.all(
      brands.map(async (brand) => {
        const models = await apiGet<Model[]>(
          `/api/v1/brands/${brand.id}/models`,
        ).catch(() => [] as Model[]);
        return { brand, models };
      }),
    );

    for (const locale of LOCALES) {
      for (const brand of brands) {
        base.push(
          loc(locale, `/brands/${brand.slug}`, {
            changeFrequency: 'daily',
            priority: 0.8,
          }),
        );
      }
      for (const { brand, models } of modelPairs) {
        for (const model of models) {
          base.push(
            loc(locale, `/brands/${brand.slug}/${model.slug}`, {
              changeFrequency: 'daily',
              priority: 0.75,
            }),
          );
        }
      }
      for (const district of districts) {
        base.push(
          loc(locale, `/locations/${district.slug}`, {
            changeFrequency: 'daily',
            priority: 0.7,
          }),
        );
      }
      for (const dealer of dealers) {
        base.push(
          loc(locale, `/dealers/${dealer.slug}`, {
            changeFrequency: 'daily',
            priority: 0.65,
          }),
        );
      }
      for (const dealer of partsDealers) {
        base.push(
          loc(locale, `/parts-dealers/${dealer.slug}`, {
            changeFrequency: 'daily',
            priority: 0.65,
          }),
        );
      }
      for (const part of spareParts) {
        base.push(
          loc(locale, `/spare-parts/${part.slug}`, {
            changeFrequency: 'daily',
            priority: 0.55,
            lastModified: part.updatedAt ? new Date(part.updatedAt) : undefined,
          }),
        );
      }
      for (const part of modifiedParts) {
        base.push(
          loc(locale, `/modified-parts/${part.slug}`, {
            changeFrequency: 'daily',
            priority: 0.55,
            lastModified: part.updatedAt ? new Date(part.updatedAt) : undefined,
          }),
        );
      }
      for (const part of riderAccessories) {
        base.push(
          loc(locale, `/rider-accessories/${part.slug}`, {
            changeFrequency: 'daily',
            priority: 0.55,
            lastModified: part.updatedAt ? new Date(part.updatedAt) : undefined,
          }),
        );
      }
      const sellerIds = new Set<string>();
      for (const listing of listings) {
        base.push(
          loc(locale, `/bikes/${listing.slug}`, {
            changeFrequency: 'daily',
            priority: 0.6,
            lastModified: listing.updatedAt
              ? new Date(listing.updatedAt)
              : undefined,
          }),
        );
        if (listing.sellerId) sellerIds.add(listing.sellerId);
      }
      for (const sellerId of sellerIds) {
        base.push(
          loc(locale, `/sellers/${sellerId}`, {
            changeFrequency: 'daily',
            priority: 0.55,
          }),
        );
      }
    }
  } catch {
    // API unavailable during build — return static entries only
  }

  return base;
}
