'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ListingImageManager } from '@/components/listing-image-manager';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type Option = { id: string; name: string };
type Model = { id: string; name: string; brandId: string };

export function SellForm({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [dealers, setDealers] = useState<{ id: string; name: string; status: string }[]>([]);
  const [brandId, setBrandId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

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

  const filteredModels = useMemo(() => models, [models]);

  if (!token) {
    return (
      <p className="mt-6 text-muted">
        {t(locale, 'login')} required —{' '}
        <a href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </a>
      </p>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const form = new FormData(e.currentTarget);
    try {
      const listing = await apiSend<{ id: string; status: string }>(
        '/api/v1/listings',
        {
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
            negotiable: true,
            manufactureYear: Number(form.get('manufactureYear')),
            engineCc: Number(form.get('engineCc') || 0) || undefined,
            mileage: Number(form.get('mileage') || 0) || undefined,
            fuelType: String(form.get('fuelType')),
            transmission: String(form.get('transmission')),
            condition: String(form.get('condition')),
            phone: String(form.get('phone') || '') || undefined,
            dealerId: String(form.get('dealerId') || '') || undefined,
          },
        },
      );
      await apiSend(`/api/v1/listings/${listing.id}/submit`, { token: token! });
      setCreatedListingId(listing.id);
      setOk('Listing submitted for admin review. Add photos below.');
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="mt-8 max-w-2xl">
    <form onSubmit={onSubmit} className="grid gap-3">
      <input
        name="title"
        required
        minLength={5}
        placeholder={t(locale, 'title')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <textarea
        name="description"
        required
        minLength={20}
        rows={5}
        placeholder={t(locale, 'description')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <input
        name="priceLkr"
        type="number"
        required
        placeholder={t(locale, 'price')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      <select
        name="brandId"
        required
        value={brandId}
        onChange={(e) => setBrandId(e.target.value)}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
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
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      >
        <option value="">Model</option>
        {filteredModels.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <select
        name="categoryId"
        required
        className="bg-background px-3 py-2 ring-1 ring-white/10"
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
        onChange={(e) => setDistrictId(e.target.value)}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
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
        className="bg-background px-3 py-2 ring-1 ring-white/10"
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
          placeholder={t(locale, 'year')}
          className="bg-background px-3 py-2 ring-1 ring-white/10"
        />
        <input
          name="engineCc"
          type="number"
          placeholder="CC"
          className="bg-background px-3 py-2 ring-1 ring-white/10"
        />
        <input
          name="mileage"
          type="number"
          placeholder={t(locale, 'mileage')}
          className="bg-background px-3 py-2 ring-1 ring-white/10"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          name="fuelType"
          required
          className="bg-background px-3 py-2 ring-1 ring-white/10"
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
          className="bg-background px-3 py-2 ring-1 ring-white/10"
        >
          <option value="manual">Manual</option>
          <option value="automatic">Automatic</option>
          <option value="semi_automatic">Semi-auto</option>
          <option value="other">Other</option>
        </select>
        <select
          name="condition"
          required
          className="bg-background px-3 py-2 ring-1 ring-white/10"
        >
          <option value="used">Used</option>
          <option value="new">New</option>
          <option value="reconditioned">Reconditioned</option>
        </select>
      </div>
      <input
        name="phone"
        placeholder={t(locale, 'phone')}
        className="bg-background px-3 py-2 ring-1 ring-white/10"
      />
      {dealers.length > 0 ? (
        <select
          name="dealerId"
          className="bg-background px-3 py-2 ring-1 ring-white/10"
          defaultValue=""
        >
          <option value="">Private listing (no dealer)</option>
          {dealers.map((d) => (
            <option key={d.id} value={d.id}>
              List under {d.name}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="submit"
        className="bg-accent px-4 py-3 font-[family-name:var(--font-display)] tracking-wide text-background"
      >
        {t(locale, 'createListing')} → {t(locale, 'submitForReview')}
      </button>
      {ok ? <p className="text-sm text-accent">{ok}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
    {createdListingId ? (
      <div className="mt-6 border border-white/10 bg-surface/40 p-4">
        <p className="text-sm text-muted">Photos for this listing</p>
        <ListingImageManager listingId={createdListingId} />
        <p className="mt-3 text-sm">
          <Link
            href={`/${locale}/account/listings`}
            className="text-accent underline"
          >
            Manage all listings
          </Link>
        </p>
      </div>
    ) : null}
    </div>
  );
}
