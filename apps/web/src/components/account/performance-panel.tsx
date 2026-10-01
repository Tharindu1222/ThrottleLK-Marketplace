'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { t, type Locale } from '@/lib/i18n';

export type PerformanceRange = 'all' | '7d' | '30d';

export type PerformanceMetrics = {
  range: PerformanceRange;
  activeListings: number;
  views: number;
  phoneClicks: number;
  whatsappClicks: number;
  favourites: number;
};

const RANGES: PerformanceRange[] = ['all', '7d', '30d'];

const RANGE_LABEL: Record<PerformanceRange, 'rangeAll' | 'range7d' | 'range30d'> =
  {
    all: 'rangeAll',
    '7d': 'range7d',
    '30d': 'range30d',
  };

function formatCount(value: number) {
  return value.toLocaleString('en-LK');
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 4h3l1.5 4-2 1.5a12 12 0 0 0 4 4L16 12l4 1.5V17a2 2 0 0 1-2 2A14 14 0 0 1 5 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 18 4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6Z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z" />
    </svg>
  );
}

function BikeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="6.5" cy="16.5" r="3" />
      <circle cx="17.5" cy="16.5" r="3" />
      <path d="M6.5 16.5 10 8h4l2 4h3M10 8l2 8" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 8 12 4l9 4-9 4-9-4Z" />
      <path d="M3 8v8l9 4 9-4V8" />
      <path d="M12 12v8" />
    </svg>
  );
}

function secondaryMetrics(stock: 'bike' | 'parts') {
  return [
    { key: 'phoneClicks' as const, labelKey: 'metricPhoneClicks' as const, icon: PhoneIcon },
    { key: 'whatsappClicks' as const, labelKey: 'metricWhatsappClicks' as const, icon: ChatIcon },
    { key: 'favourites' as const, labelKey: 'metricFavourites' as const, icon: HeartIcon },
    {
      key: 'activeListings' as const,
      labelKey: 'metricActiveListings' as const,
      icon: stock === 'parts' ? BoxIcon : BikeIcon,
    },
  ];
}

export type PerformanceStock = 'bike' | 'parts';

const STOCKS: PerformanceStock[] = ['bike', 'parts'];

const STOCK_LABEL: Record<PerformanceStock, 'performanceStockBikes' | 'performanceStockParts'> =
  {
    bike: 'performanceStockBikes',
    parts: 'performanceStockParts',
  };

export function PerformanceStockSwitch({
  locale,
  stock,
  onStock,
}: {
  locale: Locale;
  stock: PerformanceStock;
  onStock: (stock: PerformanceStock) => void;
}) {
  return (
    <div
      role="group"
      aria-label={t(locale, 'performance')}
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-black/10 bg-white p-1"
    >
      {STOCKS.map((value) => {
        const active = stock === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onStock(value)}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active
                ? 'bg-foreground font-semibold text-white'
                : 'font-medium text-muted hover:text-foreground'
            }`}
          >
            {t(locale, STOCK_LABEL[value])}
          </button>
        );
      })}
    </div>
  );
}

export function PerformancePanel({
  locale,
  range,
  onRange,
  metrics,
  loading,
  error,
  listingsHref,
  stock,
  onStock,
  showStockSwitch,
}: {
  locale: Locale;
  range: PerformanceRange;
  onRange: (range: PerformanceRange) => void;
  metrics: PerformanceMetrics | null;
  loading: boolean;
  error: string | null;
  listingsHref: string;
  stock: PerformanceStock;
  onStock: (stock: PerformanceStock) => void;
  showStockSwitch: boolean;
}) {
  const quiet =
    metrics != null &&
    metrics.phoneClicks === 0 &&
    metrics.whatsappClicks === 0 &&
    metrics.favourites === 0;

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {showStockSwitch ? (
          <PerformanceStockSwitch locale={locale} stock={stock} onStock={onStock} />
        ) : null}
        <div
          role="group"
          aria-label={t(locale, 'performancePeriod')}
          className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-black/10 bg-white p-1"
        >
        {RANGES.map((value) => {
          const active = range === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onRange(value)}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm whitespace-nowrap transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? 'bg-foreground font-semibold text-white'
                  : 'font-medium text-muted hover:text-foreground'
              }`}
            >
              {t(locale, RANGE_LABEL[value])}
            </button>
          );
        })}
        </div>
      </div>

      {error ? (
        <p
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section
        aria-busy={loading}
        aria-live="polite"
        className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]"
      >
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted uppercase">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                <EyeIcon />
              </span>
              {t(locale, 'metricViews')}
            </p>
            {loading && !metrics ? (
              <div className="mt-4 h-12 w-28 animate-pulse rounded-lg bg-black/[0.06]" />
            ) : (
              <p className="mt-3 font-[family-name:var(--font-display)] text-5xl tracking-wide text-foreground sm:text-6xl">
                {formatCount(metrics?.views ?? 0)}
              </p>
            )}
            <p className="mt-3 max-w-md text-sm text-muted">
              {loading && !metrics
                ? t(locale, 'performanceSubtitle')
                : t(locale, 'performanceSummary')
                    .replace('{views}', formatCount(metrics?.views ?? 0))
                    .replace('{n}', formatCount(metrics?.activeListings ?? 0))}
            </p>
          </div>
          <Link
            href={listingsHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t(locale, 'performanceOpenListings')}
          </Link>
        </div>

        <div className="grid gap-px border-t border-black/[0.06] bg-black/[0.06] sm:grid-cols-2 xl:grid-cols-4">
          {secondaryMetrics(stock).map((metric) => {
            const Icon = metric.icon;
            const value = metrics?.[metric.key] ?? 0;
            return (
              <div key={metric.key} className="min-w-0 bg-white px-5 py-4 sm:px-6 sm:py-5">
                <p className="flex items-center gap-2 text-sm text-muted">
                  <span className="text-foreground/70">
                    <Icon />
                  </span>
                  {t(locale, metric.labelKey)}
                </p>
                {loading && !metrics ? (
                  <div className="mt-3 h-8 w-12 animate-pulse rounded-md bg-black/[0.06]" />
                ) : (
                  <p className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground">
                    {formatCount(value)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {quiet && !loading ? (
        <p className="max-w-xl text-sm text-muted">{t(locale, 'performanceQuiet')}</p>
      ) : null}
    </div>
  );
}
