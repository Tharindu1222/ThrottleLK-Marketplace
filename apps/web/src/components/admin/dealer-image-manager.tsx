'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiSend, apiUpload } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

const MAX_PHOTOS = 1;

type DealerImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
};

export function DealerImageManager({
  dealerId,
  onChange,
  apiBase = '/api/v1/admin/dealers',
}: {
  dealerId: string;
  onChange?: () => void;
  /** Admin image API prefix, e.g. `/api/v1/admin/dealers` or `/api/v1/admin/parts-dealers`. */
  apiBase?: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [images, setImages] = useState<DealerImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(access: string) {
    setImages(
      await apiGet<DealerImage[]>(`${apiBase}/${dealerId}/images`, {
        token: access,
      }),
    );
  }

  function afterMutation(access: string) {
    return load(access).then(() => onChange?.());
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load images'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealerId, apiBase]);

  if (!token) return null;

  const remaining = MAX_PHOTOS - images.length;

  return (
    <div className="space-y-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] p-4">
      <p className="text-sm text-[var(--admin-muted)]">
        Shop photo {images.length}/{MAX_PHOTOS}
      </p>
      <div className="flex flex-wrap gap-3">
        {images.map((image, index) => (
          <div key={image.id} className="w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.imageUrl}
              alt={`Shop photo ${index + 1}`}
              className="h-20 w-28 rounded-lg object-cover ring-1 ring-[var(--admin-border)]"
            />
            <button
              type="button"
              className="mt-1 text-[11px] text-[var(--admin-muted)] underline hover:text-[var(--admin-danger)]"
              onClick={() => {
                void apiSend(`${apiBase}/${dealerId}/images/${image.id}`, {
                  method: 'DELETE',
                  token,
                })
                  .then(() => afterMutation(token))
                  .catch((err) =>
                    setError(
                      err instanceof Error ? err.message : 'Delete failed',
                    ),
                  );
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {remaining > 0 ? (
        <label className="admin-btn-ghost inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
          {busy ? 'Uploading…' : `Add photo (${remaining} left)`}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setError(null);
              void (async () => {
                try {
                  await apiUpload(
                    `${apiBase}/${dealerId}/images`,
                    file,
                    token,
                  );
                  await afterMutation(token);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : 'Upload failed',
                  );
                } finally {
                  setBusy(false);
                  e.target.value = '';
                }
              })();
            }}
          />
        </label>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--admin-danger)]">{error}</p>
      ) : null}
    </div>
  );
}
