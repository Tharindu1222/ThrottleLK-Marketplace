import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DealerMapMultiEmbed } from '@/components/dealer-map-multi-embed';
import { apiGet } from '@/lib/api';
import { isLocale, t, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type MapDealer = {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  coverImageUrl: string | null;
  verifiedAt?: string | null;
  city?: { name: string } | null;
  district?: { name: string } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    title: 'Dealer map — motorcycle showrooms in Sri Lanka',
    description:
      'See approved ThrottleLK dealers on the map and open their showrooms.',
    path: `/${locale}/dealers/map`,
  });
}

export default async function DealersMapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const dealers = await apiGet<MapDealer[]>('/api/v1/dealers/map').catch(
    () => [] as MapDealer[],
  );

  return (
    <main className="flex min-h-[calc(100dvh-8.5rem)] flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide sm:text-3xl">
            {t(locale, 'dealersMap')}
          </h1>
        </div>
        <Link
          href={`/${locale}/dealers`}
          className="inline-flex items-center justify-center rounded-full border border-black/15 bg-background px-4 py-2 text-sm font-medium transition hover:border-accent/40"
        >
          {t(locale, 'dealersListView')}
        </Link>
      </div>

      {dealers.length === 0 ? (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-4 px-6 pb-16">
          <p className="text-muted">{t(locale, 'dealersMapEmpty')}</p>
          <Link
            href={`/${locale}/dealers`}
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.75)] transition hover:brightness-110"
          >
            {t(locale, 'dealersListView')}
          </Link>
        </div>
      ) : (
        <div className="relative min-h-[420px] flex-1 border-t border-black/10">
          <DealerMapMultiEmbed
            dealers={dealers}
            locale={locale}
            viewShowroomLabel={t(locale, 'viewShowroom')}
            verifiedLabel={t(locale, 'verified')}
            className="absolute inset-0 h-full min-h-[420px] border-0"
          />
        </div>
      )}
    </main>
  );
}
