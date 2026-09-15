'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
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

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        stage.querySelectorAll('[data-auth-fade]'),
        { opacity: 0, y: 18 },
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
        { opacity: 0, x: 40, y: 16 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          delay: 0.35,
        },
      );
    }, stage);

    return () => ctx.revert();
  }, []);

  return (
    <main
      ref={stageRef}
      className="relative isolate min-h-[calc(100vh-4.25rem)] overflow-hidden bg-[#0a0a0a]"
    >
      {/* Diagonal black / surface split — same language as home hero */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(115deg, #0a0a0a 0%, #0a0a0a 48%, #f5f5f5 48.2%, #f5f5f5 100%)',
        }}
      />

      {/* Skewed speed bars — accent + gray bars from hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-10%] right-[-5%] bottom-[-10%] left-[28%] sm:left-[34%]"
      >
        <div className="absolute top-0 left-[8%] h-full w-[18%] origin-center -skew-x-[18deg] bg-accent" />
        <div className="absolute top-0 left-[28%] h-full w-[14%] origin-center -skew-x-[18deg] bg-[var(--gray-bar)]" />
        <div className="absolute top-0 left-[44%] h-full w-[11%] origin-center -skew-x-[18deg] bg-[var(--gray-bar-light)]" />
      </div>

      {/* Soft ground line */}
      <div
        aria-hidden
        className="absolute right-[8%] bottom-[18%] left-[8%] h-px bg-gradient-to-r from-transparent via-white/40 to-transparent lg:right-[38%]"
      />

      {/* Bike layer — bleeds under the form on desktop */}
      <div className="pointer-events-none absolute inset-x-0 top-[2%] bottom-[20%] z-[1] sm:top-[0%] sm:bottom-[16%] lg:inset-y-[2%] lg:right-[28%] lg:left-[-8%] lg:bottom-[26%]">
        <AuthBikeStage />
      </div>

      {/* Content overlay */}
      <div className="relative z-[2] mx-auto flex min-h-[calc(100vh-4.25rem)] max-w-7xl flex-col justify-between px-5 py-8 sm:px-8 lg:px-10 xl:px-14">
        <div data-auth-fade className="relative">
          <BrandLogo size="header" tone="white" />
        </div>

        <div className="grid flex-1 items-end gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:items-center lg:gap-10 lg:pt-0">
          {/* Brand copy — on dark half */}
          <div
            data-auth-fade
            className="order-2 max-w-xl pb-2 lg:order-1 lg:self-end lg:pb-10"
          >
            <p className="font-[family-name:var(--font-display)] text-xs tracking-[0.4em] text-accent uppercase sm:text-sm">
              ThrottleLK
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-[0.95] tracking-tight text-white sm:text-4xl xl:text-5xl">
              {t(locale, 'tagline')}
            </h2>
            <p className="mt-4 max-w-md text-sm text-white/75 sm:text-base">
              {t(locale, 'support')}
            </p>
            <div className="mt-6 flex gap-5 text-[11px] tracking-[0.22em] text-white/45 uppercase">
              <span>Buy</span>
              <span className="text-accent">·</span>
              <span>Sell</span>
              <span className="text-accent">·</span>
              <span>Ride</span>
            </div>
          </div>

          {/* Form card — sits on light half */}
          <div className="order-1 flex justify-center lg:order-2 lg:justify-end lg:self-center">
            <div
              ref={cardRef}
              className="w-full max-w-md border border-black/12 bg-white p-7 shadow-[0_1px_0_rgba(0,0,0,0.06),0_8px_28px_-12px_rgba(0,0,0,0.22)] sm:p-9"
            >
              <div className="mb-1 h-1 w-12 bg-accent" />
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-muted">{subtitle}</p>
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export const authFieldClass =
  'w-full rounded-full border border-black/10 bg-surface/90 px-5 py-3.5 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20';

export const authPrimaryBtnClass =
  'inline-flex flex-1 items-center justify-center rounded-full bg-accent px-5 py-3.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.9)] transition hover:brightness-110 disabled:opacity-60';

export const authSecondaryBtnClass =
  'inline-flex flex-1 items-center justify-center rounded-full border border-black/15 px-5 py-3.5 font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground transition hover:border-accent hover:text-accent';
