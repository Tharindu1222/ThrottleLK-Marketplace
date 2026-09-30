import Link from 'next/link';
import { BrandLogo } from './brand-logo';
import { t, type Locale } from '@/lib/i18n';

export function SiteFooter({ locale }: { locale: Locale }) {
  const links = [
    { href: `/${locale}/about`, key: 'aboutNav' as const },
    { href: `/${locale}/contact`, key: 'contactNav' as const },
    { href: `/${locale}/guides`, key: 'contactGuides' as const },
    { href: `/${locale}/terms`, key: 'legalTermsLink' as const },
    { href: `/${locale}/privacy`, key: 'legalPrivacyLink' as const },
    { href: `/${locale}/rules`, key: 'legalRulesLink' as const },
  ];

  return (
    <footer className="max-w-full border-t border-black/10 bg-black px-4 py-6 text-center text-sm text-muted sm:px-6">
      <BrandLogo size="footer" tone="white" />
      <p className="sr-only">{t(locale, 'brand')}</p>
      <nav
        aria-label={t(locale, 'aboutNav')}
        className="mx-auto mt-3 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-11 items-center px-2 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t(locale, link.key)}
          </Link>
        ))}
      </nav>
      <p className="mt-2 max-w-full px-2 text-xs break-words">
        © {new Date().getFullYear()} — {t(locale, 'footerCopyright')}
      </p>
      <p className="mt-1 max-w-full px-2 text-[10px] tracking-[0.14em] break-words text-accent uppercase sm:tracking-[0.22em]">
        {t(locale, 'footerTagline')}
      </p>
    </footer>
  );
}
