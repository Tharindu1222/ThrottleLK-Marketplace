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

export function apiCodeMessage(err: unknown, locale: Locale): string | null {
  if (!(err instanceof ApiRequestError)) return null;
  const code = err.body?.error?.code;
  if (code === 'EMAIL_UNVERIFIED') return t(locale, 'verifyEmailFirst');
  if (code === 'CAPTCHA_REQUIRED' || code === 'CAPTCHA_FAILED') {
    return t(locale, 'captchaFailed');
  }
  return null;
}
