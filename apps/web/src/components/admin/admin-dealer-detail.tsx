'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiGet, apiGetWithMeta, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { Pagination } from '@/components/pagination';
import { clampedPage } from '@/lib/pagination';

type DealerShop = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  status: string;
  verifiedAt: string | null;
  coverImageUrl?: string | null;
  ownerUserId: string;
  owner?: { firstName: string; lastName: string; email: string } | null;
  city?: { name: string } | null;
  district?: { name: string } | null;
  listingsCount?: number;
  listingsByStatus?: Record<string, number>;
};

type ShopListing = {
  id: string;
  title: string;
  slug: string;
  priceLkr: number;
  status: string;
  updatedAt: string;
  coverImageUrl?: string | null;
  brand?: { name: string };
  model?: { name: string };
};

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

function listingStatusTone(status: string) {
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

export function AdminDealerDetail({ id }: { id: string }) {
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'en';

  const [token, setToken] = useState<string | null>(null);
  const [shop, setShop] = useState<DealerShop | null>(null);
  const [inventory, setInventory] = useState<ShopListing[]>([]);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingVerified, setSavingVerified] = useState(false);
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
      const data = await apiGet<DealerShop>(`/api/v1/admin/dealers/${id}`, {
        token: access,
      });
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
      const { data, meta } = await apiGetWithMeta<ShopListing[]>(
        '/api/v1/admin/listings',
        {
          token: access,
          searchParams: {
            dealerId: id,
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
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoadingInventory(false);
    }
  }

  async function onToggleVerified() {
    if (!token || !shop || shop.status !== 'active') return;
    const next = !shop.verifiedAt;
    setSavingVerified(true);
    setError(null);
    try {
      await apiSend(`/api/v1/admin/dealers/${id}`, {
        method: 'PATCH',
        token,
        body: { verified: next },
      });
      await loadShop(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification update failed');
    } finally {
      setSavingVerified(false);
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

  const statusEntries = Object.entries(shop?.listingsByStatus ?? {}).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/${locale}/admin/dealers`}
            className="text-sm text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:underline"
          >
            ← Back to dealer shops
          </Link>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {shop?.slug ? (
            <Link
              href={`/${locale}/dealers/${shop.slug}`}
              className="admin-btn-ghost inline-flex min-h-11 w-full items-center justify-center px-4 py-2 text-sm sm:w-auto"
              target="_blank"
              rel="noopener noreferrer"
            >
              Public view
            </Link>
          ) : null}
          <Link
            href={`/${locale}/admin/listings?dealerId=${id}`}
            className="admin-btn-primary inline-flex min-h-11 w-full items-center justify-center px-4 py-2 text-sm sm:w-auto"
          >
            Manage listings
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
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--admin-text)]">
                  {shop.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${dealerStatusTone(shop.status)}`}
                  >
                    {shop.status}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(shop.verifiedAt)}
                    aria-label={
                      shop.verifiedAt
                        ? `Turn off verification for ${shop.name}`
                        : `Verify ${shop.name}`
                    }
                    title={
                      shop.status === 'active'
                        ? 'Verified badge on the public shop'
                        : 'Set the shop to active before verifying'
                    }
                    disabled={savingVerified || shop.status !== 'active'}
                    onClick={() => void onToggleVerified()}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                      shop.verifiedAt
                        ? 'bg-[var(--admin-success)]'
                        : 'bg-[var(--admin-surface-2)] ring-1 ring-[var(--admin-border-strong)]'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                        shop.verifiedAt ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
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
                  Total listings: {shop.listingsCount ?? 0}
                </span>
                {statusEntries.map(([status, count]) => (
                  <span
                    key={status}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${listingStatusTone(status)}`}
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
              Listings
            </h2>
            <p className="text-sm text-[var(--admin-muted)]">
              Bikes listed by this shop.
            </p>
          </div>
          <Link
            href={`/${locale}/admin/listings?dealerId=${id}`}
            className="admin-btn-ghost inline-flex min-h-11 shrink-0 items-center px-3 py-1.5 text-sm"
          >
            Manage all in Listings
          </Link>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] text-xs tracking-wide text-[var(--admin-faint)] uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Bike</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingInventory ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-[var(--admin-muted)]"
                    >
                      Loading listings…
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-[var(--admin-muted)]"
                    >
                      No bikes listed for this shop yet.
                    </td>
                  </tr>
                ) : (
                  inventory.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-surface-2)]/50"
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
                              {[row.brand?.name, row.model?.name]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-text)]">
                        Rs. {row.priceLkr.toLocaleString('en-LK')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${listingStatusTone(row.status)}`}
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
                            href={`/${locale}/bikes/${row.slug}`}
                            className="admin-btn-ghost px-2 py-1 text-sm"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </Link>
                          <Link
                            href={`/${locale}/admin/listings?dealerId=${id}`}
                            className="admin-btn-ghost px-2 py-1 text-sm"
                          >
                            Edit in Listings
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
