import Link from 'next/link';
import { LocaleChrome } from '@/components/locale-chrome';
import { t } from '@/lib/i18n';

export default function RootNotFound() {
  const locale = 'en' as const;
  return (
    <LocaleChrome locale={locale}>
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
          {t(locale, 'pageNotFound')}
        </h1>
        <p className="mt-4 text-muted">{t(locale, 'pageNotFoundHint')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/en"
            className="inline-flex border border-black/15 px-5 py-2.5 text-sm hover:border-accent hover:text-accent"
          >
            {t(locale, 'goHome')}
          </Link>
          <Link
            href="/en/bikes"
            className="inline-flex bg-accent px-5 py-2.5 text-sm text-white"
          >
            {t(locale, 'browseBikes')}
          </Link>
          <Link
            href="/en/bike-parts"
            className="inline-flex border border-accent/30 bg-accent/5 px-5 py-2.5 text-sm text-accent hover:bg-accent/10"
          >
            {t(locale, 'browseBikeParts')}
          </Link>
        </div>
      </main>
    </LocaleChrome>
  );
}
