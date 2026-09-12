'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ListingImageManager } from '@/components/listing-image-manager';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

type Option = { id: string; name: string; slug?: string };
type Model = { id: string; name: string; brandId: string };

type FormState = {
  brandId: string;
  modelId: string;
  categoryId: string;
  manufactureYear: string;
  engineCc: string;
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
  modelId: '',
  categoryId: '',
  manufactureYear: String(new Date().getFullYear()),
  engineCc: '',
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

export function SellForm({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [dealers, setDealers] = useState<{ id: string; name: string; status: string }[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void Promise.all([
      apiGet<Option[]>('/api/v1/brands'),
      apiGet<Option[]>('/api/v1/categories'),
      apiGet<Option[]>('/api/v1/locations/districts'),
      apiGet<{ id: string; name: string; status: string }[]>(
        '/api/v1/dealers/mine',
        { token: access },
      ).catch(() => []),
    ]).then(([b, c, d, mine]) => {
      setBrands(b);
      setCategories(c);
      setDistricts(d);
      setDealers(mine.filter((x) => x.status === 'active'));
    });
  }, []);

  useEffect(() => {
    if (!form.brandId) {
      setModels([]);
      return;
    }
    void apiGet<Model[]>(`/api/v1/brands/${form.brandId}/models`).then(
      setModels,
    );
  }, [form.brandId]);

  useEffect(() => {
    if (!form.districtId) {
      setCities([]);
      return;
    }
    void apiGet<Option[]>(
      `/api/v1/locations/districts/${form.districtId}/cities`,
    ).then(setCities);
  }, [form.districtId]);

  const brandName = useMemo(
    () => brands.find((b) => b.id === form.brandId)?.name ?? '',
    [brands, form.brandId],
  );
  const modelName = useMemo(
    () => models.find((m) => m.id === form.modelId)?.name ?? '',
    [models, form.modelId],
  );
  const autoTitle = useMemo(() => {
    const parts = [brandName, modelName, form.manufactureYear].filter(Boolean);
    return parts.join(' ').trim();
  }, [brandName, modelName, form.manufactureYear]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!form.brandId) return 'Brand is required';
      if (!form.modelId) return 'Model is required';
      if (!form.categoryId) return 'Category is required';
    }
    if (current === 2) {
      const year = Number(form.manufactureYear);
      if (!year || year < 1970 || year > 2100) return 'Manufacture year is required';
      if (!form.engineCc || Number(form.engineCc) <= 0)
        return 'Engine capacity is required';
      if (!form.condition) return 'Condition is required';
      if (!form.transmission) return 'Transmission is required';
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

  async function createDraftListing(access: string) {
    const category = categories.find((c) => c.id === form.categoryId);
    const fuelType =
      category?.slug === 'electric' || category?.name.toLowerCase() === 'electric'
        ? 'electric'
        : 'petrol';

    const listing = await apiSend<{ id: string }>(
      '/api/v1/listings',
      {
        token: access,
        body: {
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
          engineCc: Number(form.engineCc),
          mileage: Number(form.mileage),
          fuelType,
          transmission: form.transmission,
          condition: form.condition,
          phone: form.phone.trim(),
          dealerId: form.dealerId || undefined,
        },
      },
    );
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
        const body = {
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
          engineCc: Number(form.engineCc),
          mileage: Number(form.mileage),
          fuelType:
            categories.find((c) => c.id === form.categoryId)?.slug ===
              'electric' ||
            categories
              .find((c) => c.id === form.categoryId)
              ?.name.toLowerCase() === 'electric'
              ? 'electric'
              : 'petrol',
          transmission: form.transmission,
          condition: form.condition,
          phone: form.phone.trim(),
          dealerId: form.dealerId || undefined,
        };
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
          className="mt-6 inline-flex bg-accent px-4 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-background"
        >
          Manage listings
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <ol className="mb-8 flex flex-wrap justify-center gap-2" aria-label="Form steps">
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
        <div className="grid gap-4">
          <div>
            <label className={labelClass} htmlFor="brandId">
              Brand *
            </label>
            <select
              id="brandId"
              required
              className={fieldClass}
              value={form.brandId}
              onChange={(e) => {
                setField('brandId', e.target.value);
                setField('modelId', '');
              }}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="modelId">
              Model *
            </label>
            <select
              id="modelId"
              required
              className={fieldClass}
              value={form.modelId}
              disabled={!form.brandId}
              onChange={(e) => setField('modelId', e.target.value)}
            >
              <option value="">Select model</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="categoryId">
              Category *
            </label>
            <select
              id="categoryId"
              required
              className={fieldClass}
              value={form.categoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 sm:grid-cols-2">
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
              Engine Capacity (cc) *
            </label>
            <input
              id="engineCc"
              type="number"
              required
              min={1}
              className={fieldClass}
              value={form.engineCc}
              onChange={(e) => setField('engineCc', e.target.value)}
            />
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
          <div>
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
        <div className="grid gap-4">
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
        <div className="border border-white/10 bg-surface/40 p-4">
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

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

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
              className="bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-background disabled:opacity-50"
              onClick={() => void submitAd()}
            >
              {busy ? 'Posting…' : 'Post Ad'}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            className="bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-background disabled:opacity-50"
            onClick={() => void goNext()}
          >
            {busy ? 'Saving…' : step === 3 ? 'Continue to photos' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
}
