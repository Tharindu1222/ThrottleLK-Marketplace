'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';

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
  };
  hiddenFields?: Record<string, string>;
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
        <input
          name="q"
          defaultValue={initial.q}
          placeholder={t(locale, 'searchPlaceholder')}
          className={fieldClass}
        />
        <select
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
        <select
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
        <div className="grid grid-cols-2 gap-2">
          <input
            name="minPrice"
            type="number"
            min={0}
            defaultValue={initial.minPrice}
            placeholder={t(locale, 'minPrice')}
            className={fieldClass}
          />
          <input
            name="maxPrice"
            type="number"
            min={0}
            defaultValue={initial.maxPrice}
            placeholder={t(locale, 'maxPrice')}
            className={fieldClass}
          />
        </div>
        <select
          name="condition"
          defaultValue={initial.condition ?? ''}
          className={fieldClass}
        >
          <option value="">{t(locale, 'condition')}</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
          className="bg-foreground px-4 py-2.5 text-sm text-white transition hover:bg-foreground/90"
        >
          {t(locale, 'applyFilters')}
        </button>
      </form>
    </div>
  );
}
