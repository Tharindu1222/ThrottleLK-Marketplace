import { ApiRequestError } from '@/lib/api';
import { t, type Locale } from '@/lib/i18n';

export function listingRequestMessage(
  err: unknown,
  locale: Locale,
  fallbackKey: 'saveListingFailed' | 'submitFailed',
): string {
  if (
    err instanceof ApiRequestError &&
    err.body?.error?.code === 'EMAIL_UNVERIFIED'
  ) {
    return t(locale, 'verifyEmailToList');
  }
  return err instanceof Error ? err.message : t(locale, fallbackKey);
}

export type ListingQuotaPackage = {
  id: string;
  name: string;
  description: string | null;
  priceLkr: number;
  listingCount: number;
  audience: 'bike' | 'parts';
};

export type ListingQuotaBlock =
  | { kind: 'apply_dealer'; dealerFreeListings: number }
  | {
      kind: 'packages';
      audience: 'bike' | 'parts';
      packages: ListingQuotaPackage[];
      exhausted?: boolean;
    };

export function listingQuotaBlock(err: unknown): ListingQuotaBlock | null {
  if (!(err instanceof ApiRequestError)) return null;
  const code = err.body?.error?.code;
  const details = err.body?.error?.details;
  if (code === 'APPLY_DEALER') {
    const raw =
      details && typeof details === 'object'
        ? (details as { dealerFreeListings?: unknown }).dealerFreeListings
        : undefined;
    const count = Number(raw ?? 10);
    return {
      kind: 'apply_dealer',
      dealerFreeListings: Number.isFinite(count) ? count : 10,
    };
  }
  if (code !== 'LISTING_PACKAGE_REQUIRED' || !details || typeof details !== 'object') {
    return null;
  }
  const record = details as {
    audience?: unknown;
    packages?: unknown;
  };
  if (!Array.isArray(record.packages)) return null;
  return {
    kind: 'packages',
    audience: record.audience === 'parts' ? 'parts' : 'bike',
    packages: record.packages as ListingQuotaPackage[],
  };
}

export function apiCodeMessage(err: unknown, locale: Locale): string | null {
  if (!(err instanceof ApiRequestError)) return null;
  const code = err.body?.error?.code;
  if (code === 'EMAIL_UNVERIFIED') return t(locale, 'verifyEmailFirst');
  if (code === 'CAPTCHA_REQUIRED' || code === 'CAPTCHA_FAILED') {
    return t(locale, 'captchaFailed');
  }
  return null;
}
