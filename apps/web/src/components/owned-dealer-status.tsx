import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';
import {
  ownedDealerHref,
  ownedDealerManageHref,
  type OwnedDealer,
  type OwnedDealerKind,
} from '@/lib/owned-dealer';

const cardClass =
  'overflow-hidden border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_12px_32px_-18px_rgba(0,0,0,0.22)]';

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function OwnedDealerStatus({
  locale,
  kind,
  dealer,
  ok,
}: {
  locale: Locale;
  kind: OwnedDealerKind;
  dealer: OwnedDealer;
  ok?: string | null;
}) {
  const pending = dealer.status !== 'active';
  return (
    <div className={`${cardClass} p-6 sm:p-8`}>
      <p className="text-[11px] tracking-[0.14em] text-muted uppercase">
        {t(locale, kind === 'parts' ? 'yourPartsDealer' : 'yourBikeDealer')}
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
        {dealer.name}
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex border px-2.5 py-1 text-[11px] tracking-wide uppercase ${
            pending
              ? 'border-amber-600/20 bg-amber-50 text-amber-900'
              : 'border-emerald-600/20 bg-emerald-50 text-emerald-800'
          }`}
        >
          {statusLabel(dealer.status)}
        </span>
      </div>
      {pending ? (
        <p className="mt-4 text-sm text-muted">
          {t(locale, 'dealerPendingHint')}
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={ownedDealerHref(locale, kind, dealer)}
            className="inline-flex items-center justify-center rounded-full border border-black/15 px-5 py-2.5 text-sm text-foreground transition hover:border-accent hover:text-accent"
          >
            {t(locale, 'viewShowroom')}
          </Link>
          <Link
            href={ownedDealerManageHref(locale, kind, dealer)}
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm text-white transition hover:brightness-110"
          >
            {t(locale, 'manageShowroom')}
          </Link>
        </div>
      )}
      {ok ? <p className="mt-4 text-sm text-foreground">{ok}</p> : null}
    </div>
  );
}
