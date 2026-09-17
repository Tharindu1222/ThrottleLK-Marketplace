'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { CategoryCoverManager } from './category-cover-manager';
import { BrandLogoEditor, type BrandLogo } from './brand-logo-manager';

type District = { id: string; name: string };
type Model = { id: string; name: string };
type City = { id: string; name: string };
type Tab = 'categories' | 'brands' | 'locations';

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'categories', label: 'Categories', hint: 'Homepage ride cards' },
  { id: 'brands', label: 'Brands', hint: 'Makes, logos, and models' },
  { id: 'locations', label: 'Locations', hint: 'Districts and cities' },
];

export function AdminTaxonomy({ search = '' }: { search?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('categories');
  const [brands, setBrands] = useState<BrandLogo[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(access: string) {
    const [brandRows, districtRows] = await Promise.all([
      apiGet<BrandLogo[]>('/api/v1/admin/brands', { token: access }),
      apiGet<District[]>('/api/v1/locations/districts'),
    ]);
    setBrands(
      [...brandRows].sort((a, b) => a.name.localeCompare(b.name)),
    );
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
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Taxonomy sections"
        className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-0.5"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`taxonomy-tab-${item.id}`}
              aria-controls={`taxonomy-panel-${item.id}`}
              title={item.hint}
              className={`min-h-9 min-w-[7.5rem] flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selected
                  ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-text)] shadow-sm'
                  : 'text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]'
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="text-sm text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div
        role="tabpanel"
        id={`taxonomy-panel-${tab}`}
        aria-labelledby={`taxonomy-tab-${tab}`}
      >
        {tab === 'categories' ? (
          <CategoryCoverManager search={search} />
        ) : null}
        {tab === 'brands' ? (
          <BrandsPanel
            token={token}
            brands={brands}
            search={search}
            onReload={() => load(token)}
            onError={setError}
          />
        ) : null}
        {tab === 'locations' ? (
          <LocationsPanel
            token={token}
            districts={districts}
            search={search}
            onReload={() => load(token)}
            onError={setError}
          />
        ) : null}
      </div>
    </div>
  );
}

function BrandsPanel({
  token,
  brands,
  search,
  onReload,
  onError,
}: {
  token: string;
  brands: BrandLogo[];
  search: string;
  onReload: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [brandName, setBrandName] = useState('');
  const [modelName, setModelName] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands,
    [brands, q],
  );
  const selected =
    visible.find((b) => b.id === selectedId) ?? visible[0] ?? null;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
    if (!selected) setSelectedId(null);
  }, [selected, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    void apiGet<Model[]>(`/api/v1/brands/${selectedId}/models`)
      .then(setModels)
      .catch((err) =>
        onError(err instanceof Error ? err.message : 'Failed to load models'),
      )
      .finally(() => setLoadingModels(false));
  }, [selectedId, onError]);

  async function addBrand(e: FormEvent) {
    e.preventDefault();
    const name = brandName.trim();
    if (!name || busy) return;
    setBusy(true);
    onError(null);
    try {
      const created = await apiSend<BrandLogo>('/api/v1/admin/brands', {
        token,
        body: { name },
      });
      setBrandName('');
      await onReload();
      if (created?.id) setSelectedId(created.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add brand');
    } finally {
      setBusy(false);
    }
  }

  async function addModel(e: FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    const name = modelName.trim();
    if (!name) return;
    setBusy(true);
    onError(null);
    try {
      await apiSend('/api/v1/admin/models', {
        token,
        body: { brandId: selected.id, name },
      });
      setModelName('');
      const rows = await apiGet<Model[]>(
        `/api/v1/brands/${selected.id}/models`,
      );
      setModels(rows);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add model');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 lg:h-[calc(100svh-12rem)] lg:grid-cols-[minmax(14rem,17rem)_minmax(0,1fr)]">
      <aside className="admin-card flex min-h-0 flex-col p-3">
        <form onSubmit={addBrand} className="space-y-2">
          <label className="block text-sm font-medium text-[var(--admin-text)]">
            Add brand
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
              placeholder="Honda"
              className="admin-field mt-1"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="admin-btn-primary w-full px-3 py-2 text-sm disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Add brand'}
          </button>
        </form>
        <p className="mt-3 text-xs text-[var(--admin-faint)]">
          {visible.length} brands
        </p>
        <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {visible.length === 0 ? (
            <li className="px-2 py-8 text-center text-sm text-[var(--admin-muted)]">
              {q ? `No brands match “${search.trim()}”.` : 'No brands yet.'}
            </li>
          ) : (
            visible.map((brand) => {
              const active = selected?.id === brand.id;
              return (
                <li key={brand.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(brand.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      active
                        ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-text)]'
                        : 'text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]'
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-950">
                      {brand.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={brand.logoUrl}
                          alt=""
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-[11px] text-white/70">
                          {brand.name.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 truncate font-medium">
                      {brand.name}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section className="admin-card min-h-0 overflow-y-auto p-4">
        {selected ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
                {selected.name}
              </h2>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                Logo used on the homepage brand strip.
              </p>
              <div className="mt-4">
                <BrandLogoEditor
                  brand={selected}
                  token={token}
                  onUpdated={onReload}
                />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--admin-text)]">
                Models
              </h3>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                Add the names buyers search for, such as Activa or CBR600RR.
              </p>
              <form onSubmit={addModel} className="mt-3 flex gap-2">
                <label className="sr-only" htmlFor="model-name">
                  Model name
                </label>
                <input
                  id="model-name"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  required
                  placeholder="Activa"
                  className="admin-field"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="admin-btn-primary shrink-0 px-3 py-2 text-sm disabled:opacity-60"
                >
                  Add
                </button>
              </form>
              {loadingModels ? (
                <p className="mt-4 text-sm text-[var(--admin-faint)]">
                  Loading models…
                </p>
              ) : models.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-[var(--admin-border-strong)] px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
                  No models for {selected.name} yet.
                </p>
              ) : (
                <ul className="mt-4 max-h-[22rem] space-y-1 overflow-y-auto">
                  {models.map((model) => (
                    <li
                      key={model.id}
                      className="rounded-lg bg-[var(--admin-surface-2)] px-3 py-2 text-sm text-[var(--admin-text)]"
                    >
                      {model.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-[var(--admin-muted)]">
            Add a brand to start managing logos and models.
          </div>
        )}
      </section>
    </div>
  );
}

function LocationsPanel({
  token,
  districts,
  search,
  onReload,
  onError,
}: {
  token: string;
  districts: District[];
  search: string;
  onReload: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [districtName, setDistrictName] = useState('');
  const [cityName, setCityName] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      q ? districts.filter((d) => d.name.toLowerCase().includes(q)) : districts,
    [districts, q],
  );
  const selected =
    visible.find((d) => d.id === selectedId) ?? visible[0] ?? null;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
    if (!selected) setSelectedId(null);
  }, [selected, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    void apiGet<City[]>(`/api/v1/locations/districts/${selectedId}/cities`)
      .then(setCities)
      .catch((err) =>
        onError(err instanceof Error ? err.message : 'Failed to load cities'),
      )
      .finally(() => setLoadingCities(false));
  }, [selectedId, onError]);

  async function addDistrict(e: FormEvent) {
    e.preventDefault();
    const name = districtName.trim();
    if (!name || busy) return;
    setBusy(true);
    onError(null);
    try {
      const created = await apiSend<District>('/api/v1/admin/districts', {
        token,
        body: { name },
      });
      setDistrictName('');
      await onReload();
      if (created?.id) setSelectedId(created.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add district');
    } finally {
      setBusy(false);
    }
  }

  async function addCity(e: FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    const name = cityName.trim();
    if (!name) return;
    setBusy(true);
    onError(null);
    try {
      await apiSend('/api/v1/admin/cities', {
        token,
        body: { districtId: selected.id, name },
      });
      setCityName('');
      const rows = await apiGet<City[]>(
        `/api/v1/locations/districts/${selected.id}/cities`,
      );
      setCities(rows);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add city');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 lg:h-[calc(100svh-12rem)] lg:grid-cols-[minmax(14rem,17rem)_minmax(0,1fr)]">
      <aside className="admin-card flex min-h-0 flex-col p-3">
        <form onSubmit={addDistrict} className="space-y-2">
          <label className="block text-sm font-medium text-[var(--admin-text)]">
            Add district
            <input
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              required
              placeholder="Colombo"
              className="admin-field mt-1"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="admin-btn-primary w-full px-3 py-2 text-sm disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Add district'}
          </button>
        </form>
        <p className="mt-3 text-xs text-[var(--admin-faint)]">
          {visible.length} districts
        </p>
        <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {visible.length === 0 ? (
            <li className="px-2 py-8 text-center text-sm text-[var(--admin-muted)]">
              {q ? `No districts match “${search.trim()}”.` : 'No districts yet.'}
            </li>
          ) : (
            visible.map((district) => {
              const active = selected?.id === district.id;
              return (
                <li key={district.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(district.id)}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                      active
                        ? 'bg-[var(--admin-accent-soft)] font-medium text-[var(--admin-text)]'
                        : 'text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-text)]'
                    }`}
                  >
                    {district.name}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section className="admin-card min-h-0 overflow-y-auto p-4">
        {selected ? (
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
              {selected.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">
              Cities that appear when a seller chooses this district.
            </p>
            <form onSubmit={addCity} className="mt-3 flex max-w-md gap-2">
              <label className="sr-only" htmlFor="city-name">
                City name
              </label>
              <input
                id="city-name"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                required
                placeholder="Nugegoda"
                className="admin-field"
              />
              <button
                type="submit"
                disabled={busy}
                className="admin-btn-primary shrink-0 px-3 py-2 text-sm disabled:opacity-60"
              >
                Add city
              </button>
            </form>
            {loadingCities ? (
              <p className="mt-4 text-sm text-[var(--admin-faint)]">
                Loading cities…
              </p>
            ) : cities.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-[var(--admin-border-strong)] px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
                No cities in {selected.name} yet. Add the first one above.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {cities.map((city) => (
                  <li
                    key={city.id}
                    className="rounded-xl bg-[var(--admin-surface-2)] px-3 py-2.5 text-sm text-[var(--admin-text)]"
                  >
                    {city.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-[var(--admin-muted)]">
            Add a district to start adding cities.
          </div>
        )}
      </section>
    </div>
  );
}
