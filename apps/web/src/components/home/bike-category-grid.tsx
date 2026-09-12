import type { Locale } from '@/lib/i18n';
import { apiGet } from '@/lib/api';
import { bikeCategories, type BikeCategory } from '@/lib/bike-categories';
import { BikeCategoryCard } from './bike-category-card';

type ApiCategory = {
  slug: string;
  coverImageUrl?: string | null;
};

export async function BikeCategoryGrid({ locale }: { locale: Locale }) {
  const apiCategories = await apiGet<ApiCategory[]>(
    '/api/v1/categories?scope=public',
  ).catch(() => [] as ApiCategory[]);

  const coverBySlug = new Map(
    apiCategories.map((c) => [c.slug, c.coverImageUrl ?? null]),
  );

  const categories: BikeCategory[] = bikeCategories.map((category) => {
    const cover = coverBySlug.get(category.slug);
    return cover ? { ...category, image: cover } : category;
  });

  return (
    <section
      className="relative mx-auto max-w-6xl bg-background px-6 pt-14 pb-16 sm:pt-16"
      data-reveal="categories"
    >
      <div className="mb-8 max-w-2xl" data-categories-header>
        <div className="mb-3 flex items-center gap-3">
          <span
            data-categories-accent
            aria-hidden
            className="h-px w-12 bg-accent"
          />
          <p
            data-categories-copy
            className="text-xs tracking-[0.35em] text-accent uppercase"
          >
            Categories
          </p>
        </div>
        <h2
          data-categories-copy
          className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl"
        >
          Choose Your Ride
        </h2>
        <p data-categories-copy className="mt-2 text-muted">
          What type of bike are you looking for?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {categories.map((category) => (
          <div
            key={category.slug}
            data-category-card
            className="origin-bottom will-change-transform"
          >
            <BikeCategoryCard locale={locale} category={category} />
          </div>
        ))}
      </div>
    </section>
  );
}
