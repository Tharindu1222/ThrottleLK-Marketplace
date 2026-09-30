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
    setRows(data);
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
    () =>
      rows
        .filter((r) => !r.parentId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, PartCategory[]>();
    for (const row of rows) {
      if (!row.parentId) continue;
      const list = map.get(row.parentId) ?? [];
      list.push(row);
      map.set(row.parentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [rows]);

  /** Flat tree order: parent, then its children. Orphans last. */
  const treeRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (row: PartCategory) =>
      !q ||
      row.name.toLowerCase().includes(q) ||
      row.slug.toLowerCase().includes(q) ||
      (row.parentName?.toLowerCase().includes(q) ?? false);

    const out: Array<PartCategory & { depth: 0 | 1 }> = [];
    const seen = new Set<string>();

    for (const parent of parents) {
      const kids = (childrenByParent.get(parent.id) ?? []).filter(matches);
      const parentMatch = matches(parent);
      if (!parentMatch && kids.length === 0) continue;
      if (parentMatch || kids.length > 0) {
        out.push({ ...parent, depth: 0 });
        seen.add(parent.id);
      }
      for (const kid of kids) {
        out.push({ ...kid, depth: 1 });
        seen.add(kid.id);
      }
    }

    for (const row of rows) {
      if (seen.has(row.id) || !matches(row)) continue;
      out.push({ ...row, depth: row.parentId ? 1 : 0 });
    }

    return out;
  }, [parents, childrenByParent, rows, search]);

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

  const topCount = parents.length;
  const childCount = rows.length - topCount;

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onCreate}
        className="admin-card flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="grid w-full min-w-0 flex-1 gap-1 sm:min-w-[11rem]">
          <span className="text-[11px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
            Parent
          </span>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="admin-field"
            aria-label="Parent category"
          >
            <option value="">Top-level</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid w-full min-w-0 flex-[2] gap-1 sm:min-w-[14rem]">
          <span className="text-[11px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="admin-field"
            placeholder="e.g. Brake pads"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="admin-btn-primary inline-flex min-h-11 w-full shrink-0 items-center justify-center px-5 text-sm disabled:opacity-50 sm:w-auto"
        >
          {busy ? 'Adding…' : 'Add category'}
        </button>
      </form>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-2.5">
          <p className="text-sm text-[var(--admin-muted)]">
            {rows.length === 0
              ? 'No categories yet'
              : `${topCount} top-level · ${childCount} sub`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-[11px] tracking-wide text-[var(--admin-faint)] uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="w-[28%] px-4 py-2.5 font-medium">Slug</th>
                <th className="w-[9rem] px-4 py-2.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {treeRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-[var(--admin-muted)]"
                  >
                    {search.trim()
                      ? 'No categories match your search.'
                      : 'Add a top-level category to get started.'}
                  </td>
                </tr>
              ) : (
                treeRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface-2)]/40"
                  >
                    <td className="px-4 py-2">
                      {editingId === row.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="admin-field"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void onSave(row.id);
                            }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                      ) : (
                        <div
                          className={`flex items-center gap-2 ${
                            row.depth === 1 ? 'pl-5' : ''
                          }`}
                        >
                          {row.depth === 1 ? (
                            <span
                              className="text-[var(--admin-faint)]"
                              aria-hidden
                            >
                              └
                            </span>
                          ) : null}
                          <span
                            className={
                              row.depth === 0
                                ? 'font-medium text-[var(--admin-text)]'
                                : 'text-[var(--admin-text)]'
                            }
                          >
                            {row.name}
                          </span>
                          {row.depth === 0 ? (
                            <span className="rounded-md bg-[var(--admin-surface-2)] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
                              Top
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="truncate px-4 py-2 font-mono text-xs text-[var(--admin-muted)]">
                      {row.slug}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === row.id ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              className="admin-btn-primary px-2.5 py-1 text-xs"
                              onClick={() => void onSave(row.id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="admin-btn-ghost px-2.5 py-1 text-xs"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="admin-btn-ghost px-2.5 py-1 text-xs"
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
                              className="rounded-lg px-2.5 py-1 text-xs text-[var(--admin-danger)] hover:bg-[var(--admin-danger)]/10 disabled:opacity-50"
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
    </div>
  );
}
