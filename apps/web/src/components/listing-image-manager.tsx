'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiSend, apiUpload } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

const MAX_PHOTOS = 5;

type ListingImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
};

export function ListingImageManager({
  listingId,
  onChange,
}: {
  listingId: string;
  onChange?: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(access: string) {
    const next = await apiGet<ListingImage[]>(
      `/api/v1/listings/${listingId}/images`,
      { token: access },
    );
    setImages(next);
    return next;
  }

  function afterMutation(access: string) {
    return load(access).then(() => onChange?.());
  }

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access)
      .then(() => onChange?.())
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load images'),
      );
  }, [listingId]);

  if (!token) return null;

  const remaining = MAX_PHOTOS - images.length;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-muted">
        Photos {images.length}/{MAX_PHOTOS}
        {images.length > 0 ? ' · first photo is shown on browse' : ''}
      </p>
      <div className="flex flex-wrap gap-3">
        {images.map((image, index) => (
          <div key={image.id} className="w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.imageUrl}
              alt={`Photo ${index + 1}`}
              className="h-20 w-28 object-cover ring-1 ring-white/10"
            />
            <button
              type="button"
              className="mt-1 text-[11px] text-muted underline"
              onClick={() => {
                void apiSend(
                  `/api/v1/listings/${listingId}/images/${image.id}`,
                  { method: 'DELETE', token },
                )
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
        <label className="inline-flex cursor-pointer items-center gap-2 border border-white/20 px-3 py-2 text-sm hover:border-accent">
          {busy ? 'Uploading…' : `Add photo (${remaining} left)`}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const files = [...(e.target.files ?? [])].slice(0, remaining);
              if (files.length === 0) return;
              setBusy(true);
              setError(null);
              void (async () => {
                try {
                  for (const file of files) {
                    await apiUpload(
                      `/api/v1/listings/${listingId}/images`,
                      file,
                      token,
                    );
                  }
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
      ) : (
        <p className="text-sm text-muted">Maximum 5 photos reached.</p>
      )}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
