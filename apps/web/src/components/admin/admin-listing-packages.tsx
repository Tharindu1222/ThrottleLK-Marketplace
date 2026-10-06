'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

type Audience = 'bike' | 'parts';

type Settings = {
  privateFreeListings: number;
  dealerFreeListings: number;
  partsFreeListings: number;
};

type PackageRow = {
  id: string;
  audience: Audience;
  name: string;
  description: string | null;
  priceLkr: number;
  listingCount: number;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm = {
  audience: 'bike' as Audience,
  name: '',
  description: '',
  priceLkr: '',
  listingCount: '15',
  sortOrder: '0',
  isActive: true,
};

export function AdminListingPackages() {
  const [token, setToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    privateFreeListings: 5,
    dealerFreeListings: 10,
    partsFreeListings: 10,
  });
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(access: string) {
    const [nextSettings, packages] = await Promise.all([
      apiGet<Settings>('/api/v1/admin/listing-packages/settings', { token: access }),
      apiGet<PackageRow[]>('/api/v1/admin/listing-packages', { token: access }),
    ]);
    setSettings(nextSettings);
    setRows(packages);
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load'),
    );
  }, []);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      setSettings(
        await apiSend<Settings>('/api/v1/admin/listing-packages/settings', {
          method: 'PATCH',
          token,
          body: settings,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save limits');
    } finally {
      setBusy(false);
    }
  }

  async function savePackage(e: FormEvent) {
    e.preventDefault();
    if (!token || !form.name.trim()) return;
    setBusy(true);
    setError(null);
    const body = {
      audience: form.audience,
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceLkr: Number(form.priceLkr),
      listingCount: Number(form.listingCount),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await apiSend(`/api/v1/admin/listing-packages/${editingId}`, {
          method: 'PATCH',
          token,
          body,
        });
      } else {
        await apiSend('/api/v1/admin/listing-packages', { token, body });
      }
      setForm(emptyForm);
      setEditingId(null);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save package');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      {error ? (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <form onSubmit={saveSettings} className="admin-card grid gap-4 p-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--admin-text)]">Free listing quota</h2>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            How many listings can be posted before a package is required. There is no day limit.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumField
            label="Normal user"
            value={settings.privateFreeListings}
            onChange={(privateFreeListings) => setSettings({ ...settings, privateFreeListings })}
          />
          <NumField
            label="Dealer"
            value={settings.dealerFreeListings}
            onChange={(dealerFreeListings) => setSettings({ ...settings, dealerFreeListings })}
          />
          <NumField
            label="Parts"
            value={settings.partsFreeListings}
            onChange={(partsFreeListings) => setSettings({ ...settings, partsFreeListings })}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="admin-btn-primary inline-flex min-h-11 w-fit items-center px-5 text-sm disabled:opacity-50"
        >
          Save free quota
        </button>
      </form>

      <form onSubmit={savePackage} className="admin-card grid gap-4 p-4">
        <h2 className="text-sm font-semibold text-[var(--admin-text)]">
          {editingId ? 'Edit package' : 'New package'}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-[11px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
              For
            </span>
            <select
              className="admin-field"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value as Audience })}
            >
              <option value="bike">Bikes</option>
              <option value="parts">Parts</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
              Name
            </span>
            <input
              required
              className="admin-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-[11px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
              Description
            </span>
            <textarea
              className="admin-field min-h-20"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
              Listings included
            </span>
            <input
              required
              type="number"
              min={1}
              className="admin-field"
              value={form.listingCount}
              onChange={(e) => setForm({ ...form, listingCount: e.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
              Price (Rs)
            </span>
            <input
              required
              type="number"
              min={0}
              className="admin-field"
              value={form.priceLkr}
              onChange={(e) => setForm({ ...form, priceLkr: e.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
              Sort
            </span>
            <input
              type="number"
              min={0}
              className="admin-field"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-[var(--admin-text)]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy || !form.name.trim()}
            className="admin-btn-primary inline-flex min-h-11 items-center px-5 text-sm disabled:opacity-50"
          >
            {editingId ? 'Update package' : 'Add package'}
          </button>
          {editingId ? (
            <button
              type="button"
              className="admin-btn-ghost min-h-11 px-4 text-sm"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--admin-border)] text-[11px] tracking-wide text-[var(--admin-faint)] uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">For</th>
              <th className="px-4 py-3 font-medium">Listings</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--admin-muted)]" colSpan={5}>
                  No packages yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--admin-border)]">
                  <td className="px-4 py-3 font-medium text-[var(--admin-text)]">
                    {row.name}
                    {!row.isActive ? (
                      <span className="ml-2 text-xs text-[var(--admin-faint)]">Inactive</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">
                    {row.audience === 'parts' ? 'Parts' : 'Bikes'}
                  </td>
                  <td className="px-4 py-3">{row.listingCount}</td>
                  <td className="px-4 py-3">Rs {row.priceLkr.toLocaleString('en-LK')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-sm font-medium text-[var(--admin-accent)]"
                      onClick={() => {
                        setEditingId(row.id);
                        setForm({
                          audience: row.audience,
                          name: row.name,
                          description: row.description ?? '',
                          priceLkr: String(row.priceLkr),
                          listingCount: String(row.listingCount),
                          sortOrder: String(row.sortOrder),
                          isActive: row.isActive,
                        });
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
        {label}
      </span>
      <input
        type="number"
        min={0}
        required
        className="admin-field"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
