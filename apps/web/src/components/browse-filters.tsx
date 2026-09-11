'use client';

import { useEffect, useState } from 'react';
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
    <form className="mt-8 grid gap-3 border border-white/10 bg-surface/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <input
        name="q"
        defaultValue={initial.q}
        placeholder={t(locale, 'searchPlaceholder')}
        className="bg-background px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-accent sm:col-span-2"
      />
      <select
        name="brandId"
        value={brandId}
        onChange={(e) => setBrandId(e.target.value)}
        className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
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
        className="bg-background px-3 py-2 text-sm ring-1 ring-white/10 disabled:opacity-50"
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
        className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
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
        className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
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
        className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
      >
        <option value="">{t(locale, 'condition')}</option>
        <option value="new">New</option>
        <option value="used">Used</option>
        <option value="reconditioned">Reconditioned</option>
      </select>
      <input
        name="minPrice"
        defaultValue={initial.minPrice}
        placeholder={t(locale, 'minPrice')}
        className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
      />
      <input
        name="maxPrice"
        defaultValue={initial.maxPrice}
        placeholder={t(locale, 'maxPrice')}
        className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
      />
      <input
        name="minYear"
        defaultValue={initial.minYear}
        placeholder={t(locale, 'minYear')}
        className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
      />
      <input
        name="maxYear"
        defaultValue={initial.maxYear}
        placeholder={t(locale, 'maxYear')}
        className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
      />
      <select
        name="sort"
        defaultValue={initial.sort ?? 'newest'}
        className="bg-background px-3 py-2 text-sm ring-1 ring-white/10 sm:col-span-2"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {t(locale, s.labelKey)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-accent px-4 py-2 font-[family-name:var(--font-display)] tracking-wide text-background sm:col-span-2 lg:col-span-4"
      >
        {t(locale, 'applyFilters')}
      </button>
    </form>
  );
}
