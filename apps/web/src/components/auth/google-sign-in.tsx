'use client';

import { authSecondaryBtnClass } from '@/components/auth/auth-shell';
import { t, type Locale } from '@/lib/i18n';

export function googleAuthErrorMessage(
  locale: Locale,
  code: string | null,
): string | null {
  if (code === 'google_denied') return t(locale, 'googleSignInDenied');
  if (code === 'google_failed') return t(locale, 'googleSignInFailed');
  if (code === 'google_unavailable') return t(locale, 'googleSignInUnavailable');
  return null;
}

export function GoogleSignInButton({
  locale,
  next,
}: {
  locale: Locale;
  next?: string | null;
}) {
  const params = new URLSearchParams();
  params.set('locale', locale);
  if (next) params.set('next', next);
  const href = `/auth/google?${params.toString()}`;

  return (
    <div className="grid gap-3">
      <a href={href} className={authSecondaryBtnClass}>
        {t(locale, 'continueWithGoogle')}
      </a>
      <div className="flex items-center gap-3 text-xs tracking-[0.14em] text-muted uppercase">
        <span aria-hidden className="h-px flex-1 bg-black/10" />
        <span>{t(locale, 'orDivider')}</span>
        <span aria-hidden className="h-px flex-1 bg-black/10" />
      </div>
    </div>
  );
}
