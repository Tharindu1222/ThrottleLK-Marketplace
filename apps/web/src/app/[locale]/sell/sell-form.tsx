'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ListingImageManager } from '@/components/listing-image-manager';
import {
  SearchableCombobox,
  type ComboboxOption,
} from '@/components/searchable-combobox';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

type Option = { id: string; name: string; slug?: string };
type CatalogModel = {
  id: string;
  name: string;
  brandId: string;
  defaultCategory: string | null;
  publicCategory: string | null;
  defaultEngineCc: number | null;
  fuelType: string | null;
  fuelTypeNormalized: 'petrol' | 'electric' | 'other' | null;
};

type FormState = {
  brandId: string;
  brandLabel: string;
  modelId: string;
  modelLabel: string;
  categoryId: string;
  manufactureYear: string;
  engineCc: string;
  fuelType: 'petrol' | 'electric' | 'other';
  condition: string;
  transmission: string;
  mileage: string;
  priceLkr: string;
  districtId: string;
  cityId: string;
  description: string;
  phone: string;
  dealerId: string;
};

const STEPS = [
  { id: 1, label: 'Bike' },
  { id: 2, label: 'Specs' },
  { id: 3, label: 'Details' },
  { id: 4, label: 'Photos' },
] as const;

const fieldClass =
  'w-full bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-white/10 focus:ring-accent';
const labelClass = 'mb-1.5 block text-sm text-muted';

const emptyForm: FormState = {
  brandId: '',
  brandLabel: '',
  modelId: '',
  modelLabel: '',
  categoryId: '',
  manufactureYear: String(new Date().getFullYear()),
  engineCc: '',
  fuelType: 'petrol',
  condition: 'used',
  transmission: 'manual',
  mileage: '',
  priceLkr: '',
  districtId: '',
  cityId: '',
  description: '',
  phone: '',
  dealerId: '',
};

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function SellForm({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [brandOptions, setBrandOptions] = useState<ComboboxOption[]>([]);
  const [modelOptions, setModelOptions] = useState<ComboboxOption[]>([]);
  const [modelMeta, setModelMeta] = useState<CatalogModel[]>([]);
  const [brandQuery, setBrandQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [categories, setCategories] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [dealers, setDealers] = useState<
    { id: string; name: string; status: string }[]
  >([]);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [engineTouched, setEngineTouched] = useState(false);
  const [fuelTouched, setFuelTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const debouncedBrandQuery = useDebounced(brandQuery, 250);
  const debouncedModelQuery = useDebounced(modelQuery, 250);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void Promise.all([
      apiGet<Option[]>('/api/v1/categories', {
        searchParams: { scope: 'public' },
      }),
      apiGet<Option[]>('/api/v1/locations/districts'),
      apiGet<{ id: string; name: string; status: string }[]>(
        '/api/v1/dealers/mine',
        { token: access },
      ).catch(() => []),
    ]).then(([c, d, mine]) => {
      setCategories(c);
      setDistricts(d);
      setDealers(mine.filter((x) => x.status === 'active'));
    });
  }, []);

  useEffect(() => {
    setBrandsLoading(true);
    void apiGet<Option[]>('/api/v1/brands', {
      searchParams: { search: debouncedBrandQuery || undefined },
    })
      .then((rows) =>
        setBrandOptions(rows.map((b) => ({ id: b.id, label: b.name }))),
      )
      .catch(() => setBrandOptions([]))
      .finally(() => setBrandsLoading(false));
  }, [debouncedBrandQuery]);

  useEffect(() => {
    if (!form.brandId) {
      setModelOptions([]);
      setModelMeta([]);
      return;
    }
    setModelsLoading(true);
    void apiGet<CatalogModel[]>(`/api/v1/brands/${form.brandId}/models`, {
      searchParams: { search: debouncedModelQuery || undefined },
    })
      .then((rows) => {
        setModelMeta(rows);
        setModelOptions(rows.map((m) => ({ id: m.id, label: m.name })));
      })
      .catch(() => {
        setModelMeta([]);
        setModelOptions([]);
      })
      .finally(() => setModelsLoading(false));
  }, [form.brandId, debouncedModelQuery]);

  useEffect(() => {
    if (!form.districtId) {
      setCities([]);
      return;
    }
    void apiGet<Option[]>(
      `/api/v1/locations/districts/${form.districtId}/cities`,
    ).then(setCities);
  }, [form.districtId]);

  const autoTitle = useMemo(() => {
    const parts = [
      form.brandLabel,
      form.modelLabel,
      form.manufactureYear,
    ].filter(Boolean);
    return parts.join(' ').trim();
  }, [form.brandLabel, form.modelLabel, form.manufactureYear]);

  const isElectric =
    form.fuelType === 'electric' ||
    categories
      .find((c) => c.id === form.categoryId)
      ?.name.toLowerCase()
      .includes('electric') === true;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyModelAutofill(model: CatalogModel) {
    setForm((f) => {
      const next = { ...f, modelId: model.id, modelLabel: model.name };
      if (!categoryTouched && model.publicCategory) {
        const match = categories.find(
          (c) =>
            c.name.toLowerCase() === model.publicCategory!.toLowerCase() ||
            c.slug ===
              model.publicCategory!.toLowerCase().replace(/\s+/g, '-'),
        );
        if (match) next.categoryId = match.id;
      }
      if (!engineTouched) {
        next.engineCc =
          model.fuelTypeNormalized === 'electric' || !model.defaultEngineCc
            ? ''
            : String(model.defaultEngineCc);
      }
      if (!fuelTouched && model.fuelTypeNormalized) {
        next.fuelType =
          model.fuelTypeNormalized === 'other'
            ? 'petrol'
            : model.fuelTypeNormalized;
      }
      return next;
    });
  }

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!form.brandId) return 'Brand is required';
      if (!form.modelId) return 'Model is required';
      if (!form.categoryId) return 'Category is required';
    }
    if (current === 2) {
      const year = Number(form.manufactureYear);
      if (!year || year < 1970 || year > 2100)
        return 'Manufacture year is required';
      if (!isElectric && (!form.engineCc || Number(form.engineCc) <= 0))
        return 'Engine capacity is required';
      if (!form.condition) return 'Condition is required';
      if (!form.transmission) return 'Transmission is required';
      if (!form.fuelType) return 'Fuel type is required';
      if (form.mileage === '' || Number(form.mileage) < 0)
        return 'Mileage is required';
      if (!form.priceLkr || Number(form.priceLkr) <= 0) return 'Price is required';
    }
    if (current === 3) {
      if (!form.districtId) return 'District is required';
      if (!form.cityId) return 'City is required';
      if (!form.description || form.description.trim().length < 20)
        return 'Description must be at least 20 characters';
      if (!form.phone || form.phone.trim().length < 9)
        return 'Phone number is required';
    }
    if (current === 4) {
      if (!listingId) return 'Listing not created yet';
      if (photoCount < 1) return 'Add at least 1 photo';
    }
    return null;
  }

  function listingBody() {
    return {
      brandId: form.brandId,
      modelId: form.modelId,
      categoryId: form.categoryId,
      districtId: form.districtId,
      cityId: form.cityId,
      title: autoTitle.length >= 5 ? autoTitle : `${autoTitle} bike`,
      description: form.description.trim(),
      priceLkr: Number(form.priceLkr),
      negotiable: true,
      manufactureYear: Number(form.manufactureYear),
      engineCc:
        form.engineCc && Number(form.engineCc) > 0
          ? Number(form.engineCc)
          : undefined,
      mileage: Number(form.mileage),
      fuelType: form.fuelType,
      transmission: form.transmission,
      condition: form.condition,
      phone: form.phone.trim(),
      dealerId: form.dealerId || undefined,
    };
  }

  async function createDraftListing(access: string) {
    const listing = await apiSend<{ id: string }>('/api/v1/listings', {
      token: access,
      body: listingBody(),
    });
    return listing.id;
  }

  async function goNext() {
    setError(null);
    const issue = validateStep(step);
    if (issue) {
      setError(issue);
      return;
    }

    if (step === 3) {
      setBusy(true);
      try {
        const body = listingBody();
        if (listingId) {
          await apiSend(`/api/v1/listings/${listingId}`, {
            method: 'PATCH',
            token: token!,
            body,
          });
        } else {
          const id = await createDraftListing(token!);
          setListingId(id);
          setPhotoCount(0);
        }
        setStep(4);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save listing');
      } finally {
        setBusy(false);
      }
      return;
    }

    setStep((s) => Math.min(4, s + 1));
  }

  async function submitAd() {
    setError(null);
    const issue = validateStep(4);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    try {
      await apiSend(`/api/v1/listings/${listingId}/submit`, { token: token! });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <p className="mt-6 text-center text-muted">
        Sign in required —{' '}
        <Link href={`/${locale}/login`} className="text-accent underline">
          Sign In
        </Link>
      </p>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto mt-8 max-w-xl border border-white/10 bg-surface/40 p-6 text-left">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-accent">
          Ad submitted
        </p>
        <p className="mt-2 text-muted">
          Your listing is in admin review. It will appear publicly once approved.
        </p>
        <Link
          href={`/${locale}/account/listings`}
          className="mt-6 inline-flex bg-accent px-4 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-white"
        >
          Manage listings
        </Link>
      </div>
    );
  }

  const categoryChoices = categories;

  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <ol
        className="mb-8 flex flex-wrap justify-center gap-2"
        aria-label="Form steps"
      >
        {STEPS.map((s) => {
          const active = s.id === step;
          const done = s.id < step;
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2 border px-3 py-1.5 text-xs tracking-wide uppercase ${
                active
                  ? 'border-accent text-accent'
                  : done
                    ? 'border-white/20 text-foreground'
                    : 'border-white/10 text-muted'
              }`}
            >
              <span className="font-[family-name:var(--font-display)] text-sm">
                {s.id}
              </span>
              {s.label}
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <div className="grid gap-4 text-left">
          <SearchableCombobox
            label="Brand"
            required
            placeholder="Search or select brand"
            valueId={form.brandId}
            valueLabel={form.brandLabel}
            options={brandOptions}
            loading={brandsLoading}
            onQueryChange={setBrandQuery}
            onSelect={(opt) => {
              setForm((f) => ({
                ...f,
                brandId: opt.id,
                brandLabel: opt.label,
                modelId: '',
                modelLabel: '',
              }));
              setCategoryTouched(false);
              setEngineTouched(false);
              setFuelTouched(false);
              setModelQuery('');
            }}
            onClear={() => {
              setForm((f) => ({
                ...f,
                brandId: '',
                brandLabel: '',
                modelId: '',
                modelLabel: '',
              }));
              setModelOptions([]);
            }}
          />
          <SearchableCombobox
            label="Model"
            required
            placeholder={
              form.brandId ? 'Search or select model' : 'Select a brand first'
            }
            valueId={form.modelId}
            valueLabel={form.modelLabel}
            options={modelOptions}
            disabled={!form.brandId}
            loading={modelsLoading}
            onQueryChange={setModelQuery}
            onSelect={(opt) => {
              const meta = modelMeta.find((m) => m.id === opt.id);
              if (meta) applyModelAutofill(meta);
              else
                setForm((f) => ({
                  ...f,
                  modelId: opt.id,
                  modelLabel: opt.label,
                }));
            }}
            onClear={() =>
              setForm((f) => ({ ...f, modelId: '', modelLabel: '' }))
            }
          />
          <div>
            <label className={labelClass} htmlFor="categoryId">
              Category *
            </label>
            <select
              id="categoryId"
              required
              className={fieldClass}
              value={form.categoryId}
              onChange={(e) => {
                setCategoryTouched(true);
                setField('categoryId', e.target.value);
              }}
            >
              <option value="">Select category</option>
              {categoryChoices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 text-left sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="manufactureYear">
              Manufacture Year *
            </label>
            <input
              id="manufactureYear"
              type="number"
              required
              min={1970}
              max={2100}
              className={fieldClass}
              value={form.manufactureYear}
              onChange={(e) => setField('manufactureYear', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="engineCc">
              Engine Capacity (cc){isElectric ? '' : ' *'}
            </label>
            <input
              id="engineCc"
              type="number"
              required={!isElectric}
              min={1}
              disabled={isElectric}
              placeholder={isElectric ? 'N/A for electric' : undefined}
              className={fieldClass}
              value={form.engineCc}
              onChange={(e) => {
                setEngineTouched(true);
                setField('engineCc', e.target.value);
              }}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="fuelType">
              Fuel Type *
            </label>
            <select
              id="fuelType"
              required
              className={fieldClass}
              value={form.fuelType}
              onChange={(e) => {
                setFuelTouched(true);
                setField('fuelType', e.target.value as FormState['fuelType']);
              }}
            >
              <option value="petrol">Petrol</option>
              <option value="electric">Electric</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="condition">
              Condition *
            </label>
            <select
              id="condition"
              required
              className={fieldClass}
              value={form.condition}
              onChange={(e) => setField('condition', e.target.value)}
            >
              <option value="used">Used</option>
              <option value="new">New</option>
              <option value="reconditioned">Reconditioned</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="transmission">
              Transmission *
            </label>
            <select
              id="transmission"
              required
              className={fieldClass}
              value={form.transmission}
              onChange={(e) => setField('transmission', e.target.value)}
            >
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
              <option value="semi_automatic">Semi-auto</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="mileage">
              Mileage (km) *
            </label>
            <input
              id="mileage"
              type="number"
              required
              min={0}
              className={fieldClass}
              value={form.mileage}
              onChange={(e) => setField('mileage', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="priceLkr">
              Price (LKR) *
            </label>
            <input
              id="priceLkr"
              type="number"
              required
              min={1}
              className={fieldClass}
              value={form.priceLkr}
              onChange={(e) => setField('priceLkr', e.target.value)}
            />
          </div>
          {autoTitle ? (
            <p className="sm:col-span-2 text-sm text-muted">
              Title will be:{' '}
              <span className="text-foreground">{autoTitle}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4 text-left">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="districtId">
                District *
              </label>
              <select
                id="districtId"
                required
                className={fieldClass}
                value={form.districtId}
                onChange={(e) => {
                  setField('districtId', e.target.value);
                  setField('cityId', '');
                }}
              >
                <option value="">Select district</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="cityId">
                City *
              </label>
              <select
                id="cityId"
                required
                className={fieldClass}
                value={form.cityId}
                disabled={!form.districtId}
                onChange={(e) => setField('cityId', e.target.value)}
              >
                <option value="">Select city</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="description">
              Description *
            </label>
            <textarea
              id="description"
              required
              minLength={20}
              rows={5}
              className={fieldClass}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Condition, service history, extras…"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="phone">
              Phone number *
            </label>
            <input
              id="phone"
              type="tel"
              required
              minLength={9}
              className={fieldClass}
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="07XXXXXXXX"
            />
          </div>
          {dealers.length > 0 ? (
            <div>
              <label className={labelClass} htmlFor="dealerId">
                List under dealer (optional)
              </label>
              <select
                id="dealerId"
                className={fieldClass}
                value={form.dealerId}
                onChange={(e) => setField('dealerId', e.target.value)}
              >
                <option value="">Private listing</option>
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 4 && listingId ? (
        <div className="border border-white/10 bg-surface/40 p-4 text-left">
          <p className="text-sm text-muted">
            Add at least 1 photo * · first photo is the cover · up to 5
          </p>
          <ListingImageManager
            listingId={listingId}
            onChange={() => {
              void apiGet<{ id: string }[]>(
                `/api/v1/listings/${listingId}/images`,
                { token: token! },
              )
                .then((imgs) => setPhotoCount(imgs.length))
                .catch(() => undefined);
            }}
          />
          {photoCount < 1 ? (
            <p className="mt-3 text-sm text-accent">
              Upload at least one photo to continue.
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {photoCount} photo{photoCount === 1 ? '' : 's'} ready.
            </p>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-center text-sm text-red-400">{error}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {step > 1 && step < 4 ? (
          <button
            type="button"
            className="border border-white/20 px-4 py-2.5 text-sm text-foreground hover:border-accent"
            onClick={() => {
              setError(null);
              setStep((s) => s - 1);
            }}
            disabled={busy}
          >
            Back
          </button>
        ) : null}
        {step === 4 ? (
          <>
            <button
              type="button"
              className="border border-white/20 px-4 py-2.5 text-sm text-foreground hover:border-accent"
              onClick={() => {
                setError(null);
                setStep(3);
              }}
              disabled={busy}
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy || photoCount < 1}
              className="bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-white disabled:opacity-50"
              onClick={() => void submitAd()}
            >
              {busy ? 'Posting…' : 'Post Ad'}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            className="bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-white disabled:opacity-50"
            onClick={() => void goNext()}
          >
            {busy ? 'Saving…' : step === 3 ? 'Continue to photos' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
}
