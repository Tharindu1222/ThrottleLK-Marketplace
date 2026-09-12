'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiSend, apiUpload } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

type CategoryCover = {
  id: string;
  name: string;
  slug: string;
  coverImageUrl: string | null;
};

export function CategoryCoverManager() {
  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryCover[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(access: string) {
    setCategories(
      await apiGet<CategoryCover[]>('/api/v1/admin/categories', {
        token: access,
      }),
    );
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load categories'),
    );
  }, []);

  if (!token) return null;

  return (
    <div className="admin-card space-y-4 p-5">
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--admin-text)]">
          Category covers
        </h3>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Homepage &quot;Choose Your Ride&quot; cards — JPEG, PNG, or WebP, max 5MB.
          Leave empty to keep the default SVG.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-[var(--admin-danger)]">{error}</p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <li
            key={category.id}
            className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)]"
          >
            <div className="relative aspect-[16/10] bg-[var(--admin-bg)]">
              {category.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--admin-muted)]">
                  Default SVG
                </div>
              )}
            </div>
            <div className="space-y-2 p-3">
              <p className="font-[family-name:var(--font-display)] text-sm text-[var(--admin-text)]">
                {category.name}
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="admin-btn-ghost inline-flex cursor-pointer items-center px-2.5 py-1.5 text-xs">
                  {busyId === category.id
                    ? 'Uploading…'
                    : category.coverImageUrl
                      ? 'Replace'
                      : 'Upload'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={busyId === category.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBusyId(category.id);
                      setError(null);
                      void (async () => {
                        try {
                          await apiUpload(
                            `/api/v1/admin/categories/${category.id}/cover`,
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
                {category.coverImageUrl ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--admin-muted)] underline hover:text-[var(--admin-danger)]"
                    disabled={busyId === category.id}
                    onClick={() => {
                      setBusyId(category.id);
                      setError(null);
                      void apiSend(
                        `/api/v1/admin/categories/${category.id}/cover`,
                        { method: 'DELETE', token },
                      )
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
