'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ListingImageManager } from '@/components/listing-image-manager';
import {
  SearchableCombobox,
  type ComboboxOption,
} from '@/components/searchable-combobox';
import { ListingQuotaDialog } from '@/components/listing-quota-dialog';
import { VerifyEmailCallout } from '@/components/verify-email-callout';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { listingRequestMessage, listingQuotaBlock, type ListingQuotaBlock } from '@/lib/listing-errors';

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
  whatsapp: string;
  colour: string;
  registrationYear: string;
  negotiable: boolean;
  dealerId: string;
};

const STEPS = [
  {
    id: 1,
    labelKey: 'sellStepBike',
    titleKey: 'sellStepBikeTitle',
    hintKey: 'sellStepBikeHint',
  },
  {
    id: 2,
    labelKey: 'sellStepSpecs',
    titleKey: 'sellStepSpecsTitle',
    hintKey: 'sellStepSpecsHint',
  },
  {
    id: 3,
    labelKey: 'sellStepDetails',
    titleKey: 'sellStepDetailsTitle',
    hintKey: 'sellStepDetailsHint',
  },
  {
    id: 4,
    labelKey: 'sellStepPhotos',
    titleKey: 'sellStepPhotosTitle',
    hintKey: 'sellStepPhotosHint',
  },
] as const;

const fieldClass =
  'h-12 w-full appearance-none rounded-xl border border-[#d4d4d8] bg-white px-3.5 py-2.5 pr-10 text-sm text-foreground outline-none transition placeholder:text-[#9ca3af] focus:border-accent/45 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-[#fafafa] disabled:opacity-60';
const textareaClass =
  'min-h-[120px] w-full resize-y rounded-xl border border-[#d4d4d8] bg-white px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-[#9ca3af] focus:border-accent/45 focus:ring-2 focus:ring-accent/15';
const labelClass = 'mb-1.5 block text-sm font-semibold text-foreground';
const requiredMark = <span className="text-accent"> *</span>;

function ChevronDownIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepRailIcon({ step }: { step: number }) {
  const cls = 'h-[18px] w-[18px]';
  if (step === 1) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden
      >
        <path
          d="M4 15.5h1.8l1.2-3.2h7.2l1.4 3.2H18M7.2 12.3 8.5 7.5h5.2l1.4 4.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="16.2" r="1.6" />
        <circle cx="16" cy="16.2" r="1.6" />
      </svg>
    );
  }
  if (step === 2) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden
      >
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M8.5 8h7M8.5 12h7M8.5 16h4.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (step === 3) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={cls}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden
      >
        <path
          d="M4.5 19.5h3.8L19 8.8a2 2 0 0 0-2.8-2.8L5.5 16.7v2.8z"
          strokeLinejoin="round"
        />
        <path d="m14.8 7.2 2 2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={cls}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="11" r="1.6" />
      <path
        d="m20.5 16.5-4.2-4.2L9.5 19"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#9ca3af]">
        <ChevronDownIcon />
      </span>
    </div>
  );
}

function HorizontalStepper({
  locale,
  step,
}: {
  locale: Locale;
  step: number;
}) {
  return (
    <ol
      className="mx-auto flex w-full max-w-[28rem]"
      aria-label={t(locale, 'sellFormSteps')}
    >
      {STEPS.map((s, i) => {
        const active = s.id === step;
        const done = s.id < step;
        const isFirst = i === 0;
        const isLast = i === STEPS.length - 1;
        const leftFilled = !isFirst && s.id <= step;
        const rightFilled = !isLast && done;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className={`h-px min-w-0 flex-1 ${
                  isFirst
                    ? 'bg-transparent'
                    : leftFilled
                      ? 'bg-accent/40'
                      : 'bg-[#d4d4d8]'
                }`}
                aria-hidden
              />
              <span
                className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  active || done
                    ? 'bg-accent text-white'
                    : 'bg-[#e5e5e7] text-[#8a8a8e]'
                }`}
              >
                {s.id}
              </span>
              <div
                className={`h-px min-w-0 flex-1 ${
                  isLast
                    ? 'bg-transparent'
                    : rightFilled
                      ? 'bg-accent/40'
                      : 'bg-[#d4d4d8]'
                }`}
                aria-hidden
              />
            </div>
            <span
              className={`mt-2.5 px-0.5 text-center text-xs leading-tight font-semibold tracking-tight break-words ${
                active
                  ? 'text-accent'
                  : done
                    ? 'text-foreground'
                    : 'text-[#8a8a8e]'
              }`}
            >
              {t(locale, s.labelKey)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
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
  whatsapp: '',
  colour: '',
  registrationYear: '',
  negotiable: true,
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
  const [listingsLeft, setListingsLeft] = useState<number | null>(null);
  const [quotaBlock, setQuotaBlock] = useState<ListingQuotaBlock | null>(null);

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
      ).catch(() => [] as { id: string; name: string; status: string }[]),
      apiGet<{ bike: { remaining: number } }>('/api/v1/listing-packages/me', {
        token: access,
      }).catch(() => null),
    ]).then(([c, d, mine, quota]) => {
      setCategories(c);
      setDistricts(d);
      const active = mine.filter((x) => x.status === 'active');
      setDealers(active);
      if (quota) setListingsLeft(quota.bike.remaining);
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
      negotiable: form.negotiable,
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
      whatsapp: form.whatsapp.trim() || undefined,
      colour: form.colour.trim() || undefined,
      registrationYear: form.registrationYear
        ? Number(form.registrationYear)
        : undefined,
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
        setError(listingRequestMessage(err, locale, 'saveListingFailed'));
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
      const block = listingQuotaBlock(err);
      if (block) {
        setQuotaBlock(block);
        return;
      }
      setError(listingRequestMessage(err, locale, 'submitFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return null;
  }

  if (submitted) {
    return (
      <div className="mx-auto mt-8 max-w-xl rounded-2xl bg-white p-6 text-left ring-1 ring-black/[0.06]">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          {t(locale, 'postAnAdEyebrow')}
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {t(locale, 'adSubmitted')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t(locale, 'adSubmittedHint')}
        </p>
        <Link
          href={`/${locale}/account/listings`}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#0a0a0a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent sm:w-auto"
        >
          {t(locale, 'manageListings')}
        </Link>
      </div>
    );
  }

  const categoryChoices = categories;
  const currentStep = STEPS[step - 1] ?? STEPS[0];
  const btnPrimary =
    'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition hover:bg-[#c90500] disabled:opacity-50 sm:w-auto';
  const btnBack =
    'inline-flex h-11 w-full items-center justify-center rounded-xl border border-black/12 bg-white px-5 text-sm font-medium text-foreground transition hover:bg-black/[0.02] disabled:opacity-50 sm:w-auto';

  return (
    <div className="mx-auto mt-8 max-w-5xl">
      <VerifyEmailCallout locale={locale} />

      <HorizontalStepper locale={locale} step={step} />

      <div className="mt-7 min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_rgba(0,0,0,0.06)] lg:grid lg:h-[640px] lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[256px_minmax(0,1fr)]">
        <aside className="hidden h-full flex-col border-r border-black/[0.05] bg-[#fafafa] p-3.5 lg:flex lg:p-4">
          <ul className="space-y-0.5">
            {STEPS.map((s) => {
              const active = s.id === step;
              const done = s.id < step;
              return (
                <li key={s.id}>
                  <div
                    className={`flex items-center gap-2.5 rounded-full px-3 py-2.5 transition ${
                      active ? 'bg-accent/[0.09]' : ''
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        active || done
                          ? 'bg-accent text-white'
                          : 'bg-[#e5e5e7] text-[#8a8a8e]'
                      }`}
                    >
                      {s.id}
                    </span>
                    <span
                      className={`flex-1 text-sm font-semibold ${
                        active
                          ? 'text-accent'
                          : done
                            ? 'text-foreground'
                            : 'text-[#8a8a8e]'
                      }`}
                    >
                      {t(locale, s.labelKey)}
                    </span>
                    <span
                      className={
                        active ? 'text-accent' : 'text-[#b0b0b4]'
                      }
                    >
                      <StepRailIcon step={s.id} />
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto rounded-xl bg-[#eeeeef] p-4">
            <p className="text-sm font-semibold text-foreground">
              {t(locale, 'sellNeedHelp')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {t(locale, 'sellNeedHelpHint')}
            </p>
            <Link
              href={`/${locale}/guides`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent transition hover:underline"
            >
              {t(locale, 'sellViewGuide')} →
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col p-4 sm:p-8 lg:h-full lg:min-h-0 lg:p-9">
          <div className="mb-6 shrink-0">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-[1.375rem]">
              {t(locale, currentStep.titleKey)}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {t(locale, currentStep.hintKey)}
            </p>
          </div>

          <div className="min-w-0 pr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {step === 1 ? (
              <div className="grid min-w-0 max-w-md gap-5 text-left">
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
                    {t(locale, 'categoryFilter')}
                    {requiredMark}
                  </label>
                  <SelectShell>
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
                  </SelectShell>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid min-w-0 gap-5 text-left sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="manufactureYear">
                    {t(locale, 'manufactureYear')}
                    {requiredMark}
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
                    {isElectric ? null : requiredMark}
                  </label>
                  <input
                    id="engineCc"
                    type="number"
                    required={!isElectric}
                    min={1}
                    disabled={isElectric}
                    placeholder={
                      isElectric ? t(locale, 'engineNaElectric') : undefined
                    }
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
                    {t(locale, 'fuelType')}
                    {requiredMark}
                  </label>
                  <SelectShell>
                    <select
                      id="fuelType"
                      required
                      className={fieldClass}
                      value={form.fuelType}
                      onChange={(e) => {
                        setFuelTouched(true);
                        setField(
                          'fuelType',
                          e.target.value as FormState['fuelType'],
                        );
                      }}
                    >
                      <option value="petrol">{t(locale, 'fuelPetrol')}</option>
                      <option value="electric">
                        {t(locale, 'fuelElectric')}
                      </option>
                      <option value="other">{t(locale, 'fuelOther')}</option>
                    </select>
                  </SelectShell>
                </div>
                <div>
                  <label className={labelClass} htmlFor="condition">
                    {t(locale, 'condition')}
                    {requiredMark}
                  </label>
                  <SelectShell>
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
                  </SelectShell>
                </div>
                <div>
                  <label className={labelClass} htmlFor="transmission">
                    {t(locale, 'transmission')}
                    {requiredMark}
                  </label>
                  <SelectShell>
                    <select
                      id="transmission"
                      required
                      className={fieldClass}
                      value={form.transmission}
                      onChange={(e) => setField('transmission', e.target.value)}
                    >
                      <option value="manual">{t(locale, 'transManual')}</option>
                      <option value="automatic">{t(locale, 'transAuto')}</option>
                      <option value="semi_automatic">
                        {t(locale, 'transSemi')}
                      </option>
                      <option value="other">{t(locale, 'transOther')}</option>
                    </select>
                  </SelectShell>
                </div>
                <div>
                  <label className={labelClass} htmlFor="mileage">
                    {t(locale, 'mileageKm')}
                    {requiredMark}
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
                    {t(locale, 'priceLkr')}
                    {requiredMark}
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
                  {listingsLeft != null ? (
                    <p className="mt-1 text-xs text-muted">
                      {t(locale, 'listingQuotaLeft').replace('{n}', String(listingsLeft))}
                    </p>
                  ) : null}
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
                        onChange={(e) =>
                          setField('purchaseDate', e.target.value)
                        }
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
                        onChange={(e) =>
                          setField('costPriceLkr', e.target.value)
                        }
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
              <div className="grid gap-5 text-left">
                <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="districtId">
                      {t(locale, 'districtFilter')}
                      {requiredMark}
                    </label>
                    <SelectShell>
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
                    </SelectShell>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="cityId">
                      {t(locale, 'city')}
                      {requiredMark}
                    </label>
                    <SelectShell>
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
                    </SelectShell>
                  </div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="description">
                    {t(locale, 'description')}
                    {requiredMark}
                  </label>
                  <textarea
                    id="description"
                    required
                    minLength={20}
                    rows={5}
                    className={textareaClass}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder={t(locale, 'descriptionPlaceholder')}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="phone">
                    {t(locale, 'phoneNumber')}
                    {requiredMark}
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
                <div>
                  <label className={labelClass} htmlFor="whatsapp">
                    {t(locale, 'whatsapp')}
                  </label>
                  <input
                    id="whatsapp"
                    type="tel"
                    className={fieldClass}
                    value={form.whatsapp}
                    onChange={(e) => setField('whatsapp', e.target.value)}
                    placeholder="07XXXXXXXX"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="colour">
                      {t(locale, 'colour')}
                    </label>
                    <input
                      id="colour"
                      className={fieldClass}
                      value={form.colour}
                      onChange={(e) => setField('colour', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="registrationYear">
                      {t(locale, 'registrationYear')}
                    </label>
                    <input
                      id="registrationYear"
                      inputMode="numeric"
                      className={fieldClass}
                      value={form.registrationYear}
                      onChange={(e) => setField('registrationYear', e.target.value)}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.negotiable}
                    onChange={(e) => setField('negotiable', e.target.checked)}
                  />
                  {t(locale, 'negotiable')}
                </label>
                {dealers.length > 0 ? (
                  <div>
                    <p className={labelClass}>{t(locale, 'listUnderDealer')}</p>
                    {dealers.length === 1 ? (
                      <p className="rounded-lg bg-surface px-3 py-2.5 text-sm text-foreground">
                        {dealers[0].name}
                      </p>
                    ) : (
                      <SelectShell>
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
                      </SelectShell>
                    )}
                    <p className="mt-1.5 text-xs text-muted">
                      {t(locale, 'dealerListingNote')}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 4 && listingId ? (
              <div className="text-left">
                <p className="text-sm leading-relaxed text-muted">
                  {t(locale, 'photosHint')}
                </p>
                <div className="mt-5">
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
                </div>
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
          </div>

          {quotaBlock ? (
            <ListingQuotaDialog
              locale={locale}
              block={quotaBlock}
              onClose={() => setQuotaBlock(null)}
            />
          ) : null}
          {error ? (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          ) : null}

          <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-black/[0.06] pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {step > 1 ? (
              <button
                type="button"
                className={btnBack}
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
              <button
                type="button"
                disabled={busy || photoCount < 1}
                className={btnPrimary}
                onClick={() => void submitAd()}
              >
                {busy ? t(locale, 'posting') : t(locale, 'postAd')}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                className={btnPrimary}
                onClick={() => void goNext()}
              >
                {busy
                  ? t(locale, 'saving')
                  : step === 3
                    ? t(locale, 'continueToPhotos')
                    : t(locale, 'continue')}
                {!busy ? <ArrowRightIcon /> : null}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
