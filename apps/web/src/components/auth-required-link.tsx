'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

function useIsLoggedIn() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(getAccessToken() || getStoredUser()));
    setReady(true);
  }, []);

  return { ready, loggedIn };
}

export function LoginRequiredDialog({
  locale,
  open,
  nextPath,
  onClose,
  autoRedirectMs,
  title,
  hint,
}: {
  locale: Locale;
  open: boolean;
  nextPath: string;
  onClose?: () => void;
  /** When set, navigates to login after this many ms. */
  autoRedirectMs?: number;
  title?: string;
  hint?: string;
}) {
  const titleId = useId();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const loginHref = `/${locale}/login?next=${encodeURIComponent(nextPath)}`;
  const onLoginPage = pathname?.includes('/login') ?? false;
  const dialogTitle = title ?? t(locale, 'loginToPostAd');
  const dialogHint = hint ?? t(locale, 'loginToPostAdHint');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open && onLoginPage) onClose?.();
  }, [open, onLoginPage, onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !autoRedirectMs || onLoginPage) return;
    const id = window.setTimeout(() => {
      window.location.assign(loginHref);
    }, autoRedirectMs);
    return () => window.clearTimeout(id);
  }, [open, autoRedirectMs, loginHref, onLoginPage]);

  if (!mounted || !open || onLoginPage) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-black/10 bg-white p-6 text-center shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="h-6 w-6"
          >
            <path
              d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 19.2c1.8-3 4.4-4.5 7.5-4.5s5.7 1.5 7.5 4.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2
          id={titleId}
          className="mt-4 font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground"
        >
          {dialogTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {dialogHint}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href={loginHref}
            onClick={() => onClose?.()}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
          >
            {t(locale, 'login')}
          </Link>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {t(locale, 'notNow')}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Link to a protected route — shows login popup when signed out. */
export function AuthRequiredLink({
  locale,
  href,
  className,
  children,
  onNavigate,
}: {
  locale: Locale;
  href: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const { ready, loggedIn } = useIsLoggedIn();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!ready) {
      e.preventDefault();
      return;
    }
    if (loggedIn) {
      onNavigate?.();
      return;
    }
    e.preventDefault();
    onNavigate?.();
    setOpen(true);
  }

  return (
    <>
      <Link href={href} className={className} onClick={handleClick}>
        {children}
      </Link>
      <LoginRequiredDialog
        locale={locale}
        open={open}
        nextPath={href}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/** Sell page gate: popup + redirect path when signed out. */
export function SellLoginGate({
  locale,
  children,
  nextPath,
}: {
  locale: Locale;
  children: ReactNode;
  nextPath?: string;
}) {
  const { ready, loggedIn } = useIsLoggedIn();
  const pathname = usePathname();
  const redirectTo = nextPath ?? `/${locale}/sell`;

  if (!ready) {
    return (
      <div className="mt-10 flex justify-center" aria-hidden>
        <div className="h-8 w-8 animate-pulse rounded-full bg-black/10" />
      </div>
    );
  }

  if (!loggedIn) {
    if (pathname?.includes('/login')) return null;
    return (
      <LoginRequiredDialog
        locale={locale}
        open
        nextPath={redirectTo}
        autoRedirectMs={1800}
      />
    );
  }

  return <>{children}</>;
}
