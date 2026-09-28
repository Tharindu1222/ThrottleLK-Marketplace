import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { DM_Sans, Noto_Sans_Sinhala, Outfit } from 'next/font/google';
import { AnalyticsTags } from '@/components/analytics-tags';
import './globals.css';

const sans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm',
  display: 'swap',
  adjustFontFallback: true,
});

const sinhala = Noto_Sans_Sinhala({
  subsets: ['sinhala'],
  weight: ['400', '500', '700'],
  variable: '--font-si',
  display: 'swap',
});

const display = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
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
        className={`${sans.className} ${sans.variable} ${display.variable} ${sinhala.variable}`}
        suppressHydrationWarning
      >
        <AnalyticsTags />
        {children}
      </body>
    </html>
  );
}
