'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

type PartCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
};

export function AdminPartCategories({ search = '' }: { search?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<PartCategory[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(access: string) {
    const data = await apiGet<PartCategory[]>('/api/v1/admin/part-categories', {
      token: access,
    });
    setRows(
      [...data].sort((a, b) => {
        const pa = a.parentName ?? '';
        const pb = b.parentName ?? '';
        if (pa !== pb) return pa.localeCompare(pb);
        return a.name.localeCompare(b.name);
      }),
    );
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load'),
    );
  }, []);

  const parents = useMemo(
    () => rows.filter((r) => !r.parentId).sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        (row.parentName?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiSend('/api/v1/admin/part-categories', {
        token,
        body: {
          name: name.trim(),
          parentId: parentId || null,
        },
      });
      setName('');
      setParentId('');
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSave(id: string) {
    if (!token || !editName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiSend(`/api/v1/admin/part-categories/${id}`, {
        method: 'PATCH',
        token,
        body: { name: editName.trim() },
      });
      setEditingId(null);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!token) return;
    if (!window.confirm('Delete this part category?')) return;
    setBusy(true);
    setError(null);
    try {
      await apiSend(`/api/v1/admin/part-categories/${id}`, {
        method: 'DELETE',
        token,
      });
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  if (!token) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--admin-text)]">
          Part categories
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Categories used when listing spare and modified parts.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onCreate}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] p-4"
      >
        <label className="grid min-w-[180px] flex-1 gap-1.5">
          <span className="text-[11px] tracking-wide text-[var(--admin-faint)] uppercase">
            Parent (optional)
          </span>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="admin-input"
          >
            <option value="">Top-level category</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-[220px] flex-1 gap-1.5">
          <span className="text-[11px] tracking-wide text-[var(--admin-faint)] uppercase">
            New category
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="admin-input"
            placeholder="e.g. Brake pads"
          />
        </label>
        <button type="submit" disabled={busy} className="admin-btn">
          {busy ? '…' : 'Add'}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface)] text-[11px] tracking-wide text-[var(--admin-faint)] uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Parent</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-[var(--admin-muted)]"
                >
                  No part categories yet.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--admin-border)] last:border-0"
                >
                  <td className="px-4 py-3 text-[var(--admin-muted)]">
                    {row.parentName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === row.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="admin-input"
                      />
                    ) : (
                      <span className="font-medium text-[var(--admin-text)]">
                        {row.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                    {row.slug}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {editingId === row.id ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            className="admin-btn"
                            onClick={() => void onSave(row.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="admin-btn-ghost"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="admin-btn-ghost"
                            onClick={() => {
                              setEditingId(row.id);
                              setEditName(row.name);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="admin-btn-ghost text-[var(--admin-danger)]"
                            onClick={() => void onDelete(row.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
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
