'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiGet, apiGetWithMeta } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import type { AdminPartListing, AdminPartsDealerRow } from '@/lib/admin-types';
import { Pagination } from '@/components/pagination';
import { clampedPage } from '@/lib/pagination';

function dealerStatusTone(status: string) {
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

function partStatusTone(status: string) {
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

function kindLabel(kind: string) {
  return kind === 'modified' ? 'Modified' : 'Spare';
}

function partViewHref(locale: string, row: AdminPartListing) {
  return row.kind === 'modified'
    ? `/${locale}/modified-parts/${row.slug}`
    : `/${locale}/spare-parts/${row.slug}`;
}

export function AdminPartsDealerDetail({ id }: { id: string }) {
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'en';

  const [token, setToken] = useState<string | null>(null);
  const [shop, setShop] = useState<AdminPartsDealerRow | null>(null);
  const [inventory, setInventory] = useState<AdminPartListing[]>([]);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [listMeta, setListMeta] = useState<{
    page: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    total: number;
    limit: number;
  } | null>(null);

  async function loadShop(access: string) {
    setLoadingShop(true);
    try {
      const data = await apiGet<AdminPartsDealerRow>(
        `/api/v1/admin/parts-dealers/${id}`,
        { token: access },
      );
      setShop(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shop');
    } finally {
      setLoadingShop(false);
    }
  }

  async function loadInventory(access: string, pageNum = 1) {
    setLoadingInventory(true);
    try {
      const { data, meta } = await apiGetWithMeta<AdminPartListing[]>(
        '/api/v1/admin/part-listings',
        {
          token: access,
          searchParams: {
            partsDealerId: id,
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
      setInventory(data);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoadingInventory(false);
    }
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void loadShop(access);
  }, [id]);

  useEffect(() => {
    if (!token) return;
    void loadInventory(token, page);
  }, [token, id, page]);

  if (!token) return null;

  const statusEntries = Object.entries(shop?.partsByStatus ?? {}).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/${locale}/admin/parts-dealers`}
            className="text-sm text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:underline"
          >
            ← Back to parts shops
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--admin-text)]">
            {loadingShop ? 'Loading shop…' : (shop?.name ?? 'Parts shop')}
          </h1>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Shop profile and inventory overview.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shop?.slug ? (
            <Link
              href={`/${locale}/parts-dealers/${shop.slug}`}
              className="admin-btn-ghost px-4 py-2 text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              Public view
            </Link>
          ) : null}
          <Link
            href={`/${locale}/admin/part-listings?partsDealerId=${id}`}
            className="admin-btn-primary px-4 py-2 text-sm"
          >
            + Add part
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-[var(--admin-danger)]">{error}</p> : null}

      {loadingShop && !shop ? (
        <div className="admin-card p-6 text-sm text-[var(--admin-muted)]">
          Loading shop details…
        </div>
      ) : shop ? (
        <div className="admin-card overflow-hidden">
          <div className="grid gap-6 p-6 lg:grid-cols-[240px_1fr]">
            <div className="overflow-hidden rounded-xl bg-[var(--admin-surface)] ring-1 ring-[var(--admin-border)]">
              {shop.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shop.coverImageUrl}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center px-4 text-center text-sm text-[var(--admin-faint)]">
                  No cover photo
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${dealerStatusTone(shop.status)}`}
                >
                  {shop.status}
                </span>
                {shop.status === 'active' && shop.verifiedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-success)]/15 px-2.5 py-1 text-xs font-medium text-[var(--admin-success)]">
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--admin-success)] text-white"
                      aria-hidden
                    >
                      <svg viewBox="0 0 20 20" width="10" height="10" fill="none">
                        <path
                          d="M6.2 10.2 8.6 12.6 13.8 7.2"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    Verified
                  </span>
                ) : null}
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--admin-faint)]">Owner</dt>
                  <dd className="text-[var(--admin-text)]">
                    {shop.owner
                      ? `${shop.owner.firstName} ${shop.owner.lastName}`
                      : shop.ownerUserId.slice(0, 8)}
                  </dd>
                  {shop.owner?.email ? (
                    <dd className="text-xs text-[var(--admin-muted)]">
                      {shop.owner.email}
                    </dd>
                  ) : null}
                </div>
                <div>
                  <dt className="text-[var(--admin-faint)]">Phone</dt>
                  <dd className="text-[var(--admin-text)]">{shop.phone}</dd>
                  {shop.whatsapp ? (
                    <dd className="text-xs text-[var(--admin-muted)]">
                      WhatsApp: {shop.whatsapp}
                    </dd>
                  ) : null}
                </div>
                <div>
                  <dt className="text-[var(--admin-faint)]">Email</dt>
                  <dd className="text-[var(--admin-text)]">{shop.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[var(--admin-faint)]">Location</dt>
                  <dd className="text-[var(--admin-text)]">
                    {shop.city?.name ?? '—'}
                    {shop.district?.name ? `, ${shop.district.name}` : ''}
                  </dd>
                  {shop.address ? (
                    <dd className="text-xs text-[var(--admin-muted)]">
                      {shop.address}
                    </dd>
                  ) : null}
                </div>
                {shop.website ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[var(--admin-faint)]">Website</dt>
                    <dd>
                      <a
                        href={shop.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--admin-accent)] hover:underline"
                      >
                        {shop.website}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>

              {shop.description ? (
                <div>
                  <p className="text-xs tracking-wide text-[var(--admin-faint)] uppercase">
                    Description
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-[var(--admin-muted)]">
                    {shop.description}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--admin-surface-2)] px-3 py-1 text-xs font-medium text-[var(--admin-text)]">
                  Total parts: {shop.partsCount ?? 0}
                </span>
                {statusEntries.map(([status, count]) => (
                  <span
                    key={status}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${partStatusTone(status)}`}
                  >
                    {status.replace('_', ' ')}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-card p-6 text-sm text-[var(--admin-muted)]">
          Shop not found.
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
              Inventory
            </h2>
            <p className="text-sm text-[var(--admin-muted)]">
              Parts listed by this shop.
            </p>
          </div>
          <Link
            href={`/${locale}/admin/part-listings?partsDealerId=${id}`}
            className="admin-btn-ghost px-3 py-1.5 text-sm"
          >
            Manage all in Part listings
          </Link>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Part</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row) => (
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
                          <p className="font-medium text-[var(--admin-text)]">
                            {row.title}
                          </p>
                          <p className="text-xs text-[var(--admin-faint)]">
                            {kindLabel(row.kind)}
                            {row.category?.name ? ` · ${row.category.name}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text)]">
                      Rs. {row.priceLkr.toLocaleString('en-LK')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${partStatusTone(row.status)}`}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--admin-muted)]">
                      {new Date(row.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={partViewHref(locale, row)}
                          className="admin-btn-ghost px-2 py-1 text-sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </Link>
                        <Link
                          href={`/${locale}/admin/part-listings?partsDealerId=${id}&q=${encodeURIComponent(row.title)}`}
                          className="admin-btn-ghost px-2 py-1 text-sm"
                        >
                          Edit in Part listings
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loadingInventory ? (
            <p className="p-6 text-sm text-[var(--admin-muted)]">
              Loading inventory…
            </p>
          ) : inventory.length === 0 ? (
            <p className="p-6 text-sm text-[var(--admin-muted)]">
              No parts listed for this shop yet.
            </p>
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
      </div>
    </div>
  );
}
