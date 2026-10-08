'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import type { ListingQuotaBlock, ListingQuotaPackage } from '@/lib/listing-errors';
import { useDialogFocusTrap } from '@/lib/use-dialog-focus-trap';

type PayHereCheckout = {
  checkoutUrl: string;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: string;
  amount: string;
  hash: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  custom_1: string;
};

function money(value: number) {
  return value.toLocaleString('en-LK', { maximumFractionDigits: 2 });
}

function QuotaIcon({
  kind,
  className = 'h-5 w-5',
}: {
  kind: 'listings' | 'check' | 'arrow' | 'close' | 'lock';
  className?: string;
}) {
  const paths = {
    listings: 'M8 3h10a2 2 0 0 1 2 2v12M16 7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM8 12h6M8 16h4',
    check: 'm5 12 4 4L19 6',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    close: 'm6 6 12 12M6 18 18 6',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3M6 10h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM12 14v3',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={paths[kind]} />
    </svg>
  );
}

function submitPayHereForm(checkout: PayHereCheckout) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkout.checkoutUrl;
  const fields: Record<string, string> = {
    merchant_id: checkout.merchant_id,
    return_url: checkout.return_url,
    cancel_url: checkout.cancel_url,
    notify_url: checkout.notify_url,
    order_id: checkout.order_id,
    items: checkout.items,
    currency: checkout.currency,
    amount: checkout.amount,
    hash: checkout.hash,
    first_name: checkout.first_name,
    last_name: checkout.last_name,
    email: checkout.email,
    phone: checkout.phone,
    address: checkout.address,
    city: checkout.city,
    country: checkout.country,
    custom_1: checkout.custom_1,
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export function ListingQuotaDialog({
  locale,
  block,
  onClose,
}: {
  locale: Locale;
  block: ListingQuotaBlock;
  onClose: () => void;
}) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    block.kind === 'packages' ? (block.packages[0]?.id ?? null) : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useDialogFocusTrap(mounted, dialogId, { initialFocusRef: dialogRef });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function pay(pkg: ListingQuotaPackage) {
    const token = getAccessToken();
    if (!token) {
      setError(t(locale, 'listingQuotaSignInAgain'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const checkout = await apiSend<PayHereCheckout>('/api/v1/listing-packages/checkout', {
        token,
        body: { packageId: pkg.id, locale },
      });
      submitPayHereForm(checkout);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'promotePayFailed'));
      setBusy(false);
    }
  }

  const selected =
    block.kind === 'packages'
      ? block.packages.find((pkg) => pkg.id === selectedId) ?? null
      : null;

  const packages = block.kind === 'packages' ? block.packages : [];
  const bestValue = packages
    .filter((pkg) => pkg.listingCount > 0)
    .reduce<ListingQuotaPackage | null>((best, pkg) => {
      if (!best) return pkg;
      const rate = pkg.priceLkr / pkg.listingCount;
      const bestRate = best.priceLkr / best.listingCount;
      return rate < bestRate || (rate === bestRate && pkg.priceLkr < best.priceLkr)
        ? pkg
        : best;
    }, null);
  const showBestValue =
    bestValue && packages.some((pkg) =>
      pkg.listingCount > 0 &&
      pkg.priceLkr / pkg.listingCount > bestValue.priceLkr / bestValue.listingCount,
    );

  const packageDescription =
    block.kind === 'packages' && block.exhausted !== false
      ? t(locale, 'listingQuotaPackageBody')
      : t(locale, 'listingQuotaPackageBuyBody');

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/55 p-3 backdrop-blur-sm sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        id={dialogId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={busy}
        tabIndex={-1}
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[1.75rem] bg-background shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)] ${
          block.kind === 'apply_dealer' ? 'max-w-lg' : 'max-w-[960px]'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-5 pb-6 sm:px-8 sm:pt-7 sm:pb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/[0.07] text-accent">
                <QuotaIcon kind="listings" />
              </span>
              <p className="text-[10px] font-bold tracking-[0.18em] text-accent uppercase sm:text-[11px]">
                {t(locale, 'listingQuotaPackageEyebrow')}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              aria-label={t(locale, 'listingQuotaClose')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
            >
              <QuotaIcon kind="close" />
            </button>
          </div>

          <h2
            id={titleId}
            className="mt-5 text-2xl leading-tight font-bold tracking-tight text-foreground sm:text-[32px]"
          >
            {block.kind === 'apply_dealer'
              ? t(locale, 'listingQuotaApplyTitle')
              : t(locale, 'listingQuotaPackageTitle')}
          </h2>
          <p id={descriptionId} className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {block.kind === 'apply_dealer'
              ? t(locale, 'listingQuotaApplyBody').replace('{n}', String(block.dealerFreeListings))
              : packageDescription}
          </p>

          {block.kind === 'packages' ? (
            packages.length === 0 ? (
              <div className="mt-7 rounded-2xl border border-dashed border-black/15 bg-surface px-6 py-10 text-center text-sm text-muted">
                {t(locale, 'listingQuotaNone')}
              </div>
            ) : (
              <fieldset className="mt-7 min-w-0">
                <legend className="sr-only">{t(locale, 'listingQuotaPackageTitle')}</legend>
                <div className="grid gap-3 md:grid-cols-3 md:gap-4">
                  {packages.map((pkg) => {
                    const active = pkg.id === selectedId;
                    const value = showBestValue && pkg.id === bestValue?.id;
                    const count = t(locale, 'listingQuotaCount').replace('{n}', money(pkg.listingCount));
                    return (
                      <label
                        key={pkg.id}
                        className={`group relative grid min-w-0 cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-2xl border-2 p-4 transition-colors motion-reduce:transition-none md:flex md:flex-col md:p-6 ${
                          active
                            ? 'border-accent bg-accent/[0.035]'
                            : 'border-black/[0.07] bg-background hover:border-black/20 hover:bg-surface/50'
                        } ${busy ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`${dialogId}-package`}
                          value={pkg.id}
                          aria-label={`${count}, Rs ${money(pkg.priceLkr)}`}
                          checked={active}
                          disabled={busy}
                          onChange={() => {
                            setSelectedId(pkg.id);
                            setError(null);
                          }}
                          className="peer sr-only"
                        />
                        <span className="pointer-events-none absolute inset-[-5px] rounded-[1.2rem] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
                        <div className="col-span-2 flex min-h-7 items-center justify-between gap-2">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? 'bg-accent/10 text-accent' : 'bg-surface text-muted'}`}>
                            <QuotaIcon kind="listings" />
                          </span>
                          {value ? (
                            <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-semibold text-white">
                              {t(locale, 'listingQuotaBestValue')}
                            </span>
                          ) : null}
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? 'border-accent bg-accent text-white' : 'border-black/20'}`}>
                            {active ? <QuotaIcon kind="check" className="h-3 w-3" /> : null}
                          </span>
                        </div>
                        <h3 className="mt-3 min-w-0 text-lg font-bold tracking-tight break-words text-foreground md:mt-5 md:text-xl">{count}</h3>
                        <div className="mt-3 flex flex-wrap items-baseline justify-end gap-x-1.5 md:mt-2 md:justify-start">
                          <span className="text-sm font-medium text-muted">Rs</span>
                          <span className="text-2xl leading-tight font-bold tracking-tight text-foreground tabular-nums md:text-[34px]">
                            {money(pkg.priceLkr)}
                          </span>
                        </div>
                        <p className="col-span-2 mt-1 text-right text-xs text-muted md:text-left">
                          {t(locale, 'listingQuotaPerListing').replace('{n}', money(pkg.priceLkr / pkg.listingCount))}
                        </p>
                        {pkg.description ? <p className="col-span-2 mt-3 text-xs leading-relaxed text-muted">{pkg.description}</p> : null}
                        <div className="mt-5 hidden space-y-2 border-t border-black/[0.07] pt-4 text-xs text-muted md:block">
                          <p className="flex items-start gap-2">
                            <QuotaIcon kind="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                            {t(locale, 'listingQuotaOneTime')}
                          </p>
                          <p className="flex items-start gap-2">
                            <QuotaIcon kind="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                            {t(locale, block.audience === 'parts' ? 'listingQuotaForParts' : 'listingQuotaForBikes')}
                          </p>
                        </div>
                        <span className={`mt-5 hidden min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold md:flex ${active ? 'bg-accent/10 text-accent' : 'bg-surface text-muted group-hover:bg-foreground group-hover:text-white'}`}>
                          {active ? <QuotaIcon kind="check" className="h-4 w-4" /> : null}
                          {t(locale, active ? 'listingQuotaSelected' : 'listingQuotaSelect')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )
          ) : null}
        </div>

        <div className="shrink-0 border-t border-black/[0.07] bg-surface/70 px-5 py-4 sm:px-8 sm:py-5">
          {error ? (
            <p role="alert" className="mb-3 rounded-xl border border-accent/15 bg-accent/[0.05] px-4 py-3 text-sm text-accent">{error}</p>
          ) : null}
          {block.kind === 'apply_dealer' ? (
            <Link
              href={`/${locale}/dealers/apply`}
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition hover:brightness-95"
            >
              {t(locale, 'listingQuotaApplyCta')}
              <QuotaIcon kind="arrow" className="h-4 w-4" />
            </Link>
          ) : selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
                <div className="flex items-center gap-3">
                  <span className="hidden h-11 w-11 items-center justify-center rounded-xl border border-black/[0.07] bg-background text-foreground sm:flex">
                    <QuotaIcon kind="listings" />
                  </span>
                  <div aria-live="polite" aria-atomic="true">
                    <p className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">{t(locale, 'listingQuotaSelectedPackage')}</p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">{t(locale, 'listingQuotaCount').replace('{n}', money(selected.listingCount))}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground sm:ml-auto">Rs {money(selected.priceLkr)}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void pay(selected)}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-4 rounded-xl bg-accent px-6 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-52"
                >
                  {busy ? (
                    <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />{t(locale, 'promotePayRedirecting')}</>
                  ) : (
                    <>{t(locale, 'listingQuotaPay').replace('{n}', money(selected.priceLkr))}<QuotaIcon kind="arrow" className="h-4 w-4" /></>
                  )}
                </button>
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-muted sm:justify-end">
                <QuotaIcon kind="lock" className="h-3.5 w-3.5 shrink-0" />
                {t(locale, 'listingQuotaSecurePayment')}
              </p>
            </>
          ) : (
            <button type="button" onClick={onClose} className="min-h-11 w-full rounded-xl bg-foreground px-5 text-sm font-semibold text-white">
              {t(locale, 'listingQuotaClose')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
