import type { Metadata } from 'next';
import { DM_Sans, Outfit } from 'next/font/google';
import './globals.css';

const sans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm',
  display: 'swap',
  adjustFontFallback: true,
});

const display = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
});

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.className} ${sans.variable} ${display.variable}`}>
        {children}
      </body>
    </html>
  );
}
