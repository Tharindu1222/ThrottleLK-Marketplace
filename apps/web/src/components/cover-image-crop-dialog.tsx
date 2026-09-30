'use client';

import { useCallback, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import {
  getCroppedCoverFile,
  type CroppedAreaPixels,
} from '@/lib/cover-crop';
import { t, type Locale } from '@/lib/i18n';
import { useDialogFocusTrap } from '@/lib/use-dialog-focus-trap';

const COVER_ASPECT = 2;

type Props = {
  locale: Locale;
  imageSrc: string;
  fileName: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void | Promise<void>;
};

export function CoverImageCropDialog({
  locale,
  imageSrc,
  fileName,
  open,
  onCancel,
  onConfirm,
}: Props) {
  const reactId = useId();
  const dialogId = `cover-crop-${reactId.replace(/:/g, '')}`;
  useDialogFocusTrap(open, dialogId);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<CroppedAreaPixels | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback(
    async (_area: Area, pixels: Area) => {
      setCroppedAreaPixels(pixels);
      try {
        const file = await getCroppedCoverFile(imageSrc, pixels, 'preview.jpg', 800);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
      } catch {
        /* preview is best-effort */
      }
    },
    [imageSrc],
  );

  if (!open || typeof document === 'undefined') return null;

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    setError(null);
    try {
      const file = await getCroppedCoverFile(
        imageSrc,
        croppedAreaPixels,
        fileName.replace(/\.\w+$/, '') + '.jpg',
      );
      await onConfirm(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'uploadFailed'));
      setBusy(false);
    }
  }

  function handleCancel() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onCancel();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-3 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) handleCancel();
      }}
    >
      <div
        id={dialogId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        className="flex max-h-[90dvh] w-[min(100vw-1.5rem,48rem)] flex-col overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 sm:px-5">
          <h2
            id={`${dialogId}-title`}
            className="font-[family-name:var(--font-display)] text-lg tracking-wide"
          >
            {t(locale, 'cropCoverTitle')}
          </h2>
          <button
            type="button"
            className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-black/5"
            onClick={handleCancel}
            disabled={busy}
          >
            {t(locale, 'cancel')}
          </button>
        </header>

        <div className="relative h-56 bg-zinc-900 sm:h-72">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={COVER_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(a, p) => void onCropComplete(a, p)}
            showGrid={false}
          />
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <label className="block space-y-1.5">
            <span className="text-xs tracking-wide text-muted uppercase">
              {t(locale, 'cropZoom')}
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[var(--accent,#e10600)]"
              disabled={busy}
            />
          </label>

          <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[10px] tracking-wide text-muted uppercase">
                {t(locale, 'cropPreviewDesktop')}
              </p>
              <div className="relative aspect-[3.2/1] overflow-hidden rounded-lg bg-zinc-200">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] tracking-wide text-muted uppercase">
                {t(locale, 'cropPreviewPhone')}
              </p>
              <div className="relative mx-auto aspect-[4/5] max-h-36 w-full max-w-[7rem] overflow-hidden rounded-lg bg-zinc-200">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                ) : null}
              </div>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-xs text-muted">{t(locale, 'cropCoverHint')}</p>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-black/10 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium hover:bg-black/[0.03]"
            onClick={handleCancel}
            disabled={busy}
          >
            {t(locale, 'cancel')}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
            onClick={() => void handleConfirm()}
            disabled={busy || !croppedAreaPixels}
          >
            {busy ? t(locale, 'uploading') : t(locale, 'useCroppedCover')}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
