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
import { t, type Locale } from '@/lib/i18n';

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
  purchaseDate: string;
  costPriceLkr: string;
  districtId: string;
  cityId: string;
  description: string;
  phone: string;
  dealerId: string;
};

const STEPS = [
  { id: 1, labelKey: 'sellStepBike' },
  { id: 2, labelKey: 'sellStepSpecs' },
  { id: 3, labelKey: 'sellStepDetails' },
  { id: 4, labelKey: 'sellStepPhotos' },
] as const;

const fieldClass =
  'w-full bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-black/10 focus:ring-accent';
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
  purchaseDate: '',
  costPriceLkr: '',
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
      const active = mine.filter((x) => x.status === 'active');
      setDealers(active);
      if (active[0]) {
        setForm((prev) =>
          prev.dealerId ? prev : { ...prev, dealerId: active[0].id },
        );
      }
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
      if (!form.brandId) return t(locale, 'requiredBrand');
      if (!form.modelId) return t(locale, 'requiredModel');
      if (!form.categoryId) return t(locale, 'requiredCategory');
    }
    if (current === 2) {
      const year = Number(form.manufactureYear);
      if (!year || year < 1970 || year > 2100)
        return t(locale, 'requiredYear');
      if (!isElectric && (!form.engineCc || Number(form.engineCc) <= 0))
        return t(locale, 'requiredEngine');
      if (!form.condition) return t(locale, 'requiredCondition');
      if (!form.transmission) return t(locale, 'requiredTransmission');
      if (!form.fuelType) return t(locale, 'requiredFuel');
      if (form.mileage === '' || Number(form.mileage) < 0)
        return t(locale, 'requiredMileage');
      if (!form.priceLkr || Number(form.priceLkr) <= 0)
        return t(locale, 'requiredPrice');
    }
    if (current === 3) {
      if (!form.districtId) return t(locale, 'requiredDistrict');
      if (!form.cityId) return t(locale, 'requiredCity');
      if (!form.description || form.description.trim().length < 20)
        return t(locale, 'requiredDescription');
      if (!form.phone || form.phone.trim().length < 9)
        return t(locale, 'requiredPhone');
    }
    if (current === 4) {
      if (!listingId) return t(locale, 'listingNotCreated');
      if (photoCount < 1) return t(locale, 'requiredPhoto');
    }
    return null;
  }

  function listingBody() {
    const cost = Number(form.costPriceLkr);
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
      ...(form.dealerId
        ? {
            costPriceLkr:
              form.costPriceLkr !== '' && Number.isInteger(cost) && cost > 0
                ? cost
                : null,
            purchaseDate: /^\d{4}-\d{2}-\d{2}$/.test(form.purchaseDate)
              ? form.purchaseDate
              : null,
          }
        : {}),
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
        setError(err instanceof Error ? err.message : t(locale, 'saveListingFailed'));
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
      setError(err instanceof Error ? err.message : t(locale, 'submitFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return null;
  }

  if (submitted) {
    return (
      <div className="mx-auto mt-8 max-w-xl border border-black/10 bg-surface/40 p-6 text-left">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-accent">
          {t(locale, 'adSubmitted')}
        </p>
        <p className="mt-2 text-muted">{t(locale, 'adSubmittedHint')}</p>
        <Link
          href={`/${locale}/account/listings`}
          className="mt-6 inline-flex bg-accent px-4 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-white"
        >
          {t(locale, 'manageListings')}
        </Link>
      </div>
    );
  }

  const categoryChoices = categories;

  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <ol
        className="mb-8 flex flex-wrap justify-center gap-2"
        aria-label={t(locale, 'sellFormSteps')}
      >
        {STEPS.map((s) => {
          const active = s.id === step;
          const done = s.id < step;
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2 border px-3 py-1.5 text-xs tracking-wide ${
                active
                  ? 'border-accent text-accent'
                  : done
                    ? 'border-black/20 text-foreground'
                    : 'border-black/10 text-muted'
              }`}
            >
              <span className="font-[family-name:var(--font-display)] text-sm">
                {s.id}
              </span>
              {t(locale, s.labelKey)}
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <div className="grid gap-4 text-left">
          <SearchableCombobox
            label={t(locale, 'brandFilter')}
            required
            placeholder={t(locale, 'searchOrSelectBrand')}
            valueId={form.brandId}
            valueLabel={form.brandLabel}
            options={brandOptions}
            loading={brandsLoading}
            emptyText={t(locale, 'emptyResults')}
            loadingText={t(locale, 'searching')}
            clearText={t(locale, 'clear')}
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
            label={t(locale, 'modelFilter')}
            required
            placeholder={
              form.brandId
                ? t(locale, 'searchOrSelectModel')
                : t(locale, 'selectBrandFirst')
            }
            valueId={form.modelId}
            valueLabel={form.modelLabel}
            options={modelOptions}
            disabled={!form.brandId}
            loading={modelsLoading}
            emptyText={t(locale, 'emptyResults')}
            loadingText={t(locale, 'searching')}
            clearText={t(locale, 'clear')}
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
              {t(locale, 'categoryFilter')} *
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
              <option value="">{t(locale, 'selectCategory')}</option>
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
              {t(locale, 'manufactureYear')} *
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
              {t(locale, 'engineCapacity')}
              {isElectric ? '' : ' *'}
            </label>
            <input
              id="engineCc"
              type="number"
              required={!isElectric}
              min={1}
              disabled={isElectric}
              placeholder={isElectric ? t(locale, 'engineNaElectric') : undefined}
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
              {t(locale, 'fuelType')} *
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
              <option value="petrol">{t(locale, 'fuelPetrol')}</option>
              <option value="electric">{t(locale, 'fuelElectric')}</option>
              <option value="other">{t(locale, 'fuelOther')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="condition">
              {t(locale, 'condition')} *
            </label>
            <select
              id="condition"
              required
              className={fieldClass}
              value={form.condition}
              onChange={(e) => setField('condition', e.target.value)}
            >
              <option value="used">{t(locale, 'conditionUsed')}</option>
              <option value="new">{t(locale, 'conditionNew')}</option>
              <option value="reconditioned">
                {t(locale, 'conditionReconditioned')}
              </option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="transmission">
              {t(locale, 'transmission')} *
            </label>
            <select
              id="transmission"
              required
              className={fieldClass}
              value={form.transmission}
              onChange={(e) => setField('transmission', e.target.value)}
            >
              <option value="manual">{t(locale, 'transManual')}</option>
              <option value="automatic">{t(locale, 'transAuto')}</option>
              <option value="semi_automatic">{t(locale, 'transSemi')}</option>
              <option value="other">{t(locale, 'transOther')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="mileage">
              {t(locale, 'mileageKm')} *
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
              {t(locale, 'priceLkr')} *
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
          {dealers.length > 0 ? (
            <>
              <div>
                <label className={labelClass} htmlFor="purchaseDate">
                  {t(locale, 'inventoryPurchaseDate')}
                </label>
                <input
                  id="purchaseDate"
                  type="date"
                  className={fieldClass}
                  value={form.purchaseDate}
                  onChange={(e) => setField('purchaseDate', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="costPriceLkr">
                  {t(locale, 'inventoryCostPrice')}
                </label>
                <input
                  id="costPriceLkr"
                  type="number"
                  min={1}
                  step={1}
                  className={fieldClass}
                  value={form.costPriceLkr}
                  onChange={(e) => setField('costPriceLkr', e.target.value)}
                />
              </div>
              <p className="sm:col-span-2 text-xs text-muted">
                {t(locale, 'inventoryPrivateHint')}
              </p>
            </>
          ) : null}
          {autoTitle ? (
            <p className="sm:col-span-2 text-sm text-muted">
              {t(locale, 'titleWillBe')}{' '}
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
                {t(locale, 'districtFilter')} *
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
                <option value="">{t(locale, 'selectDistrict')}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="cityId">
                {t(locale, 'city')} *
              </label>
              <select
                id="cityId"
                required
                className={fieldClass}
                value={form.cityId}
                disabled={!form.districtId}
                onChange={(e) => setField('cityId', e.target.value)}
              >
                <option value="">{t(locale, 'selectCity')}</option>
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
              {t(locale, 'description')} *
            </label>
            <textarea
              id="description"
              required
              minLength={20}
              rows={5}
              className={fieldClass}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder={t(locale, 'descriptionPlaceholder')}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="phone">
              {t(locale, 'phoneNumber')} *
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
              <p className={labelClass}>{t(locale, 'listUnderDealer')}</p>
              {dealers.length === 1 ? (
                <p className="rounded-md bg-surface px-3 py-2.5 text-sm text-foreground">
                  {dealers[0].name}
                </p>
              ) : (
                <select
                  id="dealerId"
                  className={fieldClass}
                  value={form.dealerId}
                  onChange={(e) => setField('dealerId', e.target.value)}
                  required
                >
                  {dealers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1.5 text-xs text-muted">
                {t(locale, 'dealerListingNote')}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 4 && listingId ? (
        <div className="border border-black/10 bg-surface/40 p-4 text-left">
          <p className="text-sm text-muted">{t(locale, 'photosHint')}</p>
          <ListingImageManager
            listingId={listingId}
            locale={locale}
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
              {t(locale, 'uploadOnePhoto')}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {photoCount === 1
                ? t(locale, 'photosReadyOne')
                : t(locale, 'photosReady').replace('{n}', String(photoCount))}
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
            className="border border-black/20 px-4 py-2.5 text-sm text-foreground hover:border-accent"
            onClick={() => {
              setError(null);
              setStep((s) => s - 1);
            }}
            disabled={busy}
          >
            {t(locale, 'back')}
          </button>
        ) : null}
        {step === 4 ? (
          <>
            <button
              type="button"
              className="border border-black/20 px-4 py-2.5 text-sm text-foreground hover:border-accent"
              onClick={() => {
                setError(null);
                setStep(3);
              }}
              disabled={busy}
            >
              {t(locale, 'back')}
            </button>
            <button
              type="button"
              disabled={busy || photoCount < 1}
              className="bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-white disabled:opacity-50"
              onClick={() => void submitAd()}
            >
              {busy ? t(locale, 'posting') : t(locale, 'postAd')}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            className="bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-white disabled:opacity-50"
            onClick={() => void goNext()}
          >
            {busy
              ? t(locale, 'saving')
              : step === 3
                ? t(locale, 'continueToPhotos')
                : t(locale, 'continue')}
          </button>
        )}
      </div>
    </div>
  );
}
