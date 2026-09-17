'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiGet, apiGetWithMeta, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { AdminUser, District } from '@/lib/admin-types';
import { DealerImageManager } from './dealer-image-manager';
import { Pagination } from '@/components/pagination';
import { clampedPage } from '@/lib/pagination';

type City = { id: string; name: string };

type DealerRow = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  districtId: string;
  cityId: string;
  ownerUserId: string;
  status: string;
  verifiedAt: string | null;
  updatedAt: string;
  owner?: { id: string; email: string; firstName: string; lastName: string };
  district?: { id: string; name: string };
  city?: { id: string; name: string };
};

const STATUSES = ['pending', 'active', 'rejected', 'suspended'] as const;

type FormState = {
  ownerUserId: string;
  name: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  districtId: string;
  cityId: string;
  status: string;
};

const emptyForm: FormState = {
  ownerUserId: '',
  name: '',
  description: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  address: '',
  districtId: '',
  cityId: '',
  status: 'pending',
};

function statusTone(status: string) {
  switch (status) {
    case 'active':
      return 'bg-[var(--admin-success)]/15 text-[var(--admin-success)]';
    case 'pending':
      return 'bg-[var(--admin-info)]/15 text-[var(--admin-info)]';
    case 'rejected':
    case 'suspended':
      return 'bg-[var(--admin-danger)]/15 text-[var(--admin-danger)]';
    default:
      return 'bg-[var(--admin-surface-2)] text-[var(--admin-muted)]';
  }
}

export function AdminDealers({ search = '' }: { search?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<DealerRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
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
    total: number;
    limit: number;
  } | null>(null);

  async function loadList(
    access: string,
    status?: string,
    q?: string,
    pageNum = 1,
  ) {
    const { data, meta } = await apiGetWithMeta<DealerRow[]>(
      '/api/v1/admin/dealers',
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
    const clamp = clampedPage(meta, data.length);
    if (clamp != null && clamp !== pageNum) {
      setPage(clamp);
      return;
    }
    setRows(data);
    setListMeta(
      meta
        ? {
            page: meta.page,
            totalPages: meta.totalPages,
            hasPreviousPage: meta.hasPreviousPage,
            hasNextPage: meta.hasNextPage,
            total: meta.total,
            limit: meta.limit,
          }
        : null,
    );
  }

  async function loadMeta(access: string) {
    const [userPage, districtRows] = await Promise.all([
      apiGetWithMeta<AdminUser[]>('/api/v1/admin/users', {
        token: access,
        searchParams: { limit: '100' },
      }),
      apiGet<District[]>('/api/v1/locations/districts'),
    ]);
    setUsers(userPage.data);
    setDistricts(districtRows);
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void loadMeta(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load dealers'),
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
      ownerUserId: users[0]?.id ?? '',
      districtId: districts[0]?.id ?? '',
    });
    setEditorOpen(true);
  }

  function openEdit(row: DealerRow) {
    setEditingId(row.id);
    setForm({
      ownerUserId: row.ownerUserId,
      name: row.name,
      description: row.description ?? '',
      phone: row.phone,
      whatsapp: row.whatsapp ?? '',
      email: row.email ?? '',
      website: row.website ?? '',
      address: row.address ?? '',
      districtId: row.districtId,
      cityId: row.cityId,
      status: row.status,
    });
    setEditorOpen(true);
  }

  function buildPayload() {
    return {
      ownerUserId: form.ownerUserId,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim() || undefined,
      email: form.email.trim() || undefined,
      website: form.website.trim() || undefined,
      address: form.address.trim() || undefined,
      districtId: form.districtId,
      cityId: form.cityId,
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
        await apiSend(`/api/v1/admin/dealers/${editingId}`, {
          method: 'PATCH',
          token,
          body,
        });
        setEditorOpen(false);
      } else {
        const created = await apiSend<DealerRow>('/api/v1/admin/dealers', {
          token,
          body,
        });
        setEditingId(created.id);
      }
      await loadList(token, statusFilter, search, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!token) return;
    if (!window.confirm('Delete this dealer shop permanently?')) return;
    setBusy(true);
    setError(null);
    try {
      await apiSend(`/api/v1/admin/dealers/${id}`, { method: 'DELETE', token });
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
      await apiSend(`/api/v1/admin/dealers/${id}`, {
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
            Dealer shops
          </h1>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Create, edit, approve, or delete dealer shop profiles.
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
            + New dealer
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-[var(--admin-danger)]">{error}</p> : null}

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Shop</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Location</th>
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
                    <p className="font-medium text-[var(--admin-text)]">{row.name}</p>
                    <p className="text-xs text-[var(--admin-faint)]">
                      {row.phone}
                      {row.email ? ` · ${row.email}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">
                    {row.owner
                      ? `${row.owner.firstName} ${row.owner.lastName}`
                      : row.ownerUserId.slice(0, 8)}
                    <p className="text-xs text-[var(--admin-faint)]">
                      {row.owner?.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">
                    {row.city?.name ?? '—'}
                    {row.district?.name ? `, ${row.district.name}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.status}
                      disabled={busy}
                      onChange={(e) => void onQuickStatus(row.id, e.target.value)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none ${statusTone(row.status)}`}
                    >
                      {STATUSES.map((s) => (
                        <option
                          key={s}
                          value={s}
                          className="bg-[var(--admin-bg)] text-[var(--admin-text)]"
                        >
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--admin-muted)]">
                    {new Date(row.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
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
          <p className="p-6 text-sm text-[var(--admin-muted)]">No dealer shops found.</p>
        ) : null}
      </div>
      {listMeta ? (
        <Pagination
          variant="admin"
          page={listMeta.page}
          totalPages={listMeta.totalPages}
          hasPreviousPage={listMeta.hasPreviousPage}
          hasNextPage={listMeta.hasNextPage}
          total={listMeta.total}
          limit={listMeta.limit}
          scroll={false}
          onPage={setPage}
        />
      ) : null}

      {editorOpen ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={onSubmit}
            className="admin-card my-8 w-full max-w-2xl space-y-4 p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-text)]">
                  {editingId ? 'Edit dealer shop' : 'Create dealer shop'}
                </h2>
                <p className="text-sm text-[var(--admin-muted)]">
                  Owner, contact details, location, and status.
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
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-[var(--admin-muted)]">Owner</span>
                <select
                  required
                  className="admin-field"
                  value={form.ownerUserId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ownerUserId: e.target.value }))
                  }
                >
                  <option value="">Select owner</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-[var(--admin-muted)]">Shop name</span>
                <input
                  required
                  minLength={2}
                  className="admin-field"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-[var(--admin-muted)]">Description</span>
                <textarea
                  rows={3}
                  className="admin-field"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Phone</span>
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, whatsapp: e.target.value }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Email</span>
                <input
                  type="email"
                  className="admin-field"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Website</span>
                <input
                  type="url"
                  placeholder="https://"
                  className="admin-field"
                  value={form.website}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, website: e.target.value }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-[var(--admin-muted)]">Address</span>
                <input
                  className="admin-field"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
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
              <label className="space-y-1 text-sm sm:col-span-2">
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
            </div>

            {editingId ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--admin-text)]">
                  Shop photo
                </p>
                <DealerImageManager dealerId={editingId} />
              </div>
            ) : (
              <p className="text-sm text-[var(--admin-muted)]">
                Save the shop first, then you can add 1 photo.
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
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create dealer'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
