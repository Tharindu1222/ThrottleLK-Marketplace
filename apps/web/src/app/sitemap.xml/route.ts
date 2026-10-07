import { generateSitemaps } from '../sitemap';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 3600;
export async function GET() {
  const sitemaps = await generateSitemaps();
  const entries = sitemaps
    .map(
      ({ id }) =>
        `<sitemap><loc>${absoluteUrl(`/sitemap/${id}.xml`).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</loc></sitemap>`,
    )
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`,
    {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    },
  );
}
