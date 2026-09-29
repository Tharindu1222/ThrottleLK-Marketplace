'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiGet } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { useDialogFocusTrap } from '@/lib/use-dialog-focus-trap';
import {
  ownedDealerHref,
  pickOwnedDealer,
  type OwnedDealer,
  type OwnedDealerKind,
} from '@/lib/owned-dealer';

const CARD_IMAGE: Record<OwnedDealerKind, string> = {
  bike: '/images/dealers/become-bike.png',
  parts: '/images/dealers/become-parts.png',
};

export function BecomeDealerButton({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const titleId = useId();
  const hintId = useId();
  const reactId = useId();
  const dialogId = `become-dealer-${reactId.replace(/:/g, '')}`;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [bike, setBike] = useState<OwnedDealer | null>(null);
  const [parts, setParts] = useState<OwnedDealer | null>(null);
  const [loaded, setLoaded] = useState(false);
  useDialogFocusTrap(Boolean(mounted && open), dialogId, {
    initialFocusRef: closeRef,
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const token = getAccessToken();
    if (!token) {
      setBike(null);
      setParts(null);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    void Promise.all([
      apiGet<OwnedDealer[]>('/api/v1/dealers/mine', { token }),
      apiGet<OwnedDealer[]>('/api/v1/parts-dealers/mine', { token }),
    ])
      .then(([bikes, partsShops]) => {
        if (cancelled) return;
        setBike(pickOwnedDealer(bikes));
        setParts(pickOwnedDealer(partsShops));
      })
      .catch(() => {
        if (cancelled) return;
        setBike(null);
        setParts(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {t(locale, 'becomeDealer')}
      </button>

      {mounted && open
        ? createPortal(
            <div
              id={dialogId}
              className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={hintId}
              tabIndex={-1}
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <div className="w-full max-w-3xl overflow-hidden rounded-t-2xl border border-black/10 bg-white p-5 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)] sm:rounded-2xl sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2
                      id={titleId}
                      className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-foreground sm:text-[1.75rem]"
                    >
                      {t(locale, 'becomeDealerChooseTitle')}
                    </h2>
                    <p
                      id={hintId}
                      className="mt-1.5 text-sm leading-relaxed text-muted"
                    >
                      {t(locale, 'becomeDealerChooseHint')}
                    </p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-accent/35 text-muted transition hover:border-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    aria-label={t(locale, 'close')}
                    onClick={() => setOpen(false)}
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

                <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
                  {loaded ? (
                    <>
                      <DealerChoice
                        locale={locale}
                        kind="bike"
                        dealer={bike}
                      />
                      <DealerChoice
                        locale={locale}
                        kind="parts"
                        dealer={parts}
                      />
                    </>
                  ) : (
                    <>
                      <div className="aspect-[4/3] animate-pulse rounded-2xl bg-black/[0.06]" />
                      <div className="aspect-[4/3] animate-pulse rounded-2xl bg-black/[0.06]" />
                    </>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ArrowCircle({ accent }: { accent: boolean }) {
  return (
    <span
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_10px_24px_-12px_rgba(15,15,15,0.55)] transition group-hover:scale-[1.04] ${
        accent ? 'bg-accent' : 'bg-foreground'
      }`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h12M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}

function DealerChoice({
  locale,
  kind,
  dealer,
}: {
  locale: Locale;
  kind: OwnedDealerKind;
  dealer: OwnedDealer | null;
}) {
  const isParts = kind === 'parts';
  const applyHref = isParts
    ? `/${locale}/parts-dealers/apply`
    : `/${locale}/dealers/apply`;
  const applyHint = isParts
    ? t(locale, 'becomeDealerChoosePartsHint')
    : t(locale, 'becomeDealerChooseBikeHint');
  const badge = isParts
    ? t(locale, 'partsShowroom')
    : t(locale, 'bikeShowroom');
  const href = dealer ? ownedDealerHref(locale, kind, dealer) : applyHref;
  const title = dealer
    ? dealer.name
    : isParts
      ? t(locale, 'becomeDealerChooseParts')
      : t(locale, 'becomeDealerChooseBike');
  const subtitle = dealer
    ? dealer.status === 'active'
      ? t(locale, 'viewShowroom')
      : t(locale, 'dealerPendingHint')
    : applyHint;

  return (
    <Link
      href={href}
      className="group relative isolate block aspect-[4/3] overflow-hidden rounded-2xl bg-white shadow-[0_14px_36px_-18px_rgba(15,15,15,0.35)] ring-1 ring-black/10 transition hover:ring-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CARD_IMAGE[kind]}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.02]"
      />
      <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="max-w-[52%]">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-white uppercase ${
              isParts ? 'bg-accent' : 'bg-foreground'
            }`}
          >
            {badge}
          </span>
          <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl leading-[1.05] tracking-tight break-words text-foreground sm:text-2xl">
            {title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-muted">
            {subtitle}
          </p>
        </div>
        <ArrowCircle accent={isParts} />
      </div>
    </Link>
  );
}
