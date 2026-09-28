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
