'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { loginHref } from '@/lib/login-href';
import { composeListingTitle } from '@/lib/listing-title';
import { useDialogFocusTrap } from '@/lib/use-dialog-focus-trap';

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
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  optionalLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm text-muted"
      >
        {label}
        {optional ? (
          <span className="ml-1.5 font-normal text-muted/80">
            ({optionalLabel})
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
  className = '',
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-black/[0.06] sm:p-6 ${className}`}
    >
      <header className="mb-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          {title}
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        {hint ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">{hint}</p>
        ) : null}
      </header>
      <div className="grid flex-1 gap-4">{children}</div>
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
  const pathname = usePathname();
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
  const dialogId = `edit-saved-${uid.replace(/:/g, '')}`;
  useDialogFocusTrap(Boolean(saveResult), dialogId, {
    initialFocusRef: confirmButtonRef,
  });

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
        <Link href={loginHref(locale, pathname)} className="text-accent underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  if (!listing && !error) {
    return (
      <div className="mt-6 grid gap-5 xl:grid-cols-2" aria-busy="true">
        <div className="h-10 animate-pulse rounded-2xl bg-black/[0.06] xl:col-span-2" />
        <div className="h-56 animate-pulse rounded-2xl bg-black/[0.06]" />
        <div className="h-56 animate-pulse rounded-2xl bg-black/[0.06]" />
        <div className="h-64 animate-pulse rounded-2xl bg-black/[0.06]" />
        <div className="h-64 animate-pulse rounded-2xl bg-black/[0.06]" />
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
    if (!listing) return;
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
    <div className="mt-8 w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={listingsHref}
          className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          {t(locale, 'backToMyListings')}
        </Link>
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide ${statusChipClass(listing.status)}`}
        >
          {statusLabel(locale, listing.status)}
        </span>
      </div>

      <div className="rounded-2xl bg-white px-5 py-4 ring-1 ring-black/[0.06] sm:px-6">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          {t(locale, 'title')}
        </p>
        <p className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {autoTitle}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t(locale, 'titleLockedHint')}
        </p>
      </div>

      {listing.status === 'active' ? (
        <p className="rounded-md border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t(locale, 'editReviewHint')}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-2">
        <Section
          className="xl:col-span-2"
          title={t(locale, 'sellStepDetails')}
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_16rem] xl:items-start">
            <Field
              label={t(locale, 'description')}
              htmlFor={`${uid}-description`}
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
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t(locale, 'brandFilter')}
              htmlFor={`${uid}-brand`}
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
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label={t(locale, 'manufactureYear')}
              htmlFor={`${uid}-year`}
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
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field
              label={t(locale, 'districtFilter')}
              htmlFor={`${uid}-district`}
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
            className="inline-flex items-center justify-center px-2 py-2 text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            {t(locale, 'backToMyListings')}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md bg-[#0a0a0a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent disabled:opacity-50 sm:min-w-[12rem]"
          >
            {saving ? t(locale, 'saving') : t(locale, 'saveChanges')}
          </button>
        </div>
      </form>

      {saveResult ? (
        <div
          id={dialogId}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          onClick={goToMyListings}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 ring-1 ring-black/[0.06] shadow-[0_24px_64px_-28px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p
              id={titleId}
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {t(locale, 'changesSaved')}
            </p>
            <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted">
              {saveResult === 'review'
                ? t(locale, 'adSubmittedHint')
                : t(locale, 'listingUpdated')}
            </p>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={goToMyListings}
              className="mt-6 w-full rounded-md bg-[#0a0a0a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent"
            >
              {t(locale, 'viewMyListings')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
