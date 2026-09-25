'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet, apiUpload, ApiRequestError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { whatsappHref } from '@/lib/whatsapp-href';

type Package = {
  id: string;
  name: string;
  durationDays: number;
  priceLkr: number;
};

type PaymentInfo = {
  bank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string | null;
  } | null;
  whatsapp: string | null;
};

type Status = {
  pending: { id: string } | null;
  live: { endsAt: string } | null;
  rejected: { reason: string | null } | null;
  canRequest: boolean;
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
  const [packages, setPackages] = useState<Package[]>([]);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [heading, setHeading] = useState(title);

  const selected = packages.find((pkg) => pkg.id === selectedId) ?? null;

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
      apiGet<PaymentInfo>('/api/v1/promotions/payment-info'),
      apiGet<Status>('/api/v1/promotions/status', {
        token,
        searchParams: {
          listingId,
          partListingId,
        },
      }),
      detail,
    ])
      .then(([pkgs, info, st, row]) => {
        setPackages(pkgs);
        setPayment(info);
        setStatus(st);
        if (row.title) setHeading(row.title);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t(locale, 'uploadFailed')),
      );
  }, [kind, listingId, partListingId, locale, title]);

  async function submit() {
    const token = getAccessToken();
    if (!token || !selected || !file) return;
    setBusy(true);
    setError(null);
    try {
      await apiUpload('/api/v1/promotions/requests', file, token, {
        packageId: selected.id,
        ...(listingId ? { listingId } : {}),
        ...(partListingId ? { partListingId } : {}),
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : t(locale, 'uploadFailed'),
      );
    } finally {
      setBusy(false);
    }
  }

  const waText = selected
    ? `${heading} — ${selected.name} (${selected.durationDays} days) ${formatLkr(selected.priceLkr)}`
    : heading;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Link
          href={backHref}
          className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          {t(locale, 'backToMyListings')}
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground">
          {t(locale, 'promoteTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted">{t(locale, 'promoteSubtitle')}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{heading}</p>
      </div>

      {status?.live ? (
        <p className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm">
          {t(locale, 'promoteLiveUntil').replace(
            '{date}',
            formatDate(status.live.endsAt, locale),
          )}
        </p>
      ) : null}
      {status?.pending ? (
        <p className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm">
          {t(locale, 'promotePending')}
        </p>
      ) : null}
      {status?.rejected && !status.pending && !status.live ? (
        <p className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm text-red-700">
          {t(locale, 'promoteRejected').replace(
            '{reason}',
            status.rejected.reason ?? '',
          )}
        </p>
      ) : null}

      {done ? (
        <p className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm">
          {t(locale, 'promoteSubmitted')}
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!done && status?.canRequest ? (
        <>
          <section>
            <h2 className="text-sm font-semibold text-foreground">
              {t(locale, 'promoteStepPackage')}
            </h2>
            {packages.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                {t(locale, 'promoteNoPackages')}
              </p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {packages.map((pkg) => (
                  <li key={pkg.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(pkg.id)}
                      className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-sm ${
                        selectedId === pkg.id
                          ? 'border-accent bg-accent/5'
                          : 'border-black/10 bg-white hover:border-black/20'
                      }`}
                    >
                      <span>
                        <span className="font-medium">{pkg.name}</span>
                        <span className="ml-2 text-muted">
                          {t(locale, 'promoteDays').replace(
                            '{n}',
                            String(pkg.durationDays),
                          )}
                        </span>
                      </span>
                      <span className="font-semibold">
                        {formatLkr(pkg.priceLkr)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selected ? (
            <section>
              <h2 className="text-sm font-semibold text-foreground">
                {t(locale, 'promoteStepPay')}
              </h2>
              {!payment?.bank ? (
                <p className="mt-3 text-sm text-muted">
                  {payment?.whatsapp
                    ? t(locale, 'promoteContactWhatsapp')
                    : t(locale, 'promoteUnavailable')}
                </p>
              ) : (
                <dl className="mt-3 space-y-1 rounded-md border border-black/10 bg-white px-4 py-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{t(locale, 'promotePayAmount')}</dt>
                    <dd className="font-semibold">{formatLkr(selected.priceLkr)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{t(locale, 'promoteBankName')}</dt>
                    <dd>{payment.bank.bankName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{t(locale, 'promoteAccountName')}</dt>
                    <dd>{payment.bank.accountName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{t(locale, 'promoteAccountNumber')}</dt>
                    <dd className="font-mono">{payment.bank.accountNumber}</dd>
                  </div>
                  {payment.bank.branch ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">{t(locale, 'promoteBranch')}</dt>
                      <dd>{payment.bank.branch}</dd>
                    </div>
                  ) : null}
                </dl>
              )}
              {payment?.whatsapp ? (
                <a
                  href={whatsappHref(payment.whatsapp, waText)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  {t(locale, 'promoteWhatsapp')}
                </a>
              ) : null}
            </section>
          ) : null}

          {selected && payment?.bank ? (
            <section>
              <h2 className="text-sm font-semibold text-foreground">
                {t(locale, 'promoteStepSlip')}
              </h2>
              <label className="mt-3 block text-sm text-muted" htmlFor="promo-slip">
                {t(locale, 'promoteSlipLabel')}
              </label>
              <input
                id="promo-slip"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="mt-1 block w-full text-sm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-muted">
                {t(locale, 'promoteSlipHint')}
              </p>
              <button
                type="button"
                disabled={busy || !file}
                onClick={() => void submit()}
                className="mt-4 inline-flex rounded-md bg-[#0a0a0a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? t(locale, 'uploading') : t(locale, 'promoteSubmit')}
              </button>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
