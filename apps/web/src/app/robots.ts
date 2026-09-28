import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const allowIndex =
    process.env.ALLOW_INDEXING === 'true' ||
    (process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_INDEXING !== 'false');
  const isProd = allowIndex;
  if (!isProd) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/en/admin',
        '/si/admin',
        '/en/admin/',
        '/si/admin/',
        '/en/account',
        '/si/account',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
