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
    <footer className="border-t border-black/10 bg-black py-5 text-center text-sm text-muted">
      <BrandLogo size="footer" tone="white" />
      <p className="sr-only">{t(locale, 'brand')}</p>
      <nav
        aria-label={t(locale, 'aboutNav')}
        className="mt-2.5 flex flex-wrap justify-center gap-x-4 gap-y-1.5"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="underline-offset-4 hover:text-white hover:underline"
          >
            {t(locale, link.key)}
          </Link>
        ))}
      </nav>
      <p className="mt-2 text-xs">
        © {new Date().getFullYear()} — {t(locale, 'footerCopyright')}
      </p>
      <p className="mt-1 text-[10px] tracking-[0.22em] text-accent uppercase">
        {t(locale, 'footerTagline')}
      </p>
    </footer>
  );
}
