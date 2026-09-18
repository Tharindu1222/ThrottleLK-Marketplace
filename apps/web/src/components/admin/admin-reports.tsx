'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { apiGetWithMeta, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { AdminReport } from '@/lib/admin-types';
import type { Locale } from '@/lib/i18n';
import { clampedPage, emptyMeta } from '@/lib/pagination';
import type { PaginationMeta } from '@throttlelk/types';

export function AdminReports({ search = '' }: { search?: string }) {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const [token, setToken] = useState<string | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(access: string, pageNum = page, q = search) {
    setLoading(true);
    try {
      const { data, meta: nextMeta } = await apiGetWithMeta<AdminReport[]>(
        '/api/v1/admin/reports/open',
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
      setReports(data);
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
      setError(err instanceof Error ? err.message : 'Failed to load reports'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function resolve(
    reportId: string,
    action: 'remove_listing' | 'dismiss' | 'warn_seller',
  ) {
    if (!token) return;
    if (
      action === 'remove_listing' &&
      !window.confirm(
        'Remove this listing from the marketplace and close the report?',
      )
    ) {
      return;
    }
    if (
      action === 'warn_seller' &&
      !window.confirm(
        'Send a warning notification to the seller and close the report? The listing stays live.',
      )
    ) {
      return;
    }
    setBusyId(reportId);
    setError(null);
    try {
      await apiSend(`/api/v1/admin/reports/${reportId}/resolve`, {
        token,
        body: { action },
      });
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resolve failed');
    } finally {
      setBusyId(null);
    }
  }

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--admin-text)]">
          Reports
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Review open reports. Warn the seller, remove the listing, or dismiss
          if everything looks fine.
        </p>
      </div>

      {error ? <p className="text-sm text-[var(--admin-danger)]">{error}</p> : null}

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const listing = report.listing;
                const listingHref = listing?.slug
                  ? `/${locale}/bikes/${listing.slug}`
                  : null;
                const busy = busyId === report.id;
                return (
                  <tr
                    key={report.id}
                    className="border-b border-[var(--admin-border)] last:border-0"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--admin-muted)]">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--admin-text)]">
                      {report.reason}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-xs items-center gap-3">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface)]">
                          {listing?.coverImageUrl ? (
                            <Image
                              src={listing.coverImageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--admin-text)]">
                            {listing?.title ?? 'Listing unavailable'}
                          </p>
                          {listingHref ? (
                            <Link
                              href={listingHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--admin-accent)] hover:underline"
                            >
                              View listing
                            </Link>
                          ) : (
                            <p className="font-mono text-xs text-[var(--admin-muted)]">
                              {report.listingId.slice(0, 8)}…
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-[var(--admin-muted)]">
                      {report.description}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || !listing}
                          className="admin-btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
                          onClick={() =>
                            void resolve(report.id, 'remove_listing')
                          }
                        >
                          Remove listing
                        </button>
                        <button
                          type="button"
                          disabled={busy || !listing}
                          className="rounded-lg border border-[var(--admin-warning)]/40 bg-[var(--admin-warning)]/10 px-3 py-1.5 text-xs font-medium text-[var(--admin-warning)] transition hover:bg-[var(--admin-warning)]/20 disabled:opacity-50"
                          onClick={() => void resolve(report.id, 'warn_seller')}
                        >
                          Warn seller
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="admin-btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
                          onClick={() => void resolve(report.id, 'dismiss')}
                        >
                          Dismiss report
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {reports.length === 0 ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">No open reports.</p>
        ) : null}
      </div>
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
