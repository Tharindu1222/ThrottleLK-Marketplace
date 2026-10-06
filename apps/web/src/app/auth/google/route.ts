import { NextRequest, NextResponse } from 'next/server';
import {
  appUrl,
  createOauthSecrets,
  encodeOauthCookie,
  GOOGLE_OAUTH_COOKIE,
  googleRedirectUri,
  parseLocale,
} from '@/lib/google-oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const locale = parseLocale(url.searchParams.get('locale'));
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.redirect(
      appUrl(`/${locale}/login?error=google_unavailable`),
      302,
    );
  }

  const { state, nonce, codeVerifier, codeChallenge } = createOauthSecrets();
  const next = optionalNext(url.searchParams.get('next'));
  const redirectUri = googleRedirectUri();
  const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  google.searchParams.set('client_id', clientId);
  google.searchParams.set('redirect_uri', redirectUri);
  google.searchParams.set('response_type', 'code');
  google.searchParams.set('scope', 'openid email profile');
  google.searchParams.set('state', state);
  google.searchParams.set('nonce', nonce);
  google.searchParams.set('code_challenge', codeChallenge);
  google.searchParams.set('code_challenge_method', 'S256');
  google.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(google, 302);
  response.cookies.set(
    GOOGLE_OAUTH_COOKIE,
    encodeOauthCookie({
      state,
      nonce,
      codeVerifier,
      locale,
      ...(next ? { next } : {}),
    }),
    {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60,
    },
  );
  return response;
}

function optionalNext(raw: string | null): string | undefined {
  if (
    !raw ||
    raw.length > 512 ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.includes('\\')
  ) {
    return undefined;
  }
  return raw;
}
