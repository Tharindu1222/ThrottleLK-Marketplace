'use client';

import { useEffect, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { apiGetWithMeta } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import type { PaginationMeta } from '@throttlelk/types';

type AuditRow = {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  note: string | null;
  createdAt: string;
};

export function AdminAudit() {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(access: string, pageNum = page) {
    setLoading(true);
    try {
      const { data, meta: nextMeta } = await apiGetWithMeta<AuditRow[]>(
        '/api/v1/admin/audit-logs',
        {
          token: access,
          searchParams: { page: String(pageNum), limit: '30' },
        },
      );
      const clamp = clampedPage(nextMeta, data.length);
      if (clamp != null && clamp !== pageNum) {
        setPage(clamp);
        return;
      }
      setRows(data);
      if (nextMeta) setMeta(nextMeta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (access) void load(access);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (!token) {
    return <p className="text-sm text-[var(--admin-muted)]">Sign in required.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-[var(--admin-muted)]">
        Sensitive administrator actions, newest first.
      </p>
      {error ? (
        <p className="mt-4 text-sm text-[var(--admin-danger)]">{error}</p>
      ) : null}
      {loading ? (
        <p className="mt-6 text-sm text-[var(--admin-muted)]">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Action</th>
                <th className="py-2 pr-3 font-medium">Entity</th>
                <th className="py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--admin-border)]"
                >
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString('en-LK')}
                  </td>
                  <td className="py-2 pr-3">{row.action}</td>
                  <td className="py-2 pr-3">
                    {row.entityType}
                    {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
                  </td>
                  <td className="py-2">{row.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--admin-muted)]">
              No audited actions yet.
            </p>
          ) : null}
        </div>
      )}
      <Pagination
        variant="admin"
        page={meta.page}
        totalPages={meta.totalPages}
        hasPreviousPage={meta.hasPreviousPage}
        hasNextPage={meta.hasNextPage}
        total={meta.total}
        limit={meta.limit}
        disabled={loading}
        scroll={false}
        onPage={setPage}
      />
    </div>
  );
}
