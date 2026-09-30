'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiSend, ApiRequestError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { useDialogFocusTrap } from '@/lib/use-dialog-focus-trap';
import {
  PromoPackageCard,
  type PromoPackageCardData,
  type PromoTier,
} from '@/components/promo-package-card';

type Package = PromoPackageCardData;

type LivePromotion = {
  id: string;
  tier: PromoTier;
  startsAt: string;
  endsAt: string;
  package: {
    id: string;
    name: string;
    tier: PromoTier;
    durationDays: number;
    priceLkr: number;
  } | null;
  paidAt: string | null;
  approvedAt: string | null;
};

type Status = {
  pending: {
    id: string;
    paymentProvider?: string | null;
    paymentStatus?: string | null;
  } | null;
  live: LivePromotion | null;
  rejected: { reason: string | null } | null;
  canRequest: boolean;
};

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

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function formatDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === 'si' ? 'si-LK' : 'en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const TIER_ORDER: PromoTier[] = ['boost', 'featured', 'premium'];

const TIER_LABEL: Record<
  PromoTier,
  'promoTierBoost' | 'promoTierFeatured' | 'promoTierPremium'
> = {
  boost: 'promoTierBoost',
  featured: 'promoTierFeatured',
  premium: 'promoTierPremium',
};

function isPromoTier(value: string): value is PromoTier {
  return value === 'boost' || value === 'featured' || value === 'premium';
}

function sortPackages(pkgs: Package[]): Package[] {
  return [...pkgs].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(a.tier ?? 'featured');
    const bi = TIER_ORDER.indexOf(b.tier ?? 'featured');
    if (ai !== bi) return ai - bi;
    return a.priceLkr - b.priceLkr;
  });
}

function daysRemaining(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

function remainingLabel(locale: Locale, endsAt: string) {
  const days = daysRemaining(endsAt);
  if (days <= 0) return t(locale, 'promoteDaysLeftToday');
  if (days === 1) return t(locale, 'promoteDaysLeftOne');
  return t(locale, 'promoteDaysLeft').replace('{n}', String(days));
}

function elapsedPercent(startsAt: string, endsAt: string) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const ratio = (Date.now() - start) / (end - start);
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

function PromotionDetails({
  locale,
  live,
}: {
  locale: Locale;
  live: LivePromotion;
}) {
  const tier = isPromoTier(live.package?.tier ?? live.tier)
    ? (live.package?.tier ?? live.tier)
    : 'featured';
  const packageName = live.package?.name?.trim() || t(locale, TIER_LABEL[tier]);
  const duration = live.package
    ? t(locale, 'promoteDays').replace('{n}', String(live.package.durationDays))
    : null;
  const amount =
    live.package != null ? formatLkr(live.package.priceLkr) : null;
  const dates: { label: string; value: string; emphasis?: boolean }[] = [];
  if (live.paidAt) {
    dates.push({
      label: t(locale, 'promoteDetailPaidOn'),
      value: formatDate(live.paidAt, locale),
    });
  }
  if (live.approvedAt) {
    dates.push({
      label: t(locale, 'promoteDetailApprovedOn'),
      value: formatDate(live.approvedAt, locale),
    });
  }
  dates.push(
    {
      label: t(locale, 'promoteDetailStarted'),
      value: formatDate(live.startsAt, locale),
    },
    {
      label: t(locale, 'promoteDetailEnds'),
      value: formatDate(live.endsAt, locale),
      emphasis: true,
    },
  );
  const progress = Math.max(
    daysRemaining(live.endsAt) > 0 ? 8 : 0,
    100 - elapsedPercent(live.startsAt, live.endsAt),
  );

  return (
    <section
      aria-label={t(locale, 'promoteActiveTitle')}
      className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]"
    >
      <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-emerald-800 uppercase">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-emerald-600"
            />
            {t(locale, 'statusActive')}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
            {packageName}
          </h2>
          {duration ? (
            <p className="mt-1 text-sm text-muted">
              {t(locale, 'promoteDetailDuration')} · {duration}
            </p>
          ) : null}
        </div>
        {amount ? (
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
              {t(locale, 'promoteDetailAmount')}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground">
              {amount}
            </p>
          </div>
        ) : null}
      </div>

      <div className="px-5 pb-5 sm:px-6">
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span>{formatDate(live.startsAt, locale)}</span>
          <span className="font-medium text-foreground">
            {remainingLabel(locale, live.endsAt)}
          </span>
          <span>{formatDate(live.endsAt, locale)}</span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-1 border-t border-black/[0.06] sm:grid-cols-2">
        {dates.map((row) => (
          <div
            key={row.label}
            className={`min-w-0 border-b border-black/[0.06] px-5 py-4 sm:px-6 sm:odd:border-r ${
              row.emphasis ? 'bg-accent/[0.04]' : ''
            }`}
          >
            <dt className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              {row.label}
            </dt>
            <dd
              className={`mt-1 text-sm ${
                row.emphasis
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-foreground'
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function submitPayHereForm(checkout: PayHereCheckout) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkout.checkoutUrl;
  form.style.display = 'none';

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

export function PromoteListingForm({
  locale,
  kind,
  listingId,
  partListingId,
  title,
  backHref,
}: {
  locale: Locale;
  kind: 'bike' | 'part';
  listingId?: string;
  partListingId?: string;
  title: string;
  backHref: string;
}) {
  const searchParams = useSearchParams();
  const paidReturn = searchParams.get('paid') === '1';
  const cancelledReturn = searchParams.get('cancelled') === '1';

  const [packages, setPackages] = useState<Package[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [heading, setHeading] = useState(title);
  const [waitingPayment, setWaitingPayment] = useState(paidReturn);
  const [cancelledBanner, setCancelledBanner] = useState(cancelledReturn);
  const [approvedOpen, setApprovedOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const awaitingRef = useRef(paidReturn);
  const payDialogId = `promote-pay-${useId().replace(/:/g, '')}`;
  const approvedDialogId = `promote-approved-${useId().replace(/:/g, '')}`;
  useDialogFocusTrap(payOpen, payDialogId);
  useDialogFocusTrap(approvedOpen, approvedDialogId);

  const selected = packages.find((pkg) => pkg.id === selectedId) ?? null;

  function openPayModal(packageId: string) {
    setSelectedId(packageId);
    setError(null);
    setPayOpen(true);
  }

  function closePayModal() {
    if (busy) return;
    setPayOpen(false);
    setSelectedId(null);
  }

  function celebrationKey() {
    return `promo-approved:${listingId ?? partListingId ?? ''}`;
  }

  function applyStatus(st: Status) {
    setStatus(st);
    const waitingDecision =
      Boolean(st.pending) &&
      !st.live &&
      st.pending?.paymentStatus !== 'failed';
    if (!st.live && (paidReturn || waitingDecision)) awaitingRef.current = true;
    if (!st.live) return st;
    setWaitingPayment(false);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (awaitingRef.current) {
      awaitingRef.current = false;
      let seen = false;
      try {
        seen = sessionStorage.getItem(celebrationKey()) === '1';
      } catch {
        seen = false;
      }
      if (!seen) setApprovedOpen(true);
    }
    return st;
  }

  function closeApproved() {
    try {
      sessionStorage.setItem(celebrationKey(), '1');
    } catch {
      /* ignore */
    }
    setApprovedOpen(false);
  }

  async function refreshStatus(token: string) {
    const st = await apiGet<Status>('/api/v1/promotions/status', {
      token,
      searchParams: { listingId, partListingId },
    });
    return applyStatus(st);
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const detail =
      kind === 'bike' && listingId
        ? apiGet<{ title: string }>(`/api/v1/listings/${listingId}`, { token })
        : partListingId
          ? apiGet<{ title: string }>(`/api/v1/part-listings/${partListingId}`, {
              token,
            })
          : Promise.resolve({ title });
    void Promise.all([
      apiGet<Package[]>('/api/v1/promotions/packages', {
        searchParams: { kind },
      }),
      apiGet<Status>('/api/v1/promotions/status', {
        token,
        searchParams: { listingId, partListingId },
      }),
      detail,
    ])
      .then(([pkgs, st, row]) => {
        setPackages(sortPackages(pkgs));
        if (row.title) setHeading(row.title);
        applyStatus(st);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t(locale, 'uploadFailed')),
      );
  }, [kind, listingId, partListingId, locale, title]);

  const bankReview =
    Boolean(status?.pending) &&
    !status?.live &&
    status?.pending?.paymentStatus !== 'failed';

  useEffect(() => {
    if (status?.live || (!waitingPayment && !bankReview)) return;
    const token = getAccessToken();
    if (!token) return;
    pollRef.current = setInterval(() => {
      void refreshStatus(token).catch(() => undefined);
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll while waiting
  }, [waitingPayment, bankReview, status?.live, listingId, partListingId]);

  async function payWithPayHere() {
    const token = getAccessToken();
    if (!token || !selected) return;
    setBusy(true);
    setError(null);
    setCancelledBanner(false);
    try {
      const checkout = await apiSend<PayHereCheckout>(
        '/api/v1/promotions/checkout',
        {
          method: 'POST',
          token,
          body: {
            packageId: selected.id,
            locale,
            ...(listingId ? { listingId } : {}),
            ...(partListingId ? { partListingId } : {}),
          },
        },
      );
      submitPayHereForm(checkout);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : t(locale, 'promotePayFailed'),
      );
      setBusy(false);
    }
  }

  const awaitingApproval =
    Boolean(status?.pending) &&
    !status?.live &&
    !waitingPayment &&
    !cancelledBanner &&
    status?.pending?.paymentStatus !== 'failed';

  const showCheckout =
    !status?.live &&
    !waitingPayment &&
    !awaitingApproval &&
    (status?.canRequest || cancelledBanner);

  const showBankPending = awaitingApproval;

  return (
    <div className="min-w-0 space-y-8">
      <div>
        <Link
          href={backHref}
          className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          {t(locale, 'backToMyListings')}
        </Link>
        <p className="mt-4 text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          {t(locale, 'promoteEyebrow')}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {status?.live || waitingPayment || bankReview
            ? heading || t(locale, 'promoteTitle')
            : t(locale, 'promoteTitle')}
        </h1>
        {status?.live ? (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {t(locale, 'promoteActiveHint')}
          </p>
        ) : waitingPayment || bankReview ? null : (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {t(locale, 'promoteSubtitle')}
          </p>
        )}
        {status?.live || waitingPayment || bankReview ? null : (
          <p className="mt-1 text-sm font-medium text-foreground">{heading}</p>
        )}
      </div>

      {status?.live ? (
        <PromotionDetails locale={locale} live={status.live} />
      ) : null}

      {waitingPayment && !status?.live ? (
        <section className="w-full max-w-3xl rounded-2xl bg-white p-5 ring-1 ring-black/[0.06] sm:p-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-amber-800 uppercase">
            {t(locale, 'promoteStepPayEyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            {t(locale, 'promoteWaitingTitle')}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {t(locale, 'promotePayWaiting')}
          </p>
        </section>
      ) : null}

      {cancelledBanner && !status?.live ? (
        <p className="max-w-xl rounded-md border border-black/10 bg-white px-4 py-3 text-sm">
          {t(locale, 'promotePayCancelled')}
        </p>
      ) : null}

      {showBankPending ? (
        <section className="w-full max-w-3xl rounded-2xl bg-white p-5 ring-1 ring-black/[0.06] sm:p-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-amber-800 uppercase">
            {t(locale, 'promoteEyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            {t(locale, 'promoteWaitApproval')}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {t(locale, 'promotePendingBody')}
          </p>
        </section>
      ) : null}

      {status?.rejected && !status.pending && !status.live ? (
        <p className="max-w-xl rounded-md border border-black/10 bg-white px-4 py-3 text-sm text-red-700">
          {t(locale, 'promoteRejected').replace(
            '{reason}',
            status.rejected.reason ?? '',
          )}
        </p>
      ) : null}

      {error && !payOpen ? (
        <p className="max-w-xl text-sm text-red-600">{error}</p>
      ) : null}

      {showCheckout ? (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/[0.06] sm:p-8">
          <section>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                {t(locale, 'promoteStepPackageEyebrow')}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {t(locale, 'promoteStepPackage')}
              </h2>
            </div>
            {packages.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                {t(locale, 'promoteNoPackages')}
              </p>
            ) : (
              <ul className="mt-6 grid min-w-0 list-none grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch md:gap-5 md:pt-3">
                {packages.map((pkg) => (
                  <li key={pkg.id} className="h-full">
                    <PromoPackageCard
                      locale={locale}
                      pkg={pkg}
                      selected={payOpen && selectedId === pkg.id}
                      onSelect={() => openPayModal(pkg.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {approvedOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-4">
          <div
            id={approvedDialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${approvedDialogId}-title`}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.08] sm:p-6"
          >
            <p className="text-[11px] font-semibold tracking-[0.16em] text-emerald-800 uppercase">
              {t(locale, 'statusActive')}
            </p>
            <h2
              id={`${approvedDialogId}-title`}
              className="mt-2 text-xl font-bold tracking-tight text-foreground"
            >
              {t(locale, 'promoteApprovedTitle')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t(locale, 'promoteApprovedBody')}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeApproved}
                className="inline-flex justify-center rounded-md bg-[#0a0a0a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent"
              >
                {t(locale, 'promoteApprovedOk')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {payOpen && selected ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePayModal();
          }}
        >
          <div
            id={payDialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${payDialogId}-title`}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.08] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                  {t(locale, 'promoteStepPayEyebrow')}
                </p>
                <h2
                  id={`${payDialogId}-title`}
                  className="mt-2 text-xl font-bold tracking-tight text-foreground"
                >
                  {t(locale, 'promoteStepPay')}
                </h2>
                <p className="mt-1 text-sm text-muted">{heading}</p>
              </div>
              <button
                type="button"
                onClick={closePayModal}
                disabled={busy}
                className="rounded-md px-2 py-1 text-sm text-muted transition hover:bg-black/[0.04] hover:text-foreground disabled:opacity-50"
              >
                {t(locale, 'close')}
              </button>
            </div>

            <dl className="mt-5 min-w-0 space-y-2 rounded-2xl bg-surface/60 px-4 py-3 text-sm ring-1 ring-black/[0.06]">
              <div className="flex min-w-0 justify-between gap-4">
                <dt className="text-muted">{t(locale, 'promotePayAmount')}</dt>
                <dd className="font-semibold">{formatLkr(selected.priceLkr)}</dd>
              </div>
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                <dt className="shrink-0 text-muted">
                  {t(locale, 'promoteStepPackageEyebrow')}
                </dt>
                <dd className="min-w-0 break-words sm:text-right">
                  {selected.name} ·{' '}
                  {t(locale, 'promoteDays').replace(
                    '{n}',
                    String(selected.durationDays),
                  )}
                </dd>
              </div>
            </dl>

            {error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closePayModal}
                disabled={busy}
                className="inline-flex justify-center rounded-md px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-black/[0.04] hover:text-foreground disabled:opacity-50"
              >
                {t(locale, 'cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void payWithPayHere()}
                className="inline-flex justify-center rounded-md bg-[#0a0a0a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent disabled:opacity-50"
              >
                {busy
                  ? t(locale, 'promotePayRedirecting')
                  : t(locale, 'promotePayCta')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
