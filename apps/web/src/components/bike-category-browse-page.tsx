import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ListingCard, type BrowseListingCard } from '@/components/listing-card';
import { apiGet } from '@/lib/api';
import { getBikeCategory, type BikeCategory } from '@/lib/bike-categories';
import { isLocale, t, type Locale } from '@/lib/i18n';

type Category = { id: string; name: string; slug: string };

export function categoryPageMetadata(category: BikeCategory): Metadata {
  return {
    title: `${category.name} for Sale in Sri Lanka`,
    description: `${category.description}. ${category.examples}. Buy and sell on ThrottleLK — Sri Lanka's motorbike marketplace.`,
  };
}

export async function BikeCategoryBrowsePage({
  locale: raw,
  categorySlug,
}: {
  locale: string;
  categorySlug: string;
}) {
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const marketing = getBikeCategory(categorySlug);
  if (!marketing) notFound();

  const categories = await apiGet<Category[]>('/api/v1/categories', {
    searchParams: { scope: 'public' },
  }).catch(() => [] as Category[]);

  const matched = categories.find((c) =>
    marketing.taxonomySlugs.includes(c.slug),
  );

  const listings = await apiGet<BrowseListingCard[]>('/api/v1/listings', {
    searchParams: {
      categoryId: matched?.id,
    },
  }).catch(() => [] as BrowseListingCard[]);

  const browseHref = matched
    ? `/${locale}/bikes?categoryId=${matched.id}`
    : `/${locale}/bikes`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-xs tracking-[0.3em] text-accent uppercase">
        Motorbike category
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide sm:text-5xl">
        {marketing.name}
      </h1>
      <p className="mt-3 max-w-2xl text-muted">{marketing.description}</p>
      <p className="mt-1 text-sm text-foreground/45">{marketing.examples}</p>

      <div className="mt-6">
        <Link
          href={browseHref}
          className="inline-flex border border-black/15 px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
        >
          Refine search
        </Link>
      </div>

      <div className="mt-10 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <ListingCard key={listing.id} locale={locale} listing={listing} />
        ))}
      </div>

      {listings.length === 0 ? (
        <p className="mt-10 text-muted">
          No {marketing.name.toLowerCase()} listed yet.{' '}
          <Link href={`/${locale}/bikes`} className="text-accent underline">
            {t(locale, 'browse')}
          </Link>
        </p>
      ) : null}
    </main>
  );
}
