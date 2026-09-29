import type { NextConfig } from 'next';

function imageRemotePatterns() {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    { protocol: 'https', hostname: '*.r2.dev' },
    { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
  ];
  for (const raw of [
    process.env.R2_PUBLIC_URL,
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    process.env.NEXT_PUBLIC_IMAGE_HOST,
  ]) {
    if (!raw) continue;
    try {
      const url = new URL(raw);
      patterns.push({
        protocol: url.protocol === 'http:' ? 'http' : 'https',
        hostname: url.hostname,
        pathname: '/**',
      });
    } catch {
      /* ignore invalid env */
    }
  }
  return patterns;
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: imageRemotePatterns(),
  },
  async rewrites() {
    const api =
      process.env.API_INTERNAL_URL ??
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:3001';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${api.replace(/\/$/, '')}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // Immutable caching is correct for content-hashed production builds,
            // but Turbopack reuses chunk names in dev — long-lived cache breaks HMR.
            value: isDev
              ? 'no-store'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-src https://challenges.cloudflare.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
