'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { BRAND_LOGO_SRC } from '@/components/brand-logo';
import { t, type Locale } from '@/lib/i18n';

type GalleryImage = {
  id: string;
  imageUrl: string;
  isCover: boolean;
};

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <path
        d={dir === 'left' ? 'M15 6L9 12l6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <path
        d="M8 3H4v4M16 3h4v4M8 21H4v-4M16 21h4v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const controlBtn =
  'flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export function ListingGallery({
  locale,
  title,
  coverImageUrl,
  images = [],
}: {
  locale: Locale;
  title: string;
  coverImageUrl?: string | null;
  images?: GalleryImage[];
}) {
  const ordered = useMemo(() => {
    const list = [...images];
    list.sort((a, b) => {
      if (a.isCover !== b.isCover) return a.isCover ? -1 : 1;
      return 0;
    });
    return list;
  }, [images]);

  const urls = useMemo(() => {
    if (ordered.length > 0) return ordered.map((image) => image.imageUrl);
    if (coverImageUrl) return [coverImageUrl];
    return [] as string[];
  }, [ordered, coverImageUrl]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveIndex((prev) => {
      if (urls.length === 0) return 0;
      return Math.min(prev, urls.length - 1);
    });
  }, [urls.length]);

  const current = urls[activeIndex] ?? null;
  const multi = urls.length > 1;

  const goPrev = useCallback(() => {
    if (urls.length < 2) return;
    setActiveIndex((i) => (i - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goNext = useCallback(() => {
    if (urls.length < 2) return;
    setActiveIndex((i) => (i + 1) % urls.length);
  }, [urls.length]);

  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [lightboxOpen, closeLightbox, goPrev, goNext]);

  function onCoverKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  }

  if (!current) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 border border-black/10 bg-[linear-gradient(160deg,#f0f0f0_0%,#fafafa_50%,#ececec_100%)] shadow-[0_1px_0_rgba(0,0,0,0.06),0_12px_32px_-20px_rgba(0,0,0,0.25)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_LOGO_SRC}
          alt=""
          className="h-12 w-auto max-w-[40%] object-contain opacity-80 brightness-0"
        />
        <span className="text-sm text-muted">{t(locale, 'photoComingSoon')}</span>
      </div>
    );
  }

  const counterLabel = t(locale, 'galleryCounter')
    .replace('{current}', String(activeIndex + 1))
    .replace('{total}', String(urls.length));

  const lightbox =
    mounted && lightboxOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex flex-col bg-black/90"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={closeLightbox}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6">
              <p className="text-sm tabular-nums text-white/80">{counterLabel}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeLightbox();
                }}
                aria-label={t(locale, 'galleryClose')}
                className={controlBtn}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 pb-8 sm:px-16">
              {multi ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  aria-label={t(locale, 'galleryPrev')}
                  className={`absolute left-3 top-1/2 z-10 -translate-y-1/2 sm:left-5 ${controlBtn}`}
                >
                  <ChevronIcon dir="left" />
                </button>
              ) : null}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current}
                alt={title}
                onClick={(e) => e.stopPropagation()}
                className="max-h-full max-w-full object-contain"
              />

              {multi ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  aria-label={t(locale, 'galleryNext')}
                  className={`absolute right-3 top-1/2 z-10 -translate-y-1/2 sm:right-5 ${controlBtn}`}
                >
                  <ChevronIcon dir="right" />
                </button>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="space-y-3">
      <div
        className="group relative overflow-hidden border border-black/10 bg-zinc-100 shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_40px_-24px_rgba(0,0,0,0.35)] outline-none"
        tabIndex={multi ? 0 : undefined}
        onKeyDown={multi ? onCoverKeyDown : undefined}
      >
        <button
          type="button"
          onClick={openLightbox}
          className="block w-full cursor-zoom-in"
          aria-label={t(locale, 'galleryExpand')}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={title}
            className="aspect-[16/10] w-full object-contain"
          />
        </button>

        {multi ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label={t(locale, 'galleryPrev')}
              className={`absolute left-3 top-1/2 z-10 -translate-y-1/2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${controlBtn}`}
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label={t(locale, 'galleryNext')}
              className={`absolute right-3 top-1/2 z-10 -translate-y-1/2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${controlBtn}`}
            >
              <ChevronIcon dir="right" />
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={openLightbox}
          aria-label={t(locale, 'galleryExpand')}
          className={`absolute top-3 right-3 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${controlBtn}`}
        >
          <ExpandIcon />
        </button>
      </div>

      {ordered.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {ordered.map((image, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Photo ${index + 1} of ${ordered.length}`}
                aria-pressed={selected}
                className={`overflow-hidden border bg-surface transition ${
                  selected
                    ? 'border-accent ring-2 ring-accent/30'
                    : 'border-black/10 hover:border-accent/50'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-16 w-20 object-cover sm:h-[4.5rem] sm:w-24"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {lightbox}
    </div>
  );
}
