'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { apiGet } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';

type Brand = { id: string; name: string };
type Model = { id: string; name: string };
type Category = { id: string; name: string };
type District = { id: string; name: string };
type City = { id: string; name: string };

const SORTS = [
  { value: 'newest', labelKey: 'sortNewest' },
  { value: 'oldest', labelKey: 'sortOldest' },
  { value: 'price_asc', labelKey: 'sortPriceAsc' },
  { value: 'price_desc', labelKey: 'sortPriceDesc' },
  { value: 'mileage_asc', labelKey: 'sortMileageAsc' },
  { value: 'mileage_desc', labelKey: 'sortMileageDesc' },
  { value: 'year_desc', labelKey: 'sortYearDesc' },
  { value: 'year_asc', labelKey: 'sortYearAsc' },
  { value: 'popular', labelKey: 'sortPopular' },
] as const;

export type BrowseFilterState = {
  q?: string;
  brandId?: string;
  modelId?: string;
  categoryId?: string;
  districtId?: string;
  cityId?: string;
  minPrice?: string;
  maxPrice?: string;
  minYear?: string;
  maxYear?: string;
  minRegistrationYear?: string;
  maxRegistrationYear?: string;
  minMileage?: string;
  maxMileage?: string;
  minEngineCc?: string;
  maxEngineCc?: string;
  condition?: string;
  fuelType?: string;
  transmission?: string;
  sellerType?: string;
  featured?: string;
  negotiable?: string;
  sort?: string;
};

const fieldClass =
  'w-full min-w-0 max-w-full bg-background px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-accent disabled:opacity-50';

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

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
  initial: BrowseFilterState;
}) {
  const uid = useId();
  const [brandId, setBrandId] = useState(initial.brandId ?? '');
  const [districtId, setDistrictId] = useState(initial.districtId ?? '');
  const [models, setModels] = useState<Model[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    void apiGet<Model[]>(`/api/v1/brands/${brandId}/models`)
      .then(setModels)
      .catch(() => setModels([]));
  }, [brandId]);

  useEffect(() => {
    if (!districtId) {
      setCities([]);
      return;
    }
    void apiGet<City[]>(`/api/v1/locations/districts/${districtId}/cities`)
      .then(setCities)
      .catch(() => setCities([]));
  }, [districtId]);

  return (
    <div className="min-w-0 w-full">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between border border-black/15 bg-surface/60 px-4 py-3 text-left font-[family-name:var(--font-display)] tracking-wide lg:hidden"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{t(locale, 'filters')}</span>
        <span className="text-sm text-muted">{open ? '−' : '+'}</span>
      </button>

      <form
        method="get"
        action={`/${locale}/bikes`}
        className={
          open
            ? 'mt-3 flex w-full min-w-0 flex-col gap-3 border border-black/10 bg-surface/60 p-4 lg:mt-0'
            : 'mt-3 hidden w-full min-w-0 flex-col gap-3 border border-black/10 bg-surface/60 p-4 lg:mt-0 lg:flex'
        }
      >
        <p className="hidden font-[family-name:var(--font-display)] text-lg tracking-wide lg:block">
          {t(locale, 'filters')}
        </p>
        <FilterField id={`${uid}-q`} label={t(locale, 'searchLabel')}>
          <input
            id={`${uid}-q`}
            name="q"
            defaultValue={initial.q}
            placeholder={t(locale, 'searchPlaceholder')}
            className={fieldClass}
          />
        </FilterField>
        <FilterField id={`${uid}-brand`} label={t(locale, 'brandFilter')}>
          <select
            id={`${uid}-brand`}
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
        </FilterField>
        <FilterField id={`${uid}-model`} label={t(locale, 'modelFilter')}>
          <select
            id={`${uid}-model`}
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
        </FilterField>
        <FilterField id={`${uid}-category`} label={t(locale, 'categoryFilter')}>
          <select
            id={`${uid}-category`}
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
        </FilterField>
        <FilterField id={`${uid}-district`} label={t(locale, 'districtFilter')}>
          <select
            id={`${uid}-district`}
            name="districtId"
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            className={fieldClass}
          >
            <option value="">{t(locale, 'districtFilter')}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField id={`${uid}-city`} label={t(locale, 'cityFilter')}>
          <select
            id={`${uid}-city`}
            name="cityId"
            defaultValue={initial.cityId}
            disabled={!districtId}
            className={fieldClass}
          >
            <option value="">{t(locale, 'cityFilter')}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField id={`${uid}-condition`} label={t(locale, 'condition')}>
          <select
            id={`${uid}-condition`}
            name="condition"
            defaultValue={initial.condition}
            className={fieldClass}
          >
            <option value="">{t(locale, 'condition')}</option>
            <option value="new">{t(locale, 'conditionNew')}</option>
            <option value="used">{t(locale, 'conditionUsed')}</option>
            <option value="reconditioned">
              {t(locale, 'conditionReconditioned')}
            </option>
          </select>
        </FilterField>
        <FilterField id={`${uid}-fuel`} label={t(locale, 'fuelFilter')}>
          <select
            id={`${uid}-fuel`}
            name="fuelType"
            defaultValue={initial.fuelType}
            className={fieldClass}
          >
            <option value="">{t(locale, 'fuelFilter')}</option>
            <option value="petrol">{t(locale, 'fuelPetrol')}</option>
            <option value="diesel">{t(locale, 'fuelDiesel')}</option>
            <option value="electric">{t(locale, 'fuelElectric')}</option>
            <option value="hybrid">{t(locale, 'fuelHybrid')}</option>
          </select>
        </FilterField>
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <FilterField id={`${uid}-minPrice`} label={t(locale, 'minPrice')}>
            <input
              id={`${uid}-minPrice`}
              name="minPrice"
              defaultValue={initial.minPrice}
              placeholder={t(locale, 'minPrice')}
              className={fieldClass}
            />
          </FilterField>
          <FilterField id={`${uid}-maxPrice`} label={t(locale, 'maxPrice')}>
            <input
              id={`${uid}-maxPrice`}
              name="maxPrice"
              defaultValue={initial.maxPrice}
              placeholder={t(locale, 'maxPrice')}
              className={fieldClass}
            />
          </FilterField>
        </div>
        <label className="flex min-h-11 min-w-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="featured"
            value="true"
            defaultChecked={initial.featured === 'true'}
          />
          {t(locale, 'featuredOnly')}
        </label>
        <label className="flex min-h-11 min-w-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="negotiable"
            value="true"
            defaultChecked={initial.negotiable === 'true'}
          />
          {t(locale, 'negotiableOnly')}
        </label>
        <FilterField id={`${uid}-sort`} label={t(locale, 'sortLabel')}>
          <select
            id={`${uid}-sort`}
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
        </FilterField>
        <button
          type="submit"
          className="min-h-11 bg-accent px-4 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-white transition hover:brightness-110"
        >
          {t(locale, 'applyFilters')}
        </button>
      </form>
    </div>
  );
}
