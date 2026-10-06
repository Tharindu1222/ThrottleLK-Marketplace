'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import type { ListingQuotaBlock, ListingQuotaPackage } from '@/lib/listing-errors';

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
  return value.toLocaleString('en-LK');
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
  const [selectedId, setSelectedId] = useState<string | null>(
    block.kind === 'packages' ? (block.packages[0]?.id ?? null) : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(pkg: ListingQuotaPackage) {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const checkout = await apiSend<PayHereCheckout>('/api/v1/listing-packages/checkout', {
        token,
        body: { packageId: pkg.id, locale },
      });
      submitPayHereForm(checkout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setBusy(false);
    }
  }

  const selected =
    block.kind === 'packages'
      ? block.packages.find((pkg) => pkg.id === selectedId) ?? null
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-quota-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
      >
        <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          {t(locale, 'listingQuotaEyebrow')}
        </p>
        <h2 id="listing-quota-title" className="mt-2 text-xl font-bold text-foreground">
          {block.kind === 'apply_dealer'
            ? t(locale, 'listingQuotaApplyTitle')
            : t(locale, 'listingQuotaPackageTitle')}
        </h2>

        {block.kind === 'apply_dealer' ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t(locale, 'listingQuotaApplyBody').replace(
              '{n}',
              String(block.dealerFreeListings),
            )}
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            <p className="text-sm leading-relaxed text-muted">
              {block.exhausted === false
                ? t(locale, 'listingQuotaPackageBuyBody')
                : t(locale, 'listingQuotaPackageBody')}
            </p>
            {block.packages.length === 0 ? (
              <p className="text-sm text-muted">{t(locale, 'listingQuotaNone')}</p>
            ) : (
              block.packages.map((pkg) => {
                const active = pkg.id === selectedId;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedId(pkg.id)}
                    className={`rounded-2xl p-4 text-left ring-1 ${
                      active ? 'ring-accent' : 'ring-black/[0.08]'
                    }`}
                  >
                    <p className="font-semibold text-foreground">
                      {t(locale, 'listingQuotaCount').replace(
                        '{n}',
                        String(pkg.listingCount),
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted">Rs {money(pkg.priceLkr)}</p>
                  </button>
                );
              })
            )}
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {block.kind === 'apply_dealer' ? (
            <Link
              href={`/${locale}/dealers/apply`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white"
            >
              {t(locale, 'listingQuotaApplyCta')}
            </Link>
          ) : selected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void pay(selected)}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t(locale, 'listingQuotaPay').replace('{n}', money(selected.priceLkr))}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-muted"
          >
            {t(locale, 'listingQuotaClose')}
          </button>
        </div>
      </div>
    </div>
  );
}
