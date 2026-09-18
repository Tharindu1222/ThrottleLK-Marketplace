'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { t, type Locale } from '@/lib/i18n';

export function ListingDescription({
  locale,
  text,
}: {
  locale: Locale;
  text: string;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [expanded, setExpanded] = useState(false);
  const [needsMore, setNeedsMore] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    function measure() {
      if (!previewRef.current) return;
      setNeedsMore(
        previewRef.current.scrollHeight > previewRef.current.clientHeight + 1,
      );
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  useEffect(() => {
    if (!expanded) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  return (
    <>
      <div className="space-y-2">
        <div
          ref={previewRef}
          className="max-w-2xl whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90 line-clamp-5"
        >
          {text}
        </div>
        {needsMore ? (
          <button
            type="button"
            className="text-sm font-medium text-accent transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
            onClick={() => setExpanded(true)}
            aria-haspopup="dialog"
          >
            {t(locale, 'seeMore')}
          </button>
        ) : null}
      </div>

      {mounted && expanded
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => {
                if (e.target === e.currentTarget) setExpanded(false);
              }}
            >
              <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-black/10 bg-white shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)] sm:max-h-[80vh] sm:rounded-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-black/10 px-5 py-4">
                  <h2
                    id={titleId}
                    className="font-[family-name:var(--font-display)] text-xl tracking-wide text-foreground"
                  >
                    {t(locale, 'description')}
                  </h2>
                  <button
                    ref={closeRef}
                    type="button"
                    className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-muted transition hover:border-black/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    aria-label={t(locale, 'close')}
                    onClick={() => setExpanded(false)}
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto px-5 py-4">
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90">
                    {text}
                  </p>
                </div>
                <div className="border-t border-black/10 px-5 py-3 sm:hidden">
                  <button
                    type="button"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:brightness-110"
                    onClick={() => setExpanded(false)}
                  >
                    {t(locale, 'close')}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
