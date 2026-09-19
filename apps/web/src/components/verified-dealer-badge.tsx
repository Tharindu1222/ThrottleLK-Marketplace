import { t, type Locale } from '@/lib/i18n';

/** Success-green verified mark (not brand accent — follows trust/success UI norms). */
const VERIFIED_GREEN = 'text-emerald-700';
const VERIFIED_PILL =
  'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-700 ring-1 ring-emerald-600/15';

/** Filled check-in-circle mark used as the verified dealer trust signal. */
export function VerifiedDealerIcon({
  className = 'h-3.5 w-3.5',
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={`shrink-0 ${className}`}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path
        d="M6.2 10.2 8.6 12.6 13.8 7.2"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VerifiedDealerBadge({
  locale,
  className = '',
  iconOnly = false,
}: {
  locale: Locale;
  className?: string;
  /** Compact mark for tight spots (listing cards). */
  iconOnly?: boolean;
}) {
  const label = t(locale, 'verified');
  if (iconOnly) {
    return (
      <span
        className={`inline-flex ${VERIFIED_GREEN} ${className}`}
        title={t(locale, 'verifiedDealer')}
      >
        <VerifiedDealerIcon className="h-4 w-4" title={label} />
        <span className="sr-only">{t(locale, 'verifiedDealer')}</span>
      </span>
    );
  }

  return (
    <span className={`${VERIFIED_PILL} ${className}`}>
      <VerifiedDealerIcon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
