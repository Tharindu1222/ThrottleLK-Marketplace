import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { DM_Sans, Noto_Sans_Sinhala } from 'next/font/google';
import { AnalyticsTags } from '@/components/analytics-tags';
import { WebVitals } from '@/components/web-vitals';
import './globals.css';

const sans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm',
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
});

const sinhala = Noto_Sans_Sinhala({
  subsets: ['sinhala'],
  weight: ['400', '500', '700'],
  variable: '--font-si',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
});

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  title: {
    default: "ThrottleLK — Sri Lanka's Motorbike Marketplace",
    template: '%s | ThrottleLK',
  },
  description:
    'Buy and sell motorbikes across Sri Lanka — from private sellers and dealers.',
  icons: {
    icon: '/images/brand/throttlelk-logo.png',
    apple: '/images/brand/throttlelk-logo.png',
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await headers()).get('x-throttlelk-locale') === 'si' ? 'si' : 'en';
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${sans.className} ${sans.variable} ${sinhala.variable}`}
        suppressHydrationWarning
      >
        <WebVitals />
        <AnalyticsTags />
        {children}
      </body>
    </html>
  );
}
