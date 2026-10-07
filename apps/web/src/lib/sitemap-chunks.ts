import type { MetadataRoute } from 'next';

export const SITEMAP_SIZE = 45000;
export function sitemapChunks(entries: MetadataRoute.Sitemap) {
  return Array.from(
    { length: Math.max(1, Math.ceil(entries.length / SITEMAP_SIZE)) },
    (_, id) => ({ id }),
  );
}
export function sitemapChunk(
  entries: MetadataRoute.Sitemap,
  id: number,
): MetadataRoute.Sitemap {
  if (!Number.isInteger(id) || id < 0) return [];
  return entries.slice(id * SITEMAP_SIZE, (id + 1) * SITEMAP_SIZE);
}
