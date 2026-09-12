import type { Locale } from '@/lib/i18n';
import { bikeCategories } from '@/lib/bike-categories';
import { BikeCategoryCard } from './bike-category-card';

export function BikeCategoryGrid({ locale }: { locale: Locale }) {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-4 sm:pt-6">
      <div className="mb-8 max-w-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
          Choose Your Ride
        </h2>
        <p className="mt-2 text-muted">
          What type of bike are you looking for?
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {bikeCategories.map((category) => (
          <BikeCategoryCard
            key={category.slug}
            locale={locale}
            category={category}
          />
        ))}
      </div>
    </section>
  );
}
