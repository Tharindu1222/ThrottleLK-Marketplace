import { BrandLogo } from './brand-logo';
import { t, type Locale } from '@/lib/i18n';

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t border-black/10 bg-black py-10 text-center text-sm text-muted">
      <BrandLogo size="footer" tone="white" />
      <p className="sr-only">{t(locale, 'brand')}</p>
      <p className="mt-3">
        © {new Date().getFullYear()} — Sri Lanka&apos;s motorbike marketplace
      </p>
      <p className="mt-1 text-xs tracking-[0.25em] text-accent uppercase">
        Buy · Sell · Ride
      </p>
    </footer>
  );
}
