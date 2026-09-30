'use client';

import { FormEvent, useEffect, useId, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { apiGetWithMeta, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { AdminUser } from '@/lib/admin-types';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import { useDialogFocusTrap } from '@/lib/use-dialog-focus-trap';
import type { PaginationMeta } from '@throttlelk/types';

const ROLE_OPTIONS = ['buyer', 'seller', 'dealer', 'admin'] as const;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  status: 'active' | 'suspended';
  roles: string[];
};

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  status: 'active',
  roles: ['buyer', 'seller'],
};

export function AdminUsers({ search = '' }: { search?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dialogId = `admin-user-editor-${useId().replace(/:/g, '')}`;
  useDialogFocusTrap(editorOpen, dialogId);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function load(access: string, pageNum = page, q = search) {
    setLoading(true);
    try {
      const { data, meta: nextMeta } = await apiGetWithMeta<AdminUser[]>(
        '/api/v1/admin/users',
        {
          token: access,
          searchParams: {
            page: String(pageNum),
            limit: '20',
            q: q.trim() || undefined,
          },
        },
      );
      const clamp = clampedPage(nextMeta, data.length);
      if (clamp != null && clamp !== pageNum) {
        setPage(clamp);
        return;
      }
      setUsers(data);
      if (nextMeta) setMeta(nextMeta);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access, page, search).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load users'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setEditorOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditingId(user.id);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      password: '',
      status: user.status === 'suspended' ? 'suspended' : 'active',
      roles: user.roles.length ? [...user.roles] : ['buyer'],
    });
    setEditorOpen(true);
  }

  function toggleRole(role: string) {
    setForm((f) => {
      const has = f.roles.includes(role);
      if (has && f.roles.length === 1) return f;
      return {
        ...f,
        roles: has ? f.roles.filter((r) => r !== role) : [...f.roles, role],
      };
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (form.roles.length === 0) {
      setError('Select at least one role');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await apiSend(`/api/v1/admin/users/${editingId}`, {
          method: 'PATCH',
          token,
          body: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            status: form.status,
            roles: form.roles,
            ...(form.password ? { password: form.password } : {}),
          },
        });
      } else {
        await apiSend('/api/v1/admin/users', {
          token,
          body: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
            password: form.password,
            status: form.status,
            roles: form.roles,
          },
        });
      }
      setEditorOpen(false);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!token) return;
    if (!window.confirm('Delete this user permanently?')) return;
    setBusy(true);
    setError(null);
    try {
      await apiSend(`/api/v1/admin/users/${id}`, { method: 'DELETE', token });
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function onQuickStatus(id: string, status: 'active' | 'suspended') {
    if (!token) return;
    setBusy(true);
    try {
      await apiSend(`/api/v1/admin/users/${id}`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusy(false);
    }
  }

  if (!token) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className="admin-btn-primary inline-flex min-h-11 w-full shrink-0 items-center justify-center px-4 py-2 text-sm sm:ml-auto sm:w-auto"
          onClick={openCreate}
        >
          + New user
        </button>
      </div>

      {error && !editorOpen ? (
        <p className="text-sm text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[var(--admin-muted)]"
                  >
                    No users match your search.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface-2)]/50"
                >
                  <td className="px-4 py-3 font-medium text-[var(--admin-text)]">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">{user.email}</td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">
                    {user.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-full bg-[var(--admin-accent-soft)] px-2 py-0.5 text-[11px] text-[var(--admin-accent-2)]"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.status}
                      disabled={busy}
                      onChange={(e) =>
                        void onQuickStatus(
                          user.id,
                          e.target.value as 'active' | 'suspended',
                        )
                      }
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none ${
                        user.status === 'suspended'
                          ? 'bg-[var(--admin-danger)]/15 text-[var(--admin-danger)]'
                          : 'bg-[var(--admin-success)]/15 text-[var(--admin-success)]'
                      }`}
                    >
                      <option value="active" className="bg-[var(--admin-bg)] text-[var(--admin-text)]">
                        active
                      </option>
                      <option
                        value="suspended"
                        className="bg-[var(--admin-bg)] text-[var(--admin-text)]"
                      >
                        suspended
                      </option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin-btn-ghost px-3 py-1.5 text-xs"
                        onClick={() => openEdit(user)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--admin-danger)] hover:bg-[var(--admin-danger)]/10"
                        onClick={() => void onDelete(user.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        variant="admin"
        page={meta.page}
        totalPages={meta.totalPages}
        hasPreviousPage={meta.hasPreviousPage}
        hasNextPage={meta.hasNextPage}
        total={meta.total}
        limit={meta.limit}
        disabled={loading || busy}
        scroll={false}
        onPage={setPage}
      />

      {editorOpen ? (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4"
        >
          <form
            onSubmit={onSubmit}
            className="admin-card my-4 w-full max-h-[90dvh] max-w-[min(100vw-1.5rem,36rem)] space-y-4 overflow-y-auto p-4 sm:my-8 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-text)]">
                  {editingId ? 'Edit user' : 'Create user'}
                </h2>
                <p className="text-sm text-[var(--admin-muted)]">
                  Manage profile, roles, status, and password.
                </p>
              </div>
              <button
                type="button"
                className="admin-btn-ghost inline-flex min-h-11 shrink-0 items-center px-3 py-1.5 text-sm"
                onClick={() => setEditorOpen(false)}
              >
                Close
              </button>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-[var(--admin-danger)]">
                {error}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">First name</span>
                <input
                  required
                  className="admin-field"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Last name</span>
                <input
                  required
                  className="admin-field"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-[var(--admin-muted)]">Email</span>
                <input
                  required
                  type="email"
                  className="admin-field"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Phone</span>
                <input
                  className="admin-field"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[var(--admin-muted)]">Status</span>
                <select
                  className="admin-field"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as 'active' | 'suspended',
                    }))
                  }
                >
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-[var(--admin-muted)]">
                  Password {editingId ? '(leave blank to keep)' : ''}
                </span>
                <input
                  required={!editingId}
                  minLength={8}
                  type="password"
                  className="admin-field"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </label>
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm text-[var(--admin-muted)]">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((role) => {
                    const active = form.roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'bg-[var(--admin-accent)] text-white'
                            : 'border border-[var(--admin-border-strong)] text-[var(--admin-muted)]'
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

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
                className="admin-btn-primary inline-flex min-h-11 w-full items-center justify-center px-4 py-2 text-sm disabled:opacity-60 sm:w-auto"
              >
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
