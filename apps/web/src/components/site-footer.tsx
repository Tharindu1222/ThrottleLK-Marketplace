import { t, type Locale } from '@/lib/i18n';

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t border-white/10 py-8 text-center text-sm text-muted">
      <p>
        © {new Date().getFullYear()} {t(locale, 'brand')} — Sri Lanka motorcycle
        marketplace
      </p>
    </footer>
  );
}
