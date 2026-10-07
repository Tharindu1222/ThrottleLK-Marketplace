import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'si'] as const;
const defaultLocale = 'en';

function localeFromPath(pathname: string): (typeof locales)[number] {
  return (
    locales.find(
      (item) => pathname === `/${item}` || pathname.startsWith(`/${item}/`),
    ) ?? defaultLocale
  );
}

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get('__Host-tlk_access')?.value ||
      request.cookies.get('tlk_access')?.value ||
      request.cookies.get('__Host-tlk_refresh')?.value ||
      request.cookies.get('tlk_refresh')?.value,
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.(?:ico|png|jpe?g|gif|svg|webp|avif|css|js|map|txt|xml|woff2?|ttf|json)$/i.test(
      pathname,
    )
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  // Google's registered redirect URI has no locale prefix. A locale redirect
  // would drop `/auth/google/callback` (and its code/state query) off that URI.
  const skipLocaleRedirect =
    pathname === '/auth/google' || pathname === '/auth/google/callback';

  if (!hasLocale && !skipLocaleRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = localeFromPath(pathname);
  const isAccount =
    pathname === `/${locale}/account` ||
    pathname.startsWith(`/${locale}/account/`);
  if (isAccount && !hasSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = '';
    url.searchParams.set(
      'next',
      `${pathname}${request.nextUrl.search || ''}`,
    );
    return NextResponse.redirect(url);
  }

  const headers = new Headers(request.headers);
  headers.set('x-throttlelk-locale', locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
