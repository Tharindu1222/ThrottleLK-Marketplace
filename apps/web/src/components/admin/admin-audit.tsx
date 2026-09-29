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
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-[var(--admin-danger)]">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-[var(--admin-muted)]"
                    >
                      No audited actions yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface-2)]/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString('en-LK')}
                      </td>
                      <td className="px-4 py-3">{row.action}</td>
                      <td className="px-4 py-3">
                        {row.entityType}
                        {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
                      </td>
                      <td className="px-4 py-3">{row.note ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
