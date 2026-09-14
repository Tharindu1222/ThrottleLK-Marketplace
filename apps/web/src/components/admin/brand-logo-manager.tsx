'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiSend, apiUpload } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

type BrandLogo = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status?: string;
};

export function BrandLogoManager() {
  const [token, setToken] = useState<string | null>(null);
  const [brands, setBrands] = useState<BrandLogo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(access: string) {
    const rows = await apiGet<BrandLogo[]>('/api/v1/admin/brands', {
      token: access,
    });
    setBrands(
      rows
        .filter((b) => (b.status ?? 'active') === 'active')
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load brands'),
    );
  }, []);

  if (!token) return null;

  return (
    <div className="admin-card space-y-4 p-5">
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--admin-text)]">
          Brand logos
        </h3>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Homepage &quot;Browse by brand&quot; — JPEG, PNG, or WebP, max 5MB.
          Prefer transparent PNG logos.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-[var(--admin-danger)]">{error}</p>
      ) : null}

      <ul className="grid max-h-[28rem] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {brands.map((brand) => (
          <li
            key={brand.id}
            className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)]"
          >
            <div className="flex aspect-[5/3] items-center justify-center bg-black/95 p-3">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logoUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-center text-xs text-[var(--admin-muted)]">
                  {brand.name}
                </span>
              )}
            </div>
            <div className="space-y-2 p-3">
              <p className="truncate text-sm text-[var(--admin-text)]">
                {brand.name}
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="admin-btn-ghost inline-flex cursor-pointer items-center px-2.5 py-1.5 text-xs">
                  {busyId === brand.id
                    ? 'Uploading…'
                    : brand.logoUrl
                      ? 'Replace'
                      : 'Upload'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={busyId === brand.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBusyId(brand.id);
                      setError(null);
                      void (async () => {
                        try {
                          await apiUpload(
                            `/api/v1/admin/brands/${brand.id}/logo`,
                            file,
                            token,
                          );
                          await load(token);
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Upload failed',
                          );
                        } finally {
                          setBusyId(null);
                          e.target.value = '';
                        }
                      })();
                    }}
                  />
                </label>
                {brand.logoUrl ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--admin-muted)] underline hover:text-[var(--admin-danger)]"
                    disabled={busyId === brand.id}
                    onClick={() => {
                      setBusyId(brand.id);
                      setError(null);
                      void apiSend(`/api/v1/admin/brands/${brand.id}/logo`, {
                        method: 'DELETE',
                        token,
                      })
                        .then(() => load(token))
                        .catch((err) =>
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Remove failed',
                          ),
                        )
                        .finally(() => setBusyId(null));
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
