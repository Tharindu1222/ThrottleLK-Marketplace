import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

/**
 * Next loads `apps/web/.env*` before this file, then caches that result.
 * Also load the monorepo root `.env` without replacing variables already set.
 */
function loadMonorepoRootEnv() {
  const candidates = [
    resolve(process.cwd(), '..', '..'),
    resolve(process.cwd(), '..'),
    process.cwd(),
  ];
  const root =
    candidates.find((dir) =>
      existsSync(resolve(dir, 'apps', 'web', 'package.json')),
    ) ?? resolve(process.cwd(), '..', '..');
  const alreadySet = { ...process.env };
  const loaded = loadEnvConfig(
    root,
    process.env.NODE_ENV !== 'production',
    undefined,
    true,
  );
  for (const [key, value] of Object.entries(alreadySet)) {
    if (typeof value === 'string') process.env[key] = value;
  }
  const parsed = loaded.parsedEnv ?? {};
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined && typeof value === 'string') {
      process.env[key] = value;
    }
  }
}

loadMonorepoRootEnv();

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
    minimumCacheTTL: 60 * 60 * 24,
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
          // U-Eyes and phone preview tools embed the local site in a frame.
          // Production still refuses framing.
          ...(isDev ? [] : [{ key: 'X-Frame-Options', value: 'DENY' }]),
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
              // Omit in dev. `frame-ancestors *` still blocks chrome-extension
              // parents, which is how U-Eyes embeds the phone preview.
              ...(isDev ? [] : ["frame-ancestors 'none'"]),
              "base-uri 'self'",
              "form-action 'self' https://sandbox.payhere.lk https://www.payhere.lk",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
