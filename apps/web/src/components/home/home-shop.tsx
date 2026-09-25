import Link from 'next/link';
import { apiGet } from '@/lib/api';
import {
  HOME_PILLARS,
  HOME_SHELL,
  resolveHomeBikeTypes,
  type HomeApiCategory,
} from '@/lib/home-shop';
import { t, type Locale } from '@/lib/i18n';
import type { HomeBrand } from '@/components/home/home-brand-grid';
import { BikeCategoryCard } from './bike-category-card';
import { HomeBrandTicker } from './home-brand-ticker';

export async function HomeShop({
  locale,
  brands,
}: {
  locale: Locale;
  brands: HomeBrand[];
}) {
  const apiCategories = await apiGet<HomeApiCategory[]>(
    '/api/v1/categories?scope=public',
  ).catch(() => [] as HomeApiCategory[]);
  const types = resolveHomeBikeTypes(locale, apiCategories);

  return (
    <section className="bg-white">
      <div className={`${HOME_SHELL} pt-10 pb-5 sm:pt-12 sm:pb-6`}>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:gap-10">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
              {t(locale, 'homeShopNav')}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t(locale, 'homeShopTitle')}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              {t(locale, 'homeShopSubtitle')}
            </p>
          </div>

          <nav aria-label={t(locale, 'homeShopNav')}>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {HOME_PILLARS.map((pillar) => (
                <li key={pillar.id}>
                  <Link
                    href={pillar.href(locale)}
                    className="group flex h-full items-center gap-3 rounded-2xl bg-[#f6f6f6] px-3 py-3 transition hover:bg-[#efefef]"
                  >
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pillar.image}
                        alt=""
                        className="h-14 w-14 object-contain"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-semibold text-foreground">
                          {t(locale, pillar.titleKey)}
                        </span>
                        <span
                          aria-hidden
                          className="text-accent transition group-hover:translate-x-0.5"
                        >
                          →
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted">
                        {t(locale, pillar.promiseKey)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <HomeBrandTicker locale={locale} brands={brands} />

      <div className={`${HOME_SHELL} pb-10 sm:pb-12`}>
        <div className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                {t(locale, 'homeBrowseEyebrow')}
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t(locale, 'homeChooseRide')}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {t(locale, 'homeChooseRideSubtitle')}
              </p>
            </div>
            <Link
              href={`/${locale}/bikes`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:text-accent"
            >
              {t(locale, 'homeViewAllCategories')}
              <span aria-hidden>→</span>
            </Link>
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {types.map((category) => (
              <li key={category.slug}>
                <BikeCategoryCard
                  locale={locale}
                  category={category}
                  href={category.href}
                  variant="compact"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
