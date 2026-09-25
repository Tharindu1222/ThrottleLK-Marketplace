import Link from 'next/link';
import { HomeBrandGrid, type HomeBrand } from './home-brand-grid';
import { HOME_SHELL, shouldShowDiscover } from '@/lib/home-shop';
import { t, type Locale } from '@/lib/i18n';

type District = { id: string; name: string; slug: string };

export function HomeDiscover({
  locale,
  brands,
  districts,
}: {
  locale: Locale;
  brands: HomeBrand[];
  districts: District[];
}) {
  if (!shouldShowDiscover(brands, districts)) return null;

  return (
    <section
      className={`${HOME_SHELL} pt-14 pb-20`}
      aria-labelledby="home-discover"
      data-reveal
    >
      <h2
        id="home-discover"
        className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
      >
        {t(locale, 'homeDiscoverTitle')}
      </h2>

      <div className="mt-8 space-y-12">
        {brands.length > 0 ? (
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {t(locale, 'homeDiscoverBrands')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t(locale, 'homeDiscoverBrandsSubtitle')}
            </p>
            <HomeBrandGrid locale={locale} brands={brands} />
          </div>
        ) : null}

        {districts.length > 0 ? (
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {t(locale, 'homeDiscoverDistricts')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t(locale, 'homeDiscoverDistrictsSubtitle')}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {districts.map((district) => (
                <li key={district.id}>
                  <Link
                    href={`/${locale}/bikes?districtId=${district.id}`}
                    className="inline-flex rounded-md bg-surface px-3.5 py-2 text-sm font-medium text-foreground ring-1 ring-black/10 transition hover:bg-white hover:text-accent hover:ring-accent"
                  >
                    {district.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
