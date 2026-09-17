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

export function CategoryCoverManager({ search = '' }: { search?: string }) {
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

  const q = search.trim().toLowerCase();
  const visible = q
    ? categories.filter((c) => c.name.toLowerCase().includes(q))
    : categories;

  async function uploadCover(categoryId: string, file: File) {
    setBusyId(categoryId);
    setError(null);
    try {
      await apiUpload(
        `/api/v1/admin/categories/${categoryId}/cover`,
        file,
        token,
      );
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--admin-muted)]">
          Homepage ride cards · JPEG, PNG, or WebP, max 5MB
        </p>
        <p className="text-xs text-[var(--admin-faint)]">
          {visible.length} of {categories.length}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="admin-card px-6 py-10 text-center">
          <p className="text-sm text-[var(--admin-muted)]">
            {q
              ? `No categories match “${search.trim()}”.`
              : 'No categories yet.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((category) => {
            const busy = busyId === category.id;
            return (
              <li key={category.id} className="admin-card overflow-hidden">
                <div className="relative aspect-[16/9] bg-[var(--admin-surface-2)]">
                  {category.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={category.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-xs text-[var(--admin-faint)]">
                      Default artwork
                    </div>
                  )}
                  <span
                    className={`absolute top-2 left-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      category.coverImageUrl
                        ? 'bg-[var(--admin-success)]/15 text-[var(--admin-success)]'
                        : 'bg-black/50 text-white'
                    }`}
                  >
                    {category.coverImageUrl ? 'Custom' : 'Default'}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-3 pt-8 pb-2.5">
                    <h3 className="truncate text-sm font-medium text-white">
                      {category.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <label className="admin-btn-primary inline-flex min-h-8 cursor-pointer items-center px-2.5 text-xs disabled:opacity-60">
                        {busy
                          ? 'Uploading…'
                          : category.coverImageUrl
                            ? 'Replace'
                            : 'Upload'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={busy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void uploadCover(category.id, file);
                          }}
                        />
                      </label>
                      {category.coverImageUrl ? (
                        <button
                          type="button"
                          className="inline-flex min-h-8 items-center rounded-lg px-2.5 text-xs text-white/90 hover:bg-white/10 hover:text-white disabled:opacity-60"
                          disabled={busy}
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
