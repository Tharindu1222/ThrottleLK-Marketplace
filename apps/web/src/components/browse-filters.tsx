'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';

type Brand = { id: string; name: string };
type Model = { id: string; name: string };
type Category = { id: string; name: string };
type District = { id: string; name: string };

const SORTS = [
  { value: 'newest', labelKey: 'sortNewest' },
  { value: 'oldest', labelKey: 'sortOldest' },
  { value: 'price_asc', labelKey: 'sortPriceAsc' },
  { value: 'price_desc', labelKey: 'sortPriceDesc' },
  { value: 'mileage_asc', labelKey: 'sortMileageAsc' },
  { value: 'mileage_desc', labelKey: 'sortMileageDesc' },
  { value: 'year_desc', labelKey: 'sortYearDesc' },
  { value: 'year_asc', labelKey: 'sortYearAsc' },
] as const;

const fieldClass =
  'w-full bg-background px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-accent disabled:opacity-50';

export function BrowseFilters({
  locale,
  brands,
  districts,
  categories,
  initial,
}: {
  locale: Locale;
  brands: Brand[];
  districts: District[];
  categories: Category[];
  initial: {
    q?: string;
    brandId?: string;
    modelId?: string;
    categoryId?: string;
    districtId?: string;
    minPrice?: string;
    maxPrice?: string;
    minYear?: string;
    maxYear?: string;
    condition?: string;
    sort?: string;
  };
}) {
  const [brandId, setBrandId] = useState(initial.brandId ?? '');
  const [models, setModels] = useState<Model[]>([]);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        initial.q ||
          initial.brandId ||
          initial.modelId ||
          initial.categoryId ||
          initial.districtId ||
          initial.minPrice ||
          initial.maxPrice ||
          initial.minYear ||
          initial.maxYear ||
          initial.condition,
      ),
    [initial],
  );

  const [open, setOpen] = useState(hasActiveFilters);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    void apiGet<Model[]>(`/api/v1/brands/${brandId}/models`)
      .then(setModels)
      .catch(() => setModels([]));
  }, [brandId]);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between border border-black/15 bg-surface/60 px-4 py-3 text-left font-[family-name:var(--font-display)] tracking-wide lg:hidden"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{t(locale, 'filters')}</span>
        <span className="text-sm text-muted">{open ? '−' : '+'}</span>
      </button>

      <form
        method="get"
        action={`/${locale}/bikes`}
        className={`mt-3 flex flex-col gap-3 border border-black/10 bg-surface/60 p-4 lg:mt-0 ${
          open ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <p className="hidden font-[family-name:var(--font-display)] text-lg tracking-wide lg:block">
          {t(locale, 'filters')}
        </p>
        <input
          name="q"
          defaultValue={initial.q}
          placeholder={t(locale, 'searchPlaceholder')}
          className={fieldClass}
        />
        <select
          name="brandId"
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className={fieldClass}
        >
          <option value="">{t(locale, 'brandFilter')}</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          name="modelId"
          defaultValue={initial.modelId}
          disabled={!brandId}
          className={fieldClass}
        >
          <option value="">{t(locale, 'modelFilter')}</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          name="categoryId"
          defaultValue={initial.categoryId}
          className={fieldClass}
        >
          <option value="">{t(locale, 'categoryFilter')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="districtId"
          defaultValue={initial.districtId}
          className={fieldClass}
        >
          <option value="">{t(locale, 'districtFilter')}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          name="condition"
          defaultValue={initial.condition}
          className={fieldClass}
        >
          <option value="">{t(locale, 'condition')}</option>
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="reconditioned">Reconditioned</option>
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="minPrice"
            defaultValue={initial.minPrice}
            placeholder={t(locale, 'minPrice')}
            className={fieldClass}
          />
          <input
            name="maxPrice"
            defaultValue={initial.maxPrice}
            placeholder={t(locale, 'maxPrice')}
            className={fieldClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="minYear"
            defaultValue={initial.minYear}
            placeholder={t(locale, 'minYear')}
            className={fieldClass}
          />
          <input
            name="maxYear"
            defaultValue={initial.maxYear}
            placeholder={t(locale, 'maxYear')}
            className={fieldClass}
          />
        </div>
        <select
          name="sort"
          defaultValue={initial.sort ?? 'newest'}
          className={fieldClass}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {t(locale, s.labelKey)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-accent px-4 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-white transition hover:brightness-110"
        >
          {t(locale, 'applyFilters')}
        </button>
      </form>
    </div>
  );
}
