import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
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
    return [
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
        ],
      },
    ];
  },
};

export default nextConfig;
