import Link from 'next/link';
import { PartCard, type BrowsePartCard } from '@/components/part-card';
import { apiGet } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';

export async function PartAccessoriesRail({
  locale,
  excludeId,
  brandId,
  modelId,
}: {
  locale: Locale;
  excludeId?: string;
  brandId?: string | null;
  modelId?: string | null;
}) {
  const items = await apiGet<BrowsePartCard[]>('/api/v1/part-listings', {
    searchParams: { kind: 'accessory', limit: '8' },
  }).catch(() => [] as BrowsePartCard[]);
  const accessories = items
    .filter((item) => item.id !== excludeId)
    .slice(0, 4);
  if (accessories.length === 0) return null;

  const params = new URLSearchParams({ kind: 'accessory' });
  if (brandId) params.set('brandId', brandId);
  if (modelId) params.set('modelId', modelId);

  return (
    <section className="mt-14 border-t border-black/10 pt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
          {t(locale, 'riderAccessoriesNav')}
        </h2>
        <Link
          href={`/${locale}/bike-parts?${params.toString()}`}
          className="inline-flex items-center justify-center rounded-full border border-black/15 px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground transition hover:border-accent hover:text-accent"
        >
          {t(locale, 'seeMore')}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {accessories.map((item) => (
          <PartCard key={item.id} locale={locale} part={item} />
        ))}
      </div>
    </section>
  );
}
