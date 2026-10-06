import { NextRequest, NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/safe-next';
import {
  appUrl,
  clearOauthCookieHeader,
  decodeOauthCookie,
  type GoogleOauthState,
  internalApiBase,
  localeFromNextPath,
  safeEqual,
} from '@/lib/google-oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const session = decodeOauthCookie(
    request.cookies.get('tlk_google_oauth')?.value,
  );
  const locale = failureLocale(session);

  try {
    const googleError = url.searchParams.get('error');
    if (googleError) {
      return fail(
        locale,
        googleError === 'access_denied' ? 'google_denied' : 'google_failed',
      );
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (
      !session ||
      !code ||
      !state ||
      !safeEqual(session.state, state)
    ) {
      return fail(locale, 'google_failed');
    }

    const apiResponse = await fetch(
      `${internalApiBase()}/api/v1/auth/google/callback`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code,
          state,
          nonce: session.nonce,
          codeVerifier: session.codeVerifier,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!apiResponse.ok) {
      await apiResponse.text().catch(() => undefined);
      return fail(locale, 'google_failed');
    }

    const destLocale = localeFromNextPath(session.next) ?? session.locale ?? 'en';
    const dest = safeNextPath(
      session.next,
      destLocale,
      `/${destLocale}/bikes`,
    );
    const response = NextResponse.redirect(appUrl(dest), 302);
    for (const cookie of apiResponse.headers.getSetCookie()) {
      response.headers.append('set-cookie', cookie);
    }
    response.headers.append('set-cookie', clearOauthCookieHeader());
    sealRedirect(response);
    return response;
  } catch {
    return fail(locale, 'google_failed');
  }
}

function failureLocale(session: GoogleOauthState | null): 'en' | 'si' {
  if (session?.locale === 'si' || session?.locale === 'en') return session.locale;
  return 'en';
}

function fail(
  locale: 'en' | 'si',
  error: 'google_denied' | 'google_failed',
) {
  const response = NextResponse.redirect(
    appUrl(`/${locale}/login?error=${error}`),
    302,
  );
  response.headers.append('set-cookie', clearOauthCookieHeader());
  sealRedirect(response);
  return response;
}

function sealRedirect(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
}
