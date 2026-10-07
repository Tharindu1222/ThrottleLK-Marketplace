import type { MetadataRoute } from 'next';
import { buildSitemapEntries } from '@/lib/sitemap-data';
import { sitemapChunks, sitemapChunk } from '@/lib/sitemap-chunks';
export const revalidate = 3600;

export async function generateSitemaps() {
  return sitemapChunks(await buildSitemapEntries());
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  return sitemapChunk(await buildSitemapEntries(), Number(id));
}
