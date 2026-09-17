'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiGetWithMeta, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { AdminUser, Brand, District } from '@/lib/admin-types';
import { AdminListingImageManager } from './admin-listing-image-manager';
import { AdminPager } from './admin-pager';

type ListingRow = {
  id: string;
  title: string;
  slug: string;
  priceLkr: number;
  manufactureYear: number;
  status: string;
  brandId: string;
  modelId: string;
  categoryId: string;
  districtId: string;
  cityId: string;
  sellerId: string;
  description: string;
  negotiable: boolean;
  registrationYear: number | null;
  engineCc: number | null;
  mileage: number | null;
  fuelType: string;
  transmission: string;
  condition: string;
  colour: string | null;
  phone: string | null;
  whatsapp: string | null;
  brand?: { id: string; name: string };
  model?: { id: string; name: string };
  district?: { id: string; name: string };
  city?: { id: string; name: string };
  seller?: { id: string; email: string; firstName: string; lastName: string };
  coverImageUrl?: string | null;
  updatedAt: string;
};

type Category = { id: string; name: string };
type Model = { id: string; name: string };
type City = { id: string; name: string };

const STATUSES = [
  'draft',
  'pending_review',
  'active',
  'rejected',
  'paused',
  'sold',
  'expired',
] as const;

const emptyForm = {
  sellerId: '',
  brandId: '',
  modelId: '',
  categoryId: '',
  districtId: '',
  cityId: '',
  title: '',
  description: '',
  priceLkr: '',
  negotiable: true,
  manufactureYear: String(new Date().getFullYear()),
  registrationYear: '',
  engineCc: '',
  mileage: '',
  fuelType: 'petrol',
  transmission: 'manual',
  condition: 'used',
  colour: '',
  phone: '',
  whatsapp: '',
  status: 'draft',
};

type FormState = typeof emptyForm;

function statusTone(status: string) {
  switch (status) {
    case 'active':
      return 'bg-[var(--admin-success)]/15 text-[var(--admin-success)]';
    case 'pending_review':
      return 'bg-[var(--admin-info)]/15 text-[var(--admin-info)]';
    case 'rejected':
    case 'expired':
      return 'bg-[var(--admin-danger)]/15 text-[var(--admin-danger)]';
    case 'paused':
      return 'bg-[var(--admin-warning)]/15 text-[var(--admin-warning)]';
    case 'sold':
      return 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]';
    default:
      return 'bg-[var(--admin-surface-2)] text-[var(--admin-muted)]';
  }
}

export function AdminListings({ search = '' }: { search?: string }) {
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'en';
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [page, setPage] = useState(1);
  const [listMeta, setListMeta] = useState<{
    page: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  } | null>(null);

  async function loadList(
    access: string,
    status?: string,
    q?: string,
    pageNum = 1,
  ) {
    const { data, meta } = await apiGetWithMeta<ListingRow[]>(
      '/api/v1/admin/listings',
      {
        token: access,
        searchParams: {
          status: status || undefined,
          q: q || undefined,
          page: String(pageNum),
          limit: '20',
        },
      },
    );
    setRows(data);
    setListMeta(
      meta
        ? {
            page: meta.page,
            totalPages: meta.totalPages,
            hasPreviousPage: meta.hasPreviousPage,
            hasNextPage: meta.hasNextPage,
          }
        : null,
    );
  }

  async function loadMeta(access: string) {
    const [userRows, brandRows, categoryRows, districtRows] = await Promise.all([
      apiGet<AdminUser[]>('/api/v1/admin/users', { token: access }),
      apiGet<Brand[]>('/api/v1/admin/brands', { token: access }),
      apiGet<Category[]>('/api/v1/categories'),
      apiGet<District[]>('/api/v1/locations/districts'),
    ]);
    setUsers(userRows);
    setBrands(brandRows);
    setCategories(categoryRows);
    setDistricts(districtRows);
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void loadMeta(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load listings'),
    );
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (!token) return;
    void loadList(token, statusFilter, search, page).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to filter'),
    );
  }, [token, statusFilter, search, page]);

  useEffect(() => {
    if (!form.brandId) {
      setModels([]);
      return;
    }
    void apiGet<Model[]>(`/api/v1/brands/${form.brandId}/models`)
      .then(setModels)
      .catch(() => setModels([]));
  }, [form.brandId]);

  useEffect(() => {
    if (!form.districtId) {
      setCities([]);
      return;
    }
    void apiGet<City[]>(`/api/v1/locations/districts/${form.districtId}/cities`)
      .then(setCities)
      .catch(() => setCities([]));
  }, [form.districtId]);

  const filtered = useMemo(() => rows, [rows]);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      sellerId: users[0]?.id ?? '',
      brandId: brands[0]?.id ?? '',
      categoryId: categories[0]?.id ?? '',
      districtId: districts[0]?.id ?? '',
    });
    setEditorOpen(true);
  }

  function openEdit(row: ListingRow) {
    setEditingId(row.id);
    setForm({
      sellerId: row.sellerId,
      brandId: row.brandId,
      modelId: row.modelId,
      categoryId: row.categoryId,
      districtId: row.districtId,
      cityId: row.cityId,
      title: row.title,
      description: row.description,
      priceLkr: String(row.priceLkr),
      negotiable: row.negotiable,
      manufactureYear: String(row.manufactureYear),
      registrationYear: row.registrationYear ? String(row.registrationYear) : '',
      engineCc: row.engineCc != null ? String(row.engineCc) : '',
      mileage: row.mileage != null ? String(row.mileage) : '',
      fuelType: row.fuelType,
      transmission: row.transmission,
      condition: row.condition,
      colour: row.colour ?? '',
      phone: row.phone ?? '',
      whatsapp: row.whatsapp ?? '',
      status: row.status,
    });
    setEditorOpen(true);
  }

  function buildPayload() {
    return {
      sellerId: form.sellerId,
      brandId: form.brandId,
      modelId: form.modelId,
      categoryId: form.categoryId,
      districtId: form.districtId,
      cityId: form.cityId,
      title: form.title.trim(),
      description: form.description.trim(),
      priceLkr: Number(form.priceLkr),
      negotiable: form.negotiable,
      manufactureYear: Number(form.manufactureYear),
      registrationYear: form.registrationYear
        ? Number(form.registrationYear)
        : undefined,
      engineCc: Number(form.engineCc),
      mileage: Number(form.mileage || 0),
      fuelType: form.fuelType,
      transmission: form.transmission,
      condition: form.condition,
      colour: form.colour || undefined,
      phone: form.phone.trim(),
      whatsapp: form.whatsapp || undefined,
      status: form.status,
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const body = buildPayload();
      if (editingId) {
        await apiSend(`/api/v1/admin/listings/${editingId}`, {
          method: 'PATCH',
          token,
          body,
        });
      } else {
        await apiSend('/api/v1/admin/listings', { token, body });
      }
      setEditorOpen(false);
      await loadList(token, statusFilter, search, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!token) return;
    if (!window.confirm('Delete this listing? This soft-deletes it.')) return;
    setBusy(true);
    try {
      await apiSend(`/api/v1/admin/listings/${id}`, {
        method: 'DELETE',
        token,
      });
      await loadList(token, statusFilter, search, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function onQuickStatus(id: string, status: string) {
    if (!token) return;
    setBusy(true);
    try {
      await apiSend(`/api/v1/admin/listings/${id}`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      await loadList(token, statusFilter, search, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusy(false);
    }
  }

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--admin-text)]">
            Listings
          </h1>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Create, edit, update status, or delete any listing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-field w-auto min-w-[160px]"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="admin-btn-primary px-4 py-2 text-sm"
            onClick={openCreate}
          >
            + New listing
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-[var(--admin-danger)]">{error}</p> : null}

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--admin-border)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface)] ring-1 ring-[var(--admin-border)]">
                        {row.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.coverImageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight text-[var(--admin-faint)]">
                            No photo
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--admin-text)]">{row.title}</p>
                        <p className="text-xs text-[var(--admin-faint)]">
                          {row.brand?.name ?? '—'} {row.model?.name ?? ''} ·{' '}
                          {row.manufactureYear}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">
                    {row.seller
                      ? `${row.seller.firstName} ${row.seller.lastName}`
                      : row.sellerId.slice(0, 8)}
                    <p className="text-xs text-[var(--admin-faint)]">
                      {row.seller?.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-text)]">
                    Rs. {row.priceLkr.toLocaleString('en-LK')}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.status}
                      disabled={busy}
                      onChange={(e) => void onQuickStatus(row.id, e.target.value)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none ${statusTone(row.status)}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-[var(--admin-bg)] text-[var(--admin-text)]">
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--admin-muted)]">
                    {new Date(row.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/${locale}/bikes/${row.slug}`}
                        aria-label={`View ${row.title}`}
                        title="View listing"
                        className="admin-btn-ghost inline-flex h-8 w-8 items-center justify-center"
                      >
                        <EyeIcon />
                      </Link>
                      <button
                        type="button"
                        className="admin-btn-ghost px-3 py-1.5 text-xs"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-[var(--admin-danger)]/40 px-3 py-1.5 text-xs text-[var(--admin-danger)] hover:bg-[var(--admin-danger)]/10"
                        onClick={() => void onDelete(row.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">No listings found.</p>
        ) : null}
      </div>
      {listMeta ? (
        <AdminPager
          page={listMeta.page}
          totalPages={listMeta.totalPages}
          hasPreviousPage={listMeta.hasPreviousPage}
          hasNextPage={listMeta.hasNextPage}
          onPage={setPage}
        />
      ) : null}

      {editorOpen ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={onSubmit}
            className="admin-card my-8 w-full max-w-3xl space-y-4 p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-text)]">
                  {editingId ? 'Edit listing' : 'Create listing'}
                </h2>
                <p className="text-sm text-[var(--admin-muted)]">
                  All marketplace listing fields, managed by admin.
                </p>
              </div>
              <button
                type="button"
                className="admin-btn-ghost px-3 py-1.5 text-sm"
                onClick={() => setEditorOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Seller</span>
                <select
                  required
                  className="admin-field"
                  value={form.sellerId}
                  onChange={(e) => setForm((f) => ({ ...f, sellerId: e.target.value }))}
                >
                  <option value="">Select seller</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Status</span>
                <select
                  className="admin-field"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-[var(--admin-muted)]">Title</span>
                <input
                  required
                  minLength={5}
                  className="admin-field"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-[var(--admin-muted)]">Description</span>
                <textarea
                  required
                  minLength={20}
                  rows={4}
                  className="admin-field"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Brand</span>
                <select
                  required
                  className="admin-field"
                  value={form.brandId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brandId: e.target.value, modelId: '' }))
                  }
                >
                  <option value="">Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Model</span>
                <select
                  required
                  className="admin-field"
                  value={form.modelId}
                  onChange={(e) => setForm((f) => ({ ...f, modelId: e.target.value }))}
                >
                  <option value="">Model</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Category</span>
                <select
                  required
                  className="admin-field"
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                >
                  <option value="">Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Price (LKR)</span>
                <input
                  required
                  type="number"
                  min={1}
                  className="admin-field"
                  value={form.priceLkr}
                  onChange={(e) => setForm((f) => ({ ...f, priceLkr: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">District</span>
                <select
                  required
                  className="admin-field"
                  value={form.districtId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      districtId: e.target.value,
                      cityId: '',
                    }))
                  }
                >
                  <option value="">District</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">City</span>
                <select
                  required
                  className="admin-field"
                  value={form.cityId}
                  onChange={(e) => setForm((f) => ({ ...f, cityId: e.target.value }))}
                >
                  <option value="">City</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Manufacture year</span>
                <input
                  required
                  type="number"
                  min={1970}
                  max={2100}
                  className="admin-field"
                  value={form.manufactureYear}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, manufactureYear: e.target.value }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Registration year</span>
                <input
                  type="number"
                  min={1970}
                  max={2100}
                  className="admin-field"
                  value={form.registrationYear}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, registrationYear: e.target.value }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Engine CC *</span>
                <input
                  type="number"
                  required
                  min={1}
                  className="admin-field"
                  value={form.engineCc}
                  onChange={(e) => setForm((f) => ({ ...f, engineCc: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Mileage *</span>
                <input
                  type="number"
                  required
                  min={0}
                  className="admin-field"
                  value={form.mileage}
                  onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Fuel</span>
                <select
                  className="admin-field"
                  value={form.fuelType}
                  onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
                >
                  {['petrol', 'diesel', 'electric', 'hybrid', 'other'].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Transmission</span>
                <select
                  className="admin-field"
                  value={form.transmission}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, transmission: e.target.value }))
                  }
                >
                  {['manual', 'automatic', 'semi_automatic', 'other'].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Condition</span>
                <select
                  className="admin-field"
                  value={form.condition}
                  onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                >
                  {['new', 'used', 'reconditioned'].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Colour</span>
                <input
                  className="admin-field"
                  value={form.colour}
                  onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Phone *</span>
                <input
                  required
                  minLength={9}
                  className="admin-field"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">WhatsApp</span>
                <input
                  className="admin-field"
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm text-[var(--admin-muted)]">
                <input
                  type="checkbox"
                  checked={form.negotiable}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, negotiable: e.target.checked }))
                  }
                />
                Negotiable
              </label>
            </div>

            {editingId ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--admin-text)]">
                  Listing photos
                </p>
                <AdminListingImageManager listingId={editingId} />
              </div>
            ) : (
              <p className="text-sm text-[var(--admin-muted)]">
                Save the listing first, then you can add up to 5 photos.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="admin-btn-ghost px-4 py-2 text-sm"
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="admin-btn-primary px-4 py-2 text-sm disabled:opacity-60"
              >
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create listing'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
