import { notFound } from 'next/navigation';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { MyListingsClient } from './my-listings-client';

export default async function MyListingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        {t(locale, 'myListings')}
      </h1>
      <p className="mt-2 text-sm text-muted">{t(locale, 'myListingsHint')}</p>
      <MyListingsClient locale={locale} layout="cards" />
    </main>
  );
}
