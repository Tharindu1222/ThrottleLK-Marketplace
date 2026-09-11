'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { Brand, District } from '@/lib/admin-types';

export function AdminTaxonomy() {
  const [token, setToken] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(access: string) {
    const [brandRows, districtRows] = await Promise.all([
      apiGet<Brand[]>('/api/v1/admin/brands', { token: access }),
      apiGet<District[]>('/api/v1/locations/districts'),
    ]);
    setBrands(brandRows);
    setDistricts(districtRows);
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load taxonomy'),
    );
  }, []);

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--admin-text)]">
          Taxonomy
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Manage brands, models, districts, and cities.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--admin-danger)]">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="admin-card space-y-3 p-5"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get('brand') || '');
            void apiSend('/api/v1/admin/brands', { token, body: { name } })
              .then(() => {
                e.currentTarget.reset();
                return load(token);
              })
              .catch((err) =>
                setError(err instanceof Error ? err.message : 'Brand failed'),
              );
          }}
        >
          <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--admin-text)]">
            Add brand
          </h3>
          <input name="brand" required placeholder="Brand name" className="admin-field" />
          <button type="submit" className="admin-btn-primary px-3 py-2 text-sm">
            Create brand
          </button>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-[var(--admin-muted)]">
            {brands.slice(0, 12).map((b) => (
              <li key={b.id}>{b.name}</li>
            ))}
          </ul>
        </form>

        <form
          className="admin-card space-y-3 p-5"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void apiSend('/api/v1/admin/models', {
              token,
              body: {
                brandId: String(form.get('brandId')),
                name: String(form.get('model')),
              },
            })
              .then(() => {
                e.currentTarget.reset();
                return load(token);
              })
              .catch((err) =>
                setError(err instanceof Error ? err.message : 'Model failed'),
              );
          }}
        >
          <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--admin-text)]">
            Add model
          </h3>
          <select name="brandId" required className="admin-field">
            <option value="">Brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input name="model" required placeholder="Model name" className="admin-field" />
          <button type="submit" className="admin-btn-primary px-3 py-2 text-sm">
            Create model
          </button>
        </form>

        <form
          className="admin-card space-y-3 p-5"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get('district') || '');
            void apiSend('/api/v1/admin/districts', { token, body: { name } })
              .then(() => {
                e.currentTarget.reset();
                return load(token);
              })
              .catch((err) =>
                setError(err instanceof Error ? err.message : 'District failed'),
              );
          }}
        >
          <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--admin-text)]">
            Add district
          </h3>
          <input
            name="district"
            required
            placeholder="District name"
            className="admin-field"
          />
          <button type="submit" className="admin-btn-primary px-3 py-2 text-sm">
            Create district
          </button>
        </form>

        <form
          className="admin-card space-y-3 p-5"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void apiSend('/api/v1/admin/cities', {
              token,
              body: {
                districtId: String(form.get('districtId')),
                name: String(form.get('city')),
              },
            })
              .then(() => {
                e.currentTarget.reset();
                return load(token);
              })
              .catch((err) =>
                setError(err instanceof Error ? err.message : 'City failed'),
              );
          }}
        >
          <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--admin-text)]">
            Add city
          </h3>
          <select name="districtId" required className="admin-field">
            <option value="">District</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input name="city" required placeholder="City name" className="admin-field" />
          <button type="submit" className="admin-btn-primary px-3 py-2 text-sm">
            Create city
          </button>
        </form>
      </div>
    </div>
  );
}
