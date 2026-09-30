'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { AuthBikeStage } from '@/components/auth/auth-bike-stage';
import { t, type Locale } from '@/lib/i18n';

export function AuthShell({
  locale,
  title,
  subtitle,
  children,
}: {
  locale: Locale;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const stageRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    if (!stage || !card) return;

    let cancelled = false;
    let revert: (() => void) | undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    // Side entrance only at lg — an x offset on a phone overflows the padded column.
    const wide = window.matchMedia('(min-width: 1024px)').matches;

    void import('gsap').then(({ default: gsap }) => {
      if (cancelled || !stageRef.current || !cardRef.current) return;
      const ctx = gsap.context(() => {
        gsap.fromTo(
          stage.querySelectorAll('[data-auth-fade]'),
          { opacity: 0, y: wide ? 18 : 0 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: 'power3.out',
            delay: 0.2,
          },
        );
        gsap.fromTo(
          card,
          { opacity: 0, x: wide ? 40 : 0, y: wide ? 16 : 0 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            duration: wide ? 1 : 0.45,
            ease: 'power3.out',
            delay: wide ? 0.35 : 0.05,
          },
        );
      }, stage);
      revert = () => ctx.revert();
    });

    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  return (
    <main
      ref={stageRef}
      className="relative isolate min-h-[calc(100vh-4.25rem)] overflow-x-hidden bg-[#f4f4f4] lg:overflow-hidden lg:bg-[#0a0a0a]"
    >
      {/* Phone: red / gray / white bars, no headline or bike */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden"
      >
        <div className="absolute inset-y-[-12%] left-[38%] w-[20%] origin-center -skew-x-[18deg] bg-accent" />
        <div className="absolute inset-y-[-12%] left-[60%] w-[14%] origin-center -skew-x-[18deg] bg-[var(--gray-bar)]" />
        <div className="absolute inset-y-[-12%] left-[76%] w-[12%] origin-center -skew-x-[18deg] bg-[var(--gray-bar-light)]" />
        <div className="absolute inset-y-[-12%] left-[90%] w-[16%] origin-center -skew-x-[18deg] bg-white" />
      </div>

      {/* Diagonal black / surface split — desktop hero only */}
      <div
        aria-hidden
        className="auth-desktop-stage absolute inset-0 hidden lg:block"
        style={{
          background:
            'linear-gradient(115deg, #0a0a0a 0%, #0a0a0a 48%, #f5f5f5 48.2%, #f5f5f5 100%)',
        }}
      />

      {/* Skewed speed bars — accent + gray bars from hero */}
      <div
        aria-hidden
        className="auth-desktop-stage pointer-events-none absolute top-[-10%] right-[-5%] bottom-[-10%] left-[34%] hidden lg:block"
      >
        <div className="absolute top-0 left-[8%] h-full w-[18%] origin-center -skew-x-[18deg] bg-accent" />
        <div className="absolute top-0 left-[28%] h-full w-[14%] origin-center -skew-x-[18deg] bg-[var(--gray-bar)]" />
        <div className="absolute top-0 left-[44%] h-full w-[11%] origin-center -skew-x-[18deg] bg-[var(--gray-bar-light)]" />
      </div>

      {/* Soft ground line */}
      <div
        aria-hidden
        className="auth-desktop-stage absolute right-[38%] bottom-[18%] left-[8%] hidden h-px bg-gradient-to-r from-transparent via-white/40 to-transparent lg:block"
      />

      {/* Bike layer — bleeds under the form on desktop */}
      <div className="auth-desktop-stage pointer-events-none absolute z-[1] hidden overflow-hidden lg:inset-y-[2%] lg:right-[28%] lg:bottom-[26%] lg:left-[-8%] lg:block">
        <AuthBikeStage />
      </div>

      {/* Content overlay — stack from the top on small screens; fill the stage from lg */}
      <div className="relative z-[2] mx-auto flex min-h-[calc(100svh-4rem)] w-full min-w-0 max-w-7xl flex-col px-4 py-6 pb-[14vh] [justify-content:safe_center] sm:min-h-[calc(100svh-4.25rem)] sm:px-8 sm:py-8 sm:pb-[14vh] lg:min-h-[calc(100vh-4.25rem)] lg:justify-between lg:px-10 lg:pb-8 xl:px-14">
        <div data-auth-fade className="auth-desktop-stage relative hidden lg:block">
          <BrandLogo size="header" tone="white" />
        </div>

        <div className="grid w-full min-w-0 items-start gap-4 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:items-center lg:gap-10 lg:pt-6">
          {/* Brand copy — desktop dark half only */}
          <div
            data-auth-fade
            className="auth-desktop-stage hidden max-w-xl lg:order-1 lg:block lg:self-end lg:pb-10"
          >
            <p className="font-[family-name:var(--font-display)] text-xs tracking-[0.4em] text-accent uppercase sm:text-sm">
              ThrottleLK
            </p>
            <h2 className="mt-3 break-words font-[family-name:var(--font-display)] text-3xl leading-[0.95] tracking-tight text-white sm:text-4xl xl:text-5xl">
              {t(locale, 'tagline')}
            </h2>
            <p className="mt-4 max-w-md text-sm text-white/75 sm:text-base">
              {t(locale, 'support')}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] tracking-[0.22em] text-white/45 uppercase">
              <span>Buy</span>
              <span className="text-accent">·</span>
              <span>Sell</span>
              <span className="text-accent">·</span>
              <span>Ride</span>
            </div>
          </div>

          {/* Form card — the page below lg; light half from lg */}
          <div className="order-1 flex w-full min-w-0 justify-center lg:order-2 lg:justify-end lg:self-center">
            <div
              ref={cardRef}
              className="w-full min-w-0 max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_40px_-18px_rgba(0,0,0,0.35)] sm:p-6 lg:p-8"
            >
              <div className="h-1 w-10 rounded-full bg-accent" />
              <h1 className="mt-3 break-words font-[family-name:var(--font-display)] text-2xl tracking-wide text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
              <div className="mt-5">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export const authFieldClass =
  'w-full min-w-0 rounded-xl border border-black/10 bg-surface/90 px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20 sm:px-5 sm:py-3';

export const authPrimaryBtnClass =
  'inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.9)] transition hover:brightness-110 disabled:opacity-60';

export const authSecondaryBtnClass =
  'inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-black/15 px-5 py-2.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground transition hover:border-accent hover:text-accent';
