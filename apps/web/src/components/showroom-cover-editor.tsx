'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { CoverImageCropDialog } from '@/components/cover-image-crop-dialog';
import {
  clampCoverFocus,
  coverObjectPosition,
} from '@/lib/cover-crop';
import { t, type Locale } from '@/lib/i18n';

type Props = {
  locale: Locale;
  shopName: string;
  showroomHref: string;
  imageUrl: string | null;
  coverFocusX: number;
  coverFocusY: number;
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  onSaveFocus: (x: number, y: number) => Promise<void>;
};

export function ShowroomCoverEditor({
  locale,
  shopName,
  showroomHref,
  imageUrl,
  coverFocusX,
  coverFocusY,
  busy,
  onUpload,
  onRemove,
  onSaveFocus,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState('cover.jpg');
  const [focusX, setFocusX] = useState(clampCoverFocus(coverFocusX));
  const [focusY, setFocusY] = useState(clampCoverFocus(coverFocusY));
  const [framing, setFraming] = useState(false);
  const [savingFocus, setSavingFocus] = useState(false);
  const framingId = useId();

  useEffect(() => {
    setFocusX(clampCoverFocus(coverFocusX));
    setFocusY(clampCoverFocus(coverFocusY));
  }, [coverFocusX, coverFocusY, imageUrl]);

  useEffect(() => {
    return () => {
      if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    };
  }, [pendingSrc]);

  function onPickFile(file: File | undefined) {
    if (!file) return;
    const src = URL.createObjectURL(file);
    setPendingSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return src;
    });
    setPendingName(file.name || 'cover.jpg');
  }

  async function handleCropped(file: File) {
    try {
      await onUpload(file);
      if (pendingSrc) URL.revokeObjectURL(pendingSrc);
      setPendingSrc(null);
      setFocusX(50);
      setFocusY(50);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSaveFocus() {
    setSavingFocus(true);
    try {
      await onSaveFocus(focusX, focusY);
      setFraming(false);
    } finally {
      setSavingFocus(false);
    }
  }

  const position = coverObjectPosition(focusX, focusY);

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
        <div className="relative isolate h-[50dvh] min-h-48 overflow-hidden bg-zinc-200">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={shopName}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: position }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(145deg,#eceef1_0%,#f7f8f9_50%,#e8eaed_100%)]">
              <p className="text-sm text-muted">{t(locale, 'noShowroomCover')}</p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pt-16 pb-4 sm:px-6 sm:pb-5">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 text-white">
                <p className="text-[10px] tracking-[0.2em] text-white/70 uppercase">
                  {t(locale, 'showroomCover')}
                </p>
                <h2 className="mt-1 truncate font-[family-name:var(--font-display)] text-2xl tracking-wide sm:text-3xl">
                  {shopName}
                </h2>
                <Link
                  href={showroomHref}
                  className="mt-1 inline-flex text-sm font-medium text-white/90 underline-offset-2 hover:underline"
                >
                  {t(locale, 'viewShowroom')} →
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`inline-flex max-w-full cursor-pointer items-center justify-center rounded-full bg-accent px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm transition hover:bg-accent/90 ${
                    busy ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  {busy
                    ? t(locale, 'uploading')
                    : imageUrl
                      ? t(locale, 'replaceCover')
                      : t(locale, 'uploadCover')}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => onPickFile(e.target.files?.[0])}
                  />
                </label>
                {imageUrl ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setFraming((v) => !v)}
                      className="max-w-full rounded-full border border-white/40 bg-white/10 px-4 py-2.5 text-center text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
                    >
                      {t(locale, 'adjustCoverFraming')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onRemove()}
                      className="max-w-full rounded-full border border-white/40 bg-white/10 px-4 py-2.5 text-center text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
                    >
                      {t(locale, 'removeCover')}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {framing && imageUrl ? (
          <div
            className="space-y-3 border-t border-black/[0.06] px-4 py-4 sm:px-6"
            id={framingId}
          >
            <p className="text-xs text-muted">{t(locale, 'coverFramingHint')}</p>
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs tracking-wide text-muted uppercase">
                  {t(locale, 'coverFocusHorizontal')}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focusX}
                  onChange={(e) => setFocusX(Number(e.target.value))}
                  className="w-full accent-[var(--accent,#e10600)]"
                  disabled={savingFocus || busy}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs tracking-wide text-muted uppercase">
                  {t(locale, 'coverFocusVertical')}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focusY}
                  onChange={(e) => setFocusY(Number(e.target.value))}
                  className="w-full accent-[var(--accent,#e10600)]"
                  disabled={savingFocus || busy}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingFocus || busy}
                onClick={() => void handleSaveFocus()}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
              >
                {savingFocus
                  ? t(locale, 'uploading')
                  : t(locale, 'saveCoverFraming')}
              </button>
              <button
                type="button"
                disabled={savingFocus}
                onClick={() => {
                  setFocusX(clampCoverFocus(coverFocusX));
                  setFocusY(clampCoverFocus(coverFocusY));
                  setFraming(false);
                }}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.03]"
              >
                {t(locale, 'cancel')}
              </button>
            </div>
          </div>
        ) : (
          <p className="border-t border-black/[0.06] px-4 py-2.5 text-xs text-muted sm:px-6">
            {t(locale, 'photoHint')}
          </p>
        )}
      </section>

      {pendingSrc ? (
        <CoverImageCropDialog
          locale={locale}
          imageSrc={pendingSrc}
          fileName={pendingName}
          open
          onCancel={() => {
            URL.revokeObjectURL(pendingSrc);
            setPendingSrc(null);
            if (fileRef.current) fileRef.current.value = '';
          }}
          onConfirm={handleCropped}
        />
      ) : null}
    </>
  );
}
