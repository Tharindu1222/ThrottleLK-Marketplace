import type { Metadata } from 'next';
import { Barlow_Condensed, DM_Sans } from 'next/font/google';
import './globals.css';

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
});

const sans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
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
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
