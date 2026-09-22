'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { PartListingImageManager } from '@/components/part-listing-image-manager';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type Option = { id: string; name: string };
type CategoryOption = Option & {
  parentId?: string | null;
  parentName?: string | null;
};

type FormState = {
  kind: 'spare' | 'modified';
  title: string;
  description: string;
  priceLkr: string;
  condition: 'new' | 'used' | 'reconditioned';
  categoryId: string;
  brandId: string;
  modelId: string;
  districtId: string;
  cityId: string;
  phone: string;
  whatsapp: string;
  negotiable: boolean;
};

const STEPS = [
  { id: 1, labelKey: 'listPartStepDetails' as const },
  { id: 2, labelKey: 'listPartStepFitment' as const },
  { id: 3, labelKey: 'sellStepPhotos' as const },
];

const fieldClass =
  'w-full bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-black/10 transition focus:ring-2 focus:ring-accent/35';
const labelClass = 'mb-1.5 block text-sm text-muted';

const emptyForm: FormState = {
  kind: 'spare',
  title: '',
  description: '',
  priceLkr: '',
  condition: 'used',
  categoryId: '',
  brandId: '',
  modelId: '',
  districtId: '',
  cityId: '',
  phone: '',
  whatsapp: '',
  negotiable: true,
};

export function NewPartListingForm({ locale }: { locale: Locale }) {
  const uid = useId();
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const parentCategories = (() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      if (c.parentId && c.parentName) map.set(c.parentId, c.parentName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  const subcategories = parentCategoryId
    ? categories
        .filter((c) => c.parentId === parentCategoryId)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void Promise.all([
      apiGet<CategoryOption[]>('/api/v1/part-categories'),
      apiGet<Option[]>('/api/v1/brands'),
      apiGet<Option[]>('/api/v1/locations/districts'),
      apiGet<{ phone?: string | null }>('/api/v1/users/me', {
        token: access,
      }).catch(() => null),
    ])
      .then(([cats, brandList, districtList, me]) => {
        setCategories(cats);
        setBrands(brandList);
        setDistricts(districtList);
        if (me?.phone) {
          setForm((f) =>
            f.phone ? f : { ...f, phone: me.phone ?? '', whatsapp: me.phone ?? '' },
          );
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t(locale, 'failedToLoad')),
      );
  }, [locale]);

  useEffect(() => {
    if (!form.brandId) {
      setModels([]);
      return;
    }
    void apiGet<Option[]>(`/api/v1/brands/${form.brandId}/models`)
      .then(setModels)
      .catch(() => setModels([]));
  }, [form.brandId]);

  useEffect(() => {
    if (!form.districtId) {
      setCities([]);
      return;
    }
    void apiGet<Option[]>(
      `/api/v1/locations/districts/${form.districtId}/cities`,
    )
      .then(setCities)
      .catch(() => setCities([]));
  }, [form.districtId]);

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!form.kind) return t(locale, 'requiredKind');
      if (form.title.trim().length < 5) return t(locale, 'requiredTitle');
      if (form.description.trim().length < 20)
        return t(locale, 'requiredDescription');
      if (!form.priceLkr || Number(form.priceLkr) <= 0)
        return t(locale, 'requiredPrice');
      if (!form.condition) return t(locale, 'requiredCondition');
      if (!form.categoryId) return t(locale, 'requiredCategory');
    }
    if (current === 2) {
      if (!form.districtId) return t(locale, 'requiredDistrict');
      if (!form.cityId) return t(locale, 'requiredCity');
      if (!form.phone || form.phone.trim().length < 9)
        return t(locale, 'requiredPhone');
    }
    if (current === 3) {
      if (!listingId) return t(locale, 'listingNotCreated');
      if (photoCount < 1) return t(locale, 'requiredPhoto');
    }
    return null;
  }

  function listingBody() {
    return {
      kind: form.kind,
      categoryId: form.categoryId,
      districtId: form.districtId,
      cityId: form.cityId,
      title: form.title.trim(),
      description: form.description.trim(),
      priceLkr: Number(form.priceLkr),
      negotiable: form.negotiable,
      condition: form.condition,
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim() || undefined,
      fitments: form.brandId
        ? [
            {
              brandId: form.brandId,
              modelId: form.modelId || null,
            },
          ]
        : [],
    };
  }

  async function goNext() {
    setError(null);
    const issue = validateStep(step);
    if (issue) {
      setError(issue);
      return;
    }

    if (step === 2) {
      setBusy(true);
      try {
        const body = listingBody();
        if (listingId) {
          await apiSend(`/api/v1/part-listings/${listingId}`, {
            method: 'PATCH',
            token: token!,
            body,
          });
        } else {
          const created = await apiSend<{ id: string }>('/api/v1/part-listings', {
            method: 'POST',
            token: token!,
            body,
          });
          setListingId(created.id);
          setPhotoCount(0);
        }
        setStep(3);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t(locale, 'saveListingFailed'),
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    setStep((s) => Math.min(3, s + 1));
  }

  async function submitAd() {
    setError(null);
    const issue = validateStep(3);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    try {
      await apiSend(`/api/v1/part-listings/${listingId}/submit`, {
        method: 'POST',
        token: token!,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'submitFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <p className="mt-6 text-sm text-muted">
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/parts-listings/new`)}`}
          className="text-accent underline"
        >
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  if (submitted) {
    return (
      <div className="mt-8 border border-black/10 bg-surface/40 p-6">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-accent">
          {t(locale, 'adSubmitted')}
        </p>
        <p className="mt-2 text-sm text-muted">{t(locale, 'adSubmittedHint')}</p>
        <Link
          href={`/${locale}/account/parts-listings`}
          className="mt-6 inline-flex bg-accent px-4 py-2.5 font-[family-name:var(--font-display)] tracking-wide text-white transition hover:brightness-110"
        >
          {t(locale, 'partsListings')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 w-full">
      <ol
        className="mb-6 flex w-full flex-wrap gap-2"
        aria-label={t(locale, 'sellFormSteps')}
      >
        {STEPS.map((s) => {
          const active = s.id === step;
          const done = s.id < step;
          return (
            <li
              key={s.id}
              className={`inline-flex items-center gap-2 border px-3 py-1.5 text-xs tracking-wide ${
                active
                  ? 'border-accent bg-accent/10 text-accent'
                  : done
                    ? 'border-black/15 bg-white text-foreground'
                    : 'border-black/10 bg-white/60 text-muted'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                  active || done
                    ? 'bg-accent text-white'
                    : 'bg-black/5 text-muted'
                }`}
              >
                {s.id}
              </span>
              {t(locale, s.labelKey)}
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <div className="grid gap-4 rounded-xl border border-black/[0.08] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5 lg:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor={`${uid}-kind`}>
              {t(locale, 'partKind')} *
            </label>
            <select
              id={`${uid}-kind`}
              className={fieldClass}
              value={form.kind}
              onChange={(e) =>
                setField('kind', e.target.value as FormState['kind'])
              }
            >
              <option value="spare">{t(locale, 'sparePartBadge')}</option>
              <option value="modified">{t(locale, 'modifiedPartBadge')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${uid}-condition`}>
              {t(locale, 'condition')} *
            </label>
            <select
              id={`${uid}-condition`}
              className={fieldClass}
              value={form.condition}
              onChange={(e) =>
                setField(
                  'condition',
                  e.target.value as FormState['condition'],
                )
              }
            >
              <option value="used">{t(locale, 'conditionUsed')}</option>
              <option value="new">{t(locale, 'conditionNew')}</option>
              <option value="reconditioned">
                {t(locale, 'conditionReconditioned')}
              </option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${uid}-parent-category`}>
              {t(locale, 'categoryFilter')} *
            </label>
            <select
              id={`${uid}-parent-category`}
              className={fieldClass}
              value={parentCategoryId}
              onChange={(e) => {
                setParentCategoryId(e.target.value);
                setField('categoryId', '');
              }}
            >
              <option value="">{t(locale, 'selectCategory')}</option>
              {parentCategories.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${uid}-category`}>
              {t(locale, 'subcategoryFilter')} *
            </label>
            <select
              id={`${uid}-category`}
              className={fieldClass}
              value={form.categoryId}
              disabled={!parentCategoryId}
              onChange={(e) => setField('categoryId', e.target.value)}
            >
              <option value="">{t(locale, 'selectSubcategory')}</option>
              {subcategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className={labelClass} htmlFor={`${uid}-title`}>
              {t(locale, 'title')} *
            </label>
            <input
              id={`${uid}-title`}
              className={fieldClass}
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              minLength={5}
              maxLength={160}
              placeholder={t(locale, 'partTitlePlaceholder')}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${uid}-price`}>
              {t(locale, 'priceLkr')} *
            </label>
            <input
              id={`${uid}-price`}
              type="number"
              min={1}
              className={fieldClass}
              value={form.priceLkr}
              onChange={(e) => setField('priceLkr', e.target.value)}
            />
          </div>
          <div className="lg:col-span-3">
            <label className={labelClass} htmlFor={`${uid}-description`}>
              {t(locale, 'description')} *
            </label>
            <textarea
              id={`${uid}-description`}
              className={`${fieldClass} min-h-32 resize-y`}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              minLength={20}
              rows={6}
              placeholder={t(locale, 'partDescriptionPlaceholder')}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground lg:col-span-3">
            <input
              type="checkbox"
              checked={form.negotiable}
              onChange={(e) => setField('negotiable', e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {t(locale, 'negotiable')}
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 rounded-xl border border-black/[0.08] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5 lg:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor={`${uid}-brand`}>
              {t(locale, 'fitsBrand')}
            </label>
            <select
              id={`${uid}-brand`}
              className={fieldClass}
              value={form.brandId}
              onChange={(e) => {
                setField('brandId', e.target.value);
                setField('modelId', '');
              }}
            >
              <option value="">{t(locale, 'allBrands')}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${uid}-model`}>
              {t(locale, 'fitsModelOptional')}
            </label>
            <select
              id={`${uid}-model`}
              className={fieldClass}
              value={form.modelId}
              onChange={(e) => setField('modelId', e.target.value)}
              disabled={!form.brandId}
            >
              <option value="">{t(locale, 'allModels')}</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${uid}-district`}>
              {t(locale, 'districtFilter')} *
            </label>
            <select
              id={`${uid}-district`}
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
            <label className={labelClass} htmlFor={`${uid}-city`}>
              {t(locale, 'city')} *
            </label>
            <select
              id={`${uid}-city`}
              className={fieldClass}
              value={form.cityId}
              onChange={(e) => setField('cityId', e.target.value)}
              disabled={!form.districtId}
            >
              <option value="">{t(locale, 'selectCity')}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${uid}-phone`}>
              {t(locale, 'phoneNumber')} *
            </label>
            <input
              id={`${uid}-phone`}
              type="tel"
              className={fieldClass}
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${uid}-whatsapp`}>
              {t(locale, 'whatsapp')}
            </label>
            <input
              id={`${uid}-whatsapp`}
              type="tel"
              className={fieldClass}
              value={form.whatsapp}
              onChange={(e) => setField('whatsapp', e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {step === 3 && listingId ? (
        <div className="rounded-xl border border-black/[0.08] bg-white p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5">
          <p className="text-sm text-muted">{t(locale, 'photosHint')}</p>
          <PartListingImageManager
            listingId={listingId}
            locale={locale}
            onChange={() => {
              void apiGet<{ id: string }[]>(
                `/api/v1/part-listings/${listingId}/images`,
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
                : t(locale, 'photosReady').replace(
                    '{n}',
                    String(photoCount),
                  )}
            </p>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {step > 1 && step < 3 ? (
          <button
            type="button"
            className="border border-black/20 px-4 py-2.5 text-sm text-foreground transition hover:border-accent"
            onClick={() => {
              setError(null);
              setStep((s) => s - 1);
            }}
            disabled={busy}
          >
            {t(locale, 'back')}
          </button>
        ) : null}
        {step === 3 ? (
          <>
            <button
              type="button"
              className="border border-black/20 px-4 py-2.5 text-sm text-foreground transition hover:border-accent"
              onClick={() => {
                setError(null);
                setStep(2);
              }}
              disabled={busy}
            >
              {t(locale, 'back')}
            </button>
            <button
              type="button"
              className="bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-white transition hover:brightness-110 disabled:opacity-60"
              onClick={() => void submitAd()}
              disabled={busy || photoCount < 1}
            >
              {busy ? t(locale, 'submitting') : t(locale, 'submitForReview')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-white transition hover:brightness-110 disabled:opacity-60"
            onClick={() => void goNext()}
            disabled={busy}
          >
            {busy ? t(locale, 'saving') : t(locale, 'continue')}
          </button>
        )}
        <Link
          href={`/${locale}/account/parts-listings`}
          className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          {t(locale, 'cancel')}
        </Link>
      </div>
    </div>
  );
}
