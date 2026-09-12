import { t, type Locale } from '@/lib/i18n';

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t border-white/10 bg-black py-10 text-center text-sm text-muted">
      <p className="font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
        {t(locale, 'brand')}
      </p>
      <p className="mt-2">
        © {new Date().getFullYear()} — Sri Lanka&apos;s motorbike marketplace
      </p>
      <p className="mt-1 text-xs tracking-[0.25em] text-accent uppercase">
        Buy · Sell · Ride
      </p>
    </footer>
  );
}
