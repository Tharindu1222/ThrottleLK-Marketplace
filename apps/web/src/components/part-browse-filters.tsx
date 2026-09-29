'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { apiGet } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';
import { listingConditionLabel } from '@/lib/listing-labels';

type Brand = { id: string; name: string };
type Model = { id: string; name: string };
type Category = {
  id: string;
  name: string;
  parentId?: string | null;
  parentName?: string | null;
};
type District = { id: string; name: string };

const SORTS = [
  { value: 'newest', labelKey: 'sortNewest' as const },
  { value: 'oldest', labelKey: 'sortOldest' as const },
  { value: 'price_asc', labelKey: 'sortPriceAsc' as const },
  { value: 'price_desc', labelKey: 'sortPriceDesc' as const },
];

const CONDITIONS = ['new', 'used', 'reconditioned'] as const;

const fieldClass =
  'w-full bg-background px-3 py-2 text-sm outline-none ring-1 ring-black/10 focus:ring-accent disabled:opacity-50';

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
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export function PartBrowseFilters({
  locale,
  actionPath,
  brands,
  districts,
  categories,
  initial,
  hiddenFields,
}: {
  locale: Locale;
  actionPath: string;
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
    condition?: string;
    sort?: string;
    kind?: string;
  };
  hiddenFields?: Record<string, string>;
}) {
  const uid = useId();
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
          initial.condition ||
          initial.kind,
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
        action={actionPath}
        className={`mt-3 flex flex-col gap-3 border border-black/10 bg-surface/60 p-4 lg:mt-0 ${
          open ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <p className="hidden font-[family-name:var(--font-display)] text-lg tracking-wide lg:block">
          {t(locale, 'filters')}
        </p>
        {hiddenFields
          ? Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))
          : null}
        <FilterField id={`${uid}-q`} label={t(locale, 'searchLabel')}>
          <input
            id={`${uid}-q`}
            name="q"
            defaultValue={initial.q}
            placeholder={t(locale, 'searchPlaceholder')}
            className={fieldClass}
          />
        </FilterField>
        <FilterField id={`${uid}-kind`} label={t(locale, 'partKindFilter')}>
          <select
            id={`${uid}-kind`}
            name="kind"
            defaultValue={initial.kind ?? ''}
            className={fieldClass}
          >
            <option value="">{t(locale, 'allPartsNav')}</option>
            <option value="spare">{t(locale, 'sparePartsNav')}</option>
            <option value="modified">{t(locale, 'modifiedPartsNav')}</option>
          </select>
        </FilterField>
        <FilterField
          id={`${uid}-category`}
          label={t(locale, 'partCategoryFilter')}
        >
          <select
            id={`${uid}-category`}
            name="categoryId"
            defaultValue={initial.categoryId ?? ''}
            className={fieldClass}
          >
            <option value="">{t(locale, 'partCategoryFilter')}</option>
            {(() => {
              const groups = new Map<string, Category[]>();
              for (const c of categories) {
                const key = c.parentName ?? 'Other';
                const list = groups.get(key) ?? [];
                list.push(c);
                groups.set(key, list);
              }
              return [...groups.entries()].map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ));
            })()}
          </select>
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
            defaultValue={initial.modelId ?? ''}
            disabled={!brandId}
            className={fieldClass}
          >
            <option value="">{t(locale, 'searchOrSelectModel')}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField id={`${uid}-district`} label={t(locale, 'districtFilter')}>
          <select
            id={`${uid}-district`}
            name="districtId"
            defaultValue={initial.districtId ?? ''}
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
        <div className="grid grid-cols-2 gap-2">
          <FilterField id={`${uid}-minPrice`} label={t(locale, 'minPrice')}>
            <input
              id={`${uid}-minPrice`}
              name="minPrice"
              type="number"
              min={0}
              defaultValue={initial.minPrice}
              placeholder={t(locale, 'minPrice')}
              className={fieldClass}
            />
          </FilterField>
          <FilterField id={`${uid}-maxPrice`} label={t(locale, 'maxPrice')}>
            <input
              id={`${uid}-maxPrice`}
              name="maxPrice"
              type="number"
              min={0}
              defaultValue={initial.maxPrice}
              placeholder={t(locale, 'maxPrice')}
              className={fieldClass}
            />
          </FilterField>
        </div>
        <FilterField id={`${uid}-condition`} label={t(locale, 'condition')}>
          <select
            id={`${uid}-condition`}
            name="condition"
            defaultValue={initial.condition ?? ''}
            className={fieldClass}
          >
            <option value="">{t(locale, 'condition')}</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {listingConditionLabel(locale, c)}
              </option>
            ))}
          </select>
        </FilterField>
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
          className="bg-foreground px-4 py-2.5 text-sm text-white transition hover:bg-foreground/90"
        >
          {t(locale, 'applyFilters')}
        </button>
      </form>
    </div>
  );
}
