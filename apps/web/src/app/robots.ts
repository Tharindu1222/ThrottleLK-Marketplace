import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.NODE_ENV === 'production';
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
