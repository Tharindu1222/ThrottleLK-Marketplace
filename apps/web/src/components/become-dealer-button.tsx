'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiGet } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import {
  ownedDealerHref,
  pickOwnedDealer,
  type OwnedDealer,
  type OwnedDealerKind,
} from '@/lib/owned-dealer';

export function BecomeDealerButton({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const titleId = useId();
  const hintId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [bike, setBike] = useState<OwnedDealer | null>(null);
  const [parts, setParts] = useState<OwnedDealer | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
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
              className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={hintId}
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <div className="w-full max-w-md overflow-hidden rounded-t-2xl border border-black/10 bg-white p-6 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)] sm:rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <h2
                    id={titleId}
                    className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground"
                  >
                    {t(locale, 'becomeDealerChooseTitle')}
                  </h2>
                  <button
                    ref={closeRef}
                    type="button"
                    className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-muted transition hover:border-black/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
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
                <p id={hintId} className="mt-2 text-sm leading-relaxed text-muted">
                  {t(locale, 'becomeDealerChooseHint')}
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
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
                      <div className="h-[4.5rem] animate-pulse rounded-xl bg-black/[0.06]" />
                      <div className="h-[4.5rem] animate-pulse rounded-xl bg-black/[0.06]" />
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

function ShowroomKindBadge({
  locale,
  kind,
}: {
  locale: Locale;
  kind: OwnedDealerKind;
}) {
  const isParts = kind === 'parts';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
        isParts ? 'bg-accent text-white' : 'bg-foreground text-white'
      }`}
    >
      {isParts ? t(locale, 'partsShowroom') : t(locale, 'bikeShowroom')}
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
  const applyHref =
    kind === 'parts'
      ? `/${locale}/parts-dealers/apply`
      : `/${locale}/dealers/apply`;
  const applyHint =
    kind === 'parts'
      ? t(locale, 'becomeDealerChoosePartsHint')
      : t(locale, 'becomeDealerChooseBikeHint');

  if (dealer) {
    return (
      <Link
        href={ownedDealerHref(locale, kind, dealer)}
        className="rounded-xl border border-black/10 px-4 py-3.5 text-left transition hover:border-accent/40 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <ShowroomKindBadge locale={locale} kind={kind} />
        <span className="mt-2 block font-semibold text-foreground">
          {dealer.name}
        </span>
        <span className="mt-1 block text-sm text-muted">
          {dealer.status === 'active'
            ? t(locale, 'viewShowroom')
            : t(locale, 'dealerPendingHint')}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={applyHref}
      className="rounded-xl border border-black/10 px-4 py-3.5 text-left transition hover:border-accent/40 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <ShowroomKindBadge locale={locale} kind={kind} />
      <span className="mt-2 block text-sm text-muted">{applyHint}</span>
    </Link>
  );
}
