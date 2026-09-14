'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ListingImageManager } from '@/components/listing-image-manager';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

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
  status: string;
};

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
  const [districtId, setDistrictId] = useState('');
  const [cityId, setCityId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    return <p className="mt-6 text-muted">Loading…</p>;
  }

  if (!listing) {
    return <p className="mt-6 text-sm text-red-400">{error}</p>;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const updated = await apiSend<ListingDetail>(
        `/api/v1/listings/${listingId}`,
        {
          method: 'PATCH',
          token: token!,
          body: {
            brandId: String(form.get('brandId')),
            modelId: String(form.get('modelId')),
            categoryId: String(form.get('categoryId')),
            districtId: String(form.get('districtId')),
            cityId: String(form.get('cityId')),
            title: String(form.get('title')),
            description: String(form.get('description')),
            priceLkr: Number(form.get('priceLkr')),
            manufactureYear: Number(form.get('manufactureYear')),
            engineCc: Number(form.get('engineCc') || 0) || undefined,
            mileage: Number(form.get('mileage') || 0) || undefined,
            fuelType: String(form.get('fuelType')),
            transmission: String(form.get('transmission')),
            condition: String(form.get('condition')),
            phone: String(form.get('phone') || '') || undefined,
          },
        },
      );
      setListing(updated);
      setOk(
        updated.status === 'pending_review'
          ? 'Saved. Listing sent back for admin review.'
          : 'Listing updated.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 max-w-2xl space-y-8">
      <p className="text-sm text-muted">
        Status: {listing.status}
        {listing.status === 'active'
          ? ' · Changing details (except price-only) sends it back for review.'
          : null}
      </p>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          name="title"
          required
          minLength={5}
          defaultValue={listing.title}
          placeholder={t(locale, 'title')}
          className="bg-background px-3 py-2 ring-1 ring-black/10"
        />
        <textarea
          name="description"
          required
          minLength={20}
          rows={5}
          defaultValue={listing.description}
          placeholder={t(locale, 'description')}
          className="bg-background px-3 py-2 ring-1 ring-black/10"
        />
        <input
          name="priceLkr"
          type="number"
          required
          defaultValue={listing.priceLkr}
          placeholder={t(locale, 'price')}
          className="bg-background px-3 py-2 ring-1 ring-black/10"
        />
        <select
          name="brandId"
          required
          value={brandId}
          onChange={(e) => {
            setBrandId(e.target.value);
            setModelId('');
          }}
          className="bg-background px-3 py-2 ring-1 ring-black/10"
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
          required
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          className="bg-background px-3 py-2 ring-1 ring-black/10"
        >
          <option value="">Model</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          name="categoryId"
          required
          defaultValue={listing.categoryId}
          className="bg-background px-3 py-2 ring-1 ring-black/10"
        >
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="districtId"
          required
          value={districtId}
          onChange={(e) => {
            setDistrictId(e.target.value);
            setCityId('');
          }}
          className="bg-background px-3 py-2 ring-1 ring-black/10"
        >
          <option value="">{t(locale, 'districtFilter')}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          name="cityId"
          required
          value={cityId}
          onChange={(e) => setCityId(e.target.value)}
          className="bg-background px-3 py-2 ring-1 ring-black/10"
        >
          <option value="">City</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="manufactureYear"
            type="number"
            required
            defaultValue={listing.manufactureYear}
            className="bg-background px-3 py-2 ring-1 ring-black/10"
          />
          <input
            name="engineCc"
            type="number"
            defaultValue={listing.engineCc ?? undefined}
            placeholder="CC"
            className="bg-background px-3 py-2 ring-1 ring-black/10"
          />
          <input
            name="mileage"
            type="number"
            defaultValue={listing.mileage ?? undefined}
            placeholder={t(locale, 'mileage')}
            className="bg-background px-3 py-2 ring-1 ring-black/10"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            name="fuelType"
            required
            defaultValue={listing.fuelType}
            className="bg-background px-3 py-2 ring-1 ring-black/10"
          >
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="electric">Electric</option>
            <option value="hybrid">Hybrid</option>
            <option value="other">Other</option>
          </select>
          <select
            name="transmission"
            required
            defaultValue={listing.transmission}
            className="bg-background px-3 py-2 ring-1 ring-black/10"
          >
            <option value="manual">Manual</option>
            <option value="automatic">Automatic</option>
            <option value="semi_automatic">Semi-auto</option>
            <option value="other">Other</option>
          </select>
          <select
            name="condition"
            required
            defaultValue={listing.condition}
            className="bg-background px-3 py-2 ring-1 ring-black/10"
          >
            <option value="used">Used</option>
            <option value="new">New</option>
            <option value="reconditioned">Reconditioned</option>
          </select>
        </div>
        <input
          name="phone"
          defaultValue={listing.phone ?? ''}
          placeholder={t(locale, 'phone')}
          className="bg-background px-3 py-2 ring-1 ring-black/10"
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-accent px-4 py-3 font-[family-name:var(--font-display)] tracking-wide text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {ok ? <p className="text-sm text-accent">{ok}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>

      <div className="border border-black/10 bg-surface/40 p-4">
        <p className="text-sm text-muted">Photos</p>
        <ListingImageManager listingId={listingId} />
      </div>

      <Link
        href={`/${locale}/account/listings`}
        className="text-sm text-accent underline"
      >
        ← Back to my listings
      </Link>
    </div>
  );
}
