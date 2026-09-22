'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiSend, apiUpload } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

const MAX_PHOTOS = 5;

type ListingImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
};

export function PartListingImageManager({
  listingId,
  locale,
  onChange,
}: {
  listingId: string;
  locale: Locale;
  onChange?: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(access: string) {
    const next = await apiGet<ListingImage[]>(
      `/api/v1/part-listings/${listingId}/images`,
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
        setError(
          err instanceof Error ? err.message : t(locale, 'failedToLoadImages'),
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  if (!token) return null;

  const remaining = MAX_PHOTOS - images.length;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-muted">
        {t(locale, 'photosCount')
          .replace('{n}', String(images.length))
          .replace('{max}', String(MAX_PHOTOS))}
        {images.length > 0 ? t(locale, 'photosCoverHint') : ''}
      </p>
      <div className="flex flex-wrap gap-3">
        {images.map((image, index) => (
          <div key={image.id} className="w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.imageUrl}
              alt={t(locale, 'photoN').replace('{n}', String(index + 1))}
              className="h-20 w-28 object-cover ring-1 ring-black/10"
            />
            <button
              type="button"
              className="mt-1 text-[11px] text-muted underline"
              onClick={() => {
                void apiSend(
                  `/api/v1/part-listings/${listingId}/images/${image.id}`,
                  { method: 'DELETE', token },
                )
                  .then(() => afterMutation(token))
                  .catch((err) =>
                    setError(
                      err instanceof Error
                        ? err.message
                        : t(locale, 'deleteFailed'),
                    ),
                  );
              }}
            >
              {t(locale, 'removePhoto')}
            </button>
          </div>
        ))}
      </div>
      {remaining > 0 ? (
        <label className="inline-flex cursor-pointer items-center gap-2 border border-black/20 px-3 py-2 text-sm transition hover:border-accent">
          {busy
            ? t(locale, 'uploading')
            : t(locale, 'addPhotoLeft').replace('{n}', String(remaining))}
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
                      `/api/v1/part-listings/${listingId}/images`,
                      file,
                      token,
                    );
                  }
                  await afterMutation(token);
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : t(locale, 'uploadFailed'),
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
        <p className="text-sm text-muted">{t(locale, 'photosMaxReached')}</p>
      )}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
