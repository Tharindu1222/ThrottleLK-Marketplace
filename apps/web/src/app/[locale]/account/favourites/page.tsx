import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { FavouritesClient } from './favourites-client';

export default async function FavouritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
        {t(locale, 'favourites')}
      </h1>
      <div className="mt-8">
        <FavouritesClient locale={locale} />
      </div>
    </div>
  );
}
