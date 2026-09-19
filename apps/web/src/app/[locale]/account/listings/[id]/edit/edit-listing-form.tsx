'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ListingImageManager } from '@/components/listing-image-manager';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { composeListingTitle } from '@/lib/listing-title';

type Option = { id: string; name: string };
type Model = { id: string; name: string; brandId: string };

type ListingDetail = {
  id: string;
  title: string;
  description: string;
  priceLkr: number;
  brandId: string;
  modelId: string;
  categoryId: string;
  districtId: string;
  cityId: string;
  manufactureYear: number;
  engineCc: number | null;
  mileage: number | null;
  fuelType: string;
  transmission: string;
  condition: string;
  phone: string | null;
  dealerId: string | null;
  costPriceLkr?: number | null;
  purchaseDate?: string | null;
  status: string;
};

const fieldClass =
  'w-full bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-black/10 transition focus:ring-2 focus:ring-accent/35';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function statusLabel(locale: Locale, status: string) {
  switch (status) {
    case 'draft':
      return t(locale, 'statusDraft');
    case 'pending_review':
      return t(locale, 'statusPendingReview');
    case 'active':
      return t(locale, 'statusActive');
    case 'paused':
      return t(locale, 'statusPaused');
    case 'rejected':
      return t(locale, 'statusRejected');
    case 'sold':
      return t(locale, 'statusSold');
    default:
      return status.replace(/_/g, ' ');
  }
}

function statusChipClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-700 text-white';
    case 'pending_review':
      return 'bg-amber-400 text-zinc-950';
    case 'draft':
      return 'bg-zinc-700 text-white';
    case 'paused':
      return 'bg-sky-600 text-white';
    case 'rejected':
      return 'bg-red-700 text-white';
    case 'sold':
      return 'bg-accent text-white';
    default:
      return 'bg-zinc-800 text-white';
  }
}

function Field({
  label,
  htmlFor,
  optional,
  optionalLabel,
  icon,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  optionalLabel?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f4f5f7] text-foreground/70">
          {icon}
        </span>
        <span className="min-w-0">
          {label}
          {optional ? (
            <span className="ml-1.5 font-normal text-muted">
              ({optionalLabel})
            </span>
          ) : null}
        </span>
      </label>
      {children}
    </div>
  );
}

function Section({
  title,
  hint,
  icon,
  children,
  className = '',
}: {
  title: string;
  hint?: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)] ${className}`}
    >
      <header className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3.5 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
            {title}
          </h2>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
      </header>
      <div className="grid flex-1 gap-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function EditListingForm({
  locale,
  listingId,
}: {
  locale: Locale;
  listingId: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [manufactureYear, setManufactureYear] = useState(0);
  const [districtId, setDistrictId] = useState('');
  const [cityId, setCityId] = useState('');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'review' | 'updated' | null>(
    null,
  );
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const uid = useId();

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void Promise.all([
      apiGet<ListingDetail>(`/api/v1/listings/${listingId}`, { token: access }),
      apiGet<Option[]>('/api/v1/brands'),
      apiGet<Option[]>('/api/v1/categories', {
        searchParams: { scope: 'public' },
      }),
      apiGet<Option[]>('/api/v1/locations/districts'),
    ])
      .then(([row, b, c, d]) => {
        setListing(row);
        setBrands(b);
        setCategories(c);
        setDistricts(d);
        setBrandId(row.brandId);
        setModelId(row.modelId);
        setManufactureYear(row.manufactureYear);
        setDistrictId(row.districtId);
        setCityId(row.cityId);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, [listingId]);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    void apiGet<Model[]>(`/api/v1/brands/${brandId}/models`).then(setModels);
  }, [brandId]);

  useEffect(() => {
    if (!districtId) {
      setCities([]);
      return;
    }
    void apiGet<Option[]>(
      `/api/v1/locations/districts/${districtId}/cities`,
    ).then(setCities);
  }, [districtId]);

  function goToMyListings() {
    router.push(`/${locale}/account/listings`);
  }

  useEffect(() => {
    if (!saveResult) return;
    confirmButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        goToMyListings();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [saveResult, locale, router]);

  if (!token) {
    return (
      <p className="mt-6 text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  if (!listing && !error) {
    return (
      <div className="mt-6 grid gap-5 xl:grid-cols-2" aria-busy="true">
        <div className="h-10 animate-pulse rounded-lg bg-black/[0.06] xl:col-span-2" />
        <div className="h-56 animate-pulse rounded-xl bg-black/[0.06]" />
        <div className="h-56 animate-pulse rounded-xl bg-black/[0.06]" />
        <div className="h-64 animate-pulse rounded-xl bg-black/[0.06]" />
        <div className="h-64 animate-pulse rounded-xl bg-black/[0.06]" />
      </div>
    );
  }

  if (!listing) {
    return (
      <p className="mt-6 text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const nextBrandId = String(form.get('brandId'));
    const nextModelId = String(form.get('modelId'));
    const nextYear = Number(form.get('manufactureYear')) || manufactureYear;
    const composedTitle = composeListingTitle({
      brandName: brands.find((b) => b.id === nextBrandId)?.name,
      modelName: models.find((m) => m.id === nextModelId)?.name,
      manufactureYear: nextYear,
      title: listing.title,
    });
    const title =
      composedTitle.length >= 5 ? composedTitle : `${composedTitle} bike`;
    const costRaw = String(form.get('costPriceLkr') ?? '');
    const purchaseRaw = String(form.get('purchaseDate') ?? '');
    const cost = Number(costRaw);
    try {
      const updated = await apiSend<ListingDetail>(
        `/api/v1/listings/${listingId}`,
        {
          method: 'PATCH',
          token: token!,
          body: {
            brandId: nextBrandId,
            modelId: nextModelId,
            categoryId: String(form.get('categoryId')),
            districtId: String(form.get('districtId')),
            cityId: String(form.get('cityId')),
            title,
            description: String(form.get('description')),
            priceLkr: Number(form.get('priceLkr')),
            manufactureYear: nextYear,
            engineCc: Number(form.get('engineCc') || 0) || undefined,
            mileage: Number(form.get('mileage') || 0) || undefined,
            fuelType: String(form.get('fuelType')),
            transmission: String(form.get('transmission')),
            condition: String(form.get('condition')),
            phone: String(form.get('phone') || '') || undefined,
            ...(listing.dealerId
              ? {
                  costPriceLkr:
                    costRaw !== '' && Number.isInteger(cost) && cost > 0
                      ? cost
                      : null,
                  purchaseDate: /^\d{4}-\d{2}-\d{2}$/.test(purchaseRaw)
                    ? purchaseRaw
                    : null,
                }
              : {}),
          },
        },
      );
      setListing(updated);
      setSaveResult(
        updated.status === 'pending_review' ? 'review' : 'updated',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  const optionalLabel = t(locale, 'optional');
  const listingsHref = `/${locale}/account/listings`;
  const selectedModelName = models.find((m) => m.id === modelId)?.name;
  const autoTitle =
    modelId && !selectedModelName
      ? listing.title
      : composeListingTitle({
          brandName: brands.find((b) => b.id === brandId)?.name,
          modelName: selectedModelName,
          manufactureYear: manufactureYear || listing.manufactureYear,
          title: listing.title,
        });

  return (
    <div className="mt-5 w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={listingsHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-accent"
        >
          <Icon>
            <path d="M15 18l-6-6 6-6" />
          </Icon>
          {t(locale, 'backToMyListings')}
        </Link>
        <span
          className={`inline-flex rounded-sm px-2.5 py-1 text-[11px] font-semibold tracking-wide ${statusChipClass(listing.status)}`}
        >
          {statusLabel(locale, listing.status)}
        </span>
      </div>

      <div className="rounded-xl border border-black/[0.08] bg-white px-4 py-3.5 sm:px-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
          {t(locale, 'title')}
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground">
          {autoTitle}
        </p>
        <p className="mt-1 text-sm text-muted">{t(locale, 'titleLockedHint')}</p>
      </div>

      {listing.status === 'active' ? (
        <p className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950">
          <span className="mt-0.5 text-amber-700">
            <Icon>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" />
              <path d="M12 16h.01" />
            </Icon>
          </span>
          {t(locale, 'editReviewHint')}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-2">
        <Section
          className="xl:col-span-2"
          title={t(locale, 'sellStepDetails')}
          icon={
            <Icon>
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <path d="M14 3v6h6" />
            </Icon>
          }
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_16rem] xl:items-start">
            <Field
              label={t(locale, 'description')}
              htmlFor={`${uid}-description`}
              icon={
                <Icon>
                  <path d="M4 6h16M4 12h10M4 18h14" />
                </Icon>
              }
            >
              <textarea
                id={`${uid}-description`}
                name="description"
                required
                minLength={20}
                rows={5}
                defaultValue={listing.description}
                placeholder={t(locale, 'descriptionPlaceholder')}
                className={`${fieldClass} resize-y`}
              />
            </Field>
            <div className="grid gap-4">
              <Field
                label={t(locale, 'priceLkr')}
                htmlFor={`${uid}-price`}
                icon={
                  <Icon>
                    <rect x="3" y="6" width="18" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M7 12h.01M17 12h.01" />
                  </Icon>
                }
              >
                <input
                  id={`${uid}-price`}
                  name="priceLkr"
                  type="number"
                  required
                  min={1}
                  defaultValue={listing.priceLkr}
                  className={fieldClass}
                />
              </Field>
              {listing.dealerId ? (
                <>
                  <Field
                    label={t(locale, 'inventoryPurchaseDate')}
                    htmlFor={`${uid}-purchaseDate`}
                    optional
                    optionalLabel={optionalLabel}
                    icon={
                      <Icon>
                        <rect x="4" y="5" width="16" height="16" rx="2" />
                        <path d="M8 3v4M16 3v4M4 11h16" />
                      </Icon>
                    }
                  >
                    <input
                      id={`${uid}-purchaseDate`}
                      name="purchaseDate"
                      type="date"
                      defaultValue={
                        listing.purchaseDate
                          ? String(listing.purchaseDate).slice(0, 10)
                          : ''
                      }
                      className={fieldClass}
                    />
                  </Field>
                  <Field
                    label={t(locale, 'inventoryCostPrice')}
                    htmlFor={`${uid}-costPrice`}
                    optional
                    optionalLabel={optionalLabel}
                    icon={
                      <Icon>
                        <rect x="3" y="6" width="18" height="12" rx="2" />
                        <circle cx="12" cy="12" r="2" />
                        <path d="M7 12h.01M17 12h.01" />
                      </Icon>
                    }
                  >
                    <input
                      id={`${uid}-costPrice`}
                      name="costPriceLkr"
                      type="number"
                      min={1}
                      step={1}
                      defaultValue={listing.costPriceLkr ?? undefined}
                      className={fieldClass}
                    />
                  </Field>
                  <p className="text-xs text-muted">
                    {t(locale, 'inventoryPrivateHint')}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </Section>

        <Section
          title={t(locale, 'sellStepBike')}
          icon={
            <Icon>
              <circle cx="6.5" cy="16.5" r="3" />
              <circle cx="17.5" cy="16.5" r="3" />
              <path d="M6.5 16.5L10 8h4l4 8.5M10 8l2 4h5" />
            </Icon>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t(locale, 'brandFilter')}
              htmlFor={`${uid}-brand`}
              icon={
                <Icon>
                  <path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" />
                </Icon>
              }
            >
              <select
                id={`${uid}-brand`}
                name="brandId"
                required
                value={brandId}
                onChange={(e) => {
                  setBrandId(e.target.value);
                  setModelId('');
                }}
                className={fieldClass}
              >
                <option value="">{t(locale, 'searchOrSelectBrand')}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={t(locale, 'modelFilter')}
              htmlFor={`${uid}-model`}
              icon={
                <Icon>
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                  <path d="M8 9h8M8 13h5" />
                </Icon>
              }
            >
              <select
                id={`${uid}-model`}
                name="modelId"
                required
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className={fieldClass}
              >
                <option value="">
                  {brandId
                    ? t(locale, 'searchOrSelectModel')
                    : t(locale, 'selectBrandFirst')}
                </option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label={t(locale, 'categoryFilter')}
            htmlFor={`${uid}-category`}
            icon={
              <Icon>
                <path d="M4 9h7V4H4zM13 20h7v-7h-7zM4 20h7v-7H4zM13 9h7V4h-7z" />
              </Icon>
            }
          >
            <select
              id={`${uid}-category`}
              name="categoryId"
              required
              defaultValue={listing.categoryId}
              className={fieldClass}
            >
              <option value="">{t(locale, 'selectCategory')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section
          title={t(locale, 'sellStepSpecs')}
          icon={
            <Icon>
              <circle cx="12" cy="13" r="8" />
              <path d="M12 13l4-4" />
              <path d="M7 8.5a8 8 0 0 1 10 0" />
            </Icon>
          }
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label={t(locale, 'manufactureYear')}
              htmlFor={`${uid}-year`}
              icon={
                <Icon>
                  <rect x="4" y="5" width="16" height="16" rx="2" />
                  <path d="M8 3v4M16 3v4M4 11h16" />
                </Icon>
              }
            >
              <input
                id={`${uid}-year`}
                name="manufactureYear"
                type="number"
                required
                min={1970}
                max={2100}
                value={manufactureYear || listing.manufactureYear}
                onChange={(e) => setManufactureYear(Number(e.target.value) || 0)}
                className={fieldClass}
              />
            </Field>
            <Field
              label={t(locale, 'cc')}
              htmlFor={`${uid}-cc`}
              optional
              optionalLabel={optionalLabel}
              icon={
                <Icon>
                  <path d="M7 8h10l1.5 4H18v5H6v-5h-.5L7 8z" />
                  <path d="M9 8V6h6v2" />
                </Icon>
              }
            >
              <input
                id={`${uid}-cc`}
                name="engineCc"
                type="number"
                min={1}
                defaultValue={listing.engineCc ?? undefined}
                className={fieldClass}
              />
            </Field>
            <Field
              label={t(locale, 'mileageKm')}
              htmlFor={`${uid}-mileage`}
              optional
              optionalLabel={optionalLabel}
              icon={
                <Icon>
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 13l4-4" />
                </Icon>
              }
            >
              <input
                id={`${uid}-mileage`}
                name="mileage"
                type="number"
                min={0}
                defaultValue={listing.mileage ?? undefined}
                className={fieldClass}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label={t(locale, 'fuelType')}
              htmlFor={`${uid}-fuel`}
              icon={
                <Icon>
                  <path d="M10 21V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14" />
                  <path d="M8 21h12" />
                  <path d="M16 11h3l2 3v7" />
                </Icon>
              }
            >
              <select
                id={`${uid}-fuel`}
                name="fuelType"
                required
                defaultValue={listing.fuelType}
                className={fieldClass}
              >
                <option value="petrol">{t(locale, 'fuelPetrol')}</option>
                <option value="diesel">{t(locale, 'fuelDiesel')}</option>
                <option value="electric">{t(locale, 'fuelElectric')}</option>
                <option value="hybrid">{t(locale, 'fuelHybrid')}</option>
                <option value="other">{t(locale, 'fuelOther')}</option>
              </select>
            </Field>
            <Field
              label={t(locale, 'transmission')}
              htmlFor={`${uid}-trans`}
              icon={
                <Icon>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 5v2M12 17v2M5 12h2M17 12h2M7.1 7.1l1.4 1.4M15.5 15.5l1.4 1.4M7.1 16.9l1.4-1.4M15.5 8.5l1.4-1.4" />
                </Icon>
              }
            >
              <select
                id={`${uid}-trans`}
                name="transmission"
                required
                defaultValue={listing.transmission}
                className={fieldClass}
              >
                <option value="manual">{t(locale, 'transManual')}</option>
                <option value="automatic">{t(locale, 'transAuto')}</option>
                <option value="semi_automatic">{t(locale, 'transSemi')}</option>
                <option value="other">{t(locale, 'transOther')}</option>
              </select>
            </Field>
            <Field
              label={t(locale, 'condition')}
              htmlFor={`${uid}-condition`}
              icon={
                <Icon>
                  <path d="M12 3l7 4v5c0 5-3.5 8.5-7 10-4.5-1.5-8-5-8-10V7l7-4z" />
                  <path d="M9 12l2 2 4-4" />
                </Icon>
              }
            >
              <select
                id={`${uid}-condition`}
                name="condition"
                required
                defaultValue={listing.condition}
                className={fieldClass}
              >
                <option value="used">{t(locale, 'conditionUsed')}</option>
                <option value="new">{t(locale, 'conditionNew')}</option>
                <option value="reconditioned">
                  {t(locale, 'conditionReconditioned')}
                </option>
              </select>
            </Field>
          </div>
        </Section>

        <Section
          className="xl:col-span-2"
          title={t(locale, 'editLocationContact')}
          icon={
            <Icon>
              <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </Icon>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field
              label={t(locale, 'districtFilter')}
              htmlFor={`${uid}-district`}
              icon={
                <Icon>
                  <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </Icon>
              }
            >
              <select
                id={`${uid}-district`}
                name="districtId"
                required
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value);
                  setCityId('');
                }}
                className={fieldClass}
              >
                <option value="">{t(locale, 'selectDistrict')}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={t(locale, 'city')}
              htmlFor={`${uid}-city`}
              icon={
                <Icon>
                  <path d="M4 20V9l8-5 8 5v11" />
                  <path d="M9 20v-6h6v6" />
                </Icon>
              }
            >
              <select
                id={`${uid}-city`}
                name="cityId"
                required
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className={fieldClass}
              >
                <option value="">{t(locale, 'selectCity')}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={t(locale, 'phoneNumber')}
              htmlFor={`${uid}-phone`}
              optional
              optionalLabel={optionalLabel}
              icon={
                <Icon>
                  <path d="M7 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 7a2 2 0 0 1 2-2z" />
                </Icon>
              }
            >
              <input
                id={`${uid}-phone`}
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={listing.phone ?? ''}
                className={fieldClass}
              />
            </Field>
          </div>
        </Section>

        <Section
          className="xl:col-span-2"
          title={t(locale, 'sellStepPhotos')}
          hint={t(locale, 'photosHint')}
          icon={
            <Icon>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="11" r="1.5" />
              <path d="M21 16l-5-5-8 8" />
            </Icon>
          }
        >
          <ListingImageManager listingId={listingId} locale={locale} />
        </Section>

        {error ? (
          <p className="text-sm text-red-600 xl:col-span-2" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 xl:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={listingsHref}
            className="inline-flex items-center justify-center gap-1.5 px-2 py-2 text-sm text-muted transition hover:text-foreground"
          >
            <Icon>
              <path d="M15 18l-6-6 6-6" />
            </Icon>
            {t(locale, 'backToMyListings')}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 font-[family-name:var(--font-display)] tracking-wide text-white transition hover:brightness-110 disabled:opacity-60 sm:min-w-[12rem]"
          >
            <Icon>
              <path d="M5 12l5 5L20 7" />
            </Icon>
            {saving ? t(locale, 'saving') : t(locale, 'saveChanges')}
          </button>
        </div>
      </form>

      {saveResult ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={goToMyListings}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md border border-black/10 bg-background p-6 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p
              id={titleId}
              className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-accent"
            >
              {t(locale, 'changesSaved')}
            </p>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
              {saveResult === 'review'
                ? t(locale, 'adSubmittedHint')
                : t(locale, 'listingUpdated')}
            </p>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={goToMyListings}
              className="mt-6 w-full bg-accent px-4 py-3 font-[family-name:var(--font-display)] tracking-wide text-white transition hover:brightness-110"
            >
              {t(locale, 'viewMyListings')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
