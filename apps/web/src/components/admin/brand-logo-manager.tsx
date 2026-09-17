'use client';

import { useState } from 'react';
import { apiSend, apiUpload } from '@/lib/api';

export type BrandLogo = {
  id: string;
  name: string;
  slug?: string;
  logoUrl: string | null;
  status?: string;
};

export function BrandLogoEditor({
  brand,
  token,
  onUpdated,
}: {
  brand: BrandLogo;
  token: string;
  onUpdated: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      await apiUpload(`/api/v1/admin/brands/${brand.id}/logo`, file, token);
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex aspect-[2/1] items-center justify-center rounded-xl bg-neutral-950 p-3">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt={`${brand.name} logo`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <p className="px-4 text-center text-sm text-white/60">
            No logo yet. Transparent PNG works best.
          </p>
        )}
      </div>
      {error ? (
        <p className="text-sm text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <label className="admin-btn-primary inline-flex min-h-8 cursor-pointer items-center px-2.5 text-xs">
          {busy ? 'Uploading…' : brand.logoUrl ? 'Replace logo' : 'Upload logo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void upload(file);
            }}
          />
        </label>
        {brand.logoUrl ? (
          <button
            type="button"
            className="admin-btn-ghost min-h-8 px-2.5 text-xs"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void apiSend(`/api/v1/admin/brands/${brand.id}/logo`, {
                method: 'DELETE',
                token,
              })
                .then(() => onUpdated())
                .catch((err) =>
                  setError(err instanceof Error ? err.message : 'Remove failed'),
                )
                .finally(() => setBusy(false));
            }}
          >
            Remove logo
          </button>
        ) : null}
      </div>
      <p className="text-xs text-[var(--admin-faint)]">
        JPEG, PNG, or WebP · max 5MB
      </p>
    </div>
  );
}
