'use client';

import { useEffect, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { apiGetWithMeta } from '@/lib/api';
import { auditActionLabel, auditActorLabel, auditAreaLabel, AUDIT_AREA_FILTERS } from '@/lib/audit';
import { getAccessToken } from '@/lib/auth';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import type { PaginationMeta } from '@throttlelk/types';

type AuditRow = {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  note: string | null;
  area: string;
  createdAt: string;
};

export function AdminAudit({ search = '' }: { search?: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [area, setArea] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(access: string, pageNum = page, q = search, areaId = area) {
    setLoading(true);
    try {
      const { data, meta: nextMeta } = await apiGetWithMeta<AuditRow[]>(
        '/api/v1/admin/audit-logs',
        {
          token: access,
          searchParams: {
            page: String(pageNum),
            limit: '30',
            q: q.trim() || undefined,
            area: areaId || undefined,
          },
        },
      );
      const clamp = clampedPage(nextMeta, data.length);
      if (clamp != null && clamp !== pageNum) {
        setPage(clamp);
        return;
      }
      setRows(data);
      if (nextMeta) setMeta(nextMeta);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [search, area]);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (access) void load(access, page, search, area);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, area]);

  if (!token) {
    return <p className="text-sm text-[var(--admin-muted)]">Sign in required.</p>;
  }

  const areaLabel = AUDIT_AREA_FILTERS.find((item) => item.id === area)?.label;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Audit section">
        {AUDIT_AREA_FILTERS.map((item) => {
          const selected = area === item.id;
          return (
            <button
              key={item.id || 'all'}
              type="button"
              aria-pressed={selected}
              onClick={() => setArea(item.id)}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium transition ${
                selected
                  ? 'border-[var(--admin-text)] bg-[var(--admin-text)] text-white'
                  : 'border-[var(--admin-border-strong)] bg-white text-[var(--admin-muted)] hover:border-[var(--admin-text)] hover:text-[var(--admin-text)]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-sm text-[var(--admin-danger)]">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Admin</th>
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-[var(--admin-muted)]"
                    >
                      {search.trim()
                        ? 'No audit entries match your search.'
                        : area
                          ? `No ${areaLabel?.toLowerCase()} changes yet.`
                          : 'No audited actions yet.'}
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
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--admin-text)]">
                          {auditActorLabel(row.actorName)}
                        </div>
                        {row.actorEmail ? (
                          <div className="text-xs text-[var(--admin-muted)]">
                            {row.actorEmail}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{auditAreaLabel(row.area, row.entityType)}</td>
                      <td className="px-4 py-3">{auditActionLabel(row.action)}</td>
                      <td className="px-4 py-3">
                        <div className="capitalize">
                          {row.entityType.replaceAll('_', ' ')}
                        </div>
                        {row.entityId ? (
                          <div className="mt-0.5 font-mono text-xs break-all text-[var(--admin-muted)]">
                            {row.entityId}
                          </div>
                        ) : null}
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
