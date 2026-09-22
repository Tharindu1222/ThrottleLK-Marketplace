'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { apiGet, ApiRequestError } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type PerformanceRange = 'all' | '7d' | '30d';

type DealerPerformance = {
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

const METRICS: Array<{
  key: keyof Omit<DealerPerformance, 'range'>;
  labelKey:
    | 'metricActiveListings'
    | 'metricViews'
    | 'metricPhoneClicks'
    | 'metricWhatsappClicks'
    | 'metricFavourites';
}> = [
  { key: 'activeListings', labelKey: 'metricActiveListings' },
  { key: 'views', labelKey: 'metricViews' },
  { key: 'phoneClicks', labelKey: 'metricPhoneClicks' },
  { key: 'whatsappClicks', labelKey: 'metricWhatsappClicks' },
  { key: 'favourites', labelKey: 'metricFavourites' },
];

const cardClass =
  'overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]';

const emptyMetrics: DealerPerformance = {
  range: 'all',
  activeListings: 0,
  views: 0,
  phoneClicks: 0,
  whatsappClicks: 0,
  favourites: 0,
};

export function PartsPerformanceClient({ locale }: { locale: Locale }) {
  const [token, setToken] = useState<string | null>(null);
  const [range, setRange] = useState<PerformanceRange>('all');
  const [data, setData] = useState<DealerPerformance | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) {
      setLoading(false);
      setData(null);
      return;
    }

    const user = getStoredUser();
    if (user && !user.roles?.includes('parts_dealer')) {
      setForbidden(true);
      setLoading(false);
      setData(null);
      return;
    }

    void (async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const result = await apiGet<DealerPerformance>(
          '/api/v1/parts-dealers/mine/performance',
          { token: access, searchParams: { range } },
        );
        if (requestId !== requestIdRef.current) return;
        setData(result);
        setForbidden(false);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err instanceof ApiRequestError && err.status === 403) {
          setForbidden(true);
          setData(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed');
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [range]);

  if (!token) {
    return (
      <p className="text-muted">
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/parts-performance`)}`}
          className="font-medium text-foreground underline decoration-black/20 underline-offset-2 transition hover:text-accent hover:decoration-accent"
        >
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  if (forbidden) {
    return (
      <section className={`${cardClass} max-w-xl p-5 sm:p-6`}>
        <p className="font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
          {t(locale, 'noActiveShowroom')}
        </p>
        <p className="mt-2 text-sm text-muted">
          {t(locale, 'noActiveShowroomHint')}
        </p>
        <Link
          href={`/${locale}/parts-dealers/apply`}
          className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent/90"
        >
          {t(locale, 'becomePartsDealer')}
        </Link>
      </section>
    );
  }

  const metrics = data ?? emptyMetrics;

  return (
    <div className="space-y-5">
      <div
        role="group"
        aria-label={t(locale, 'performance')}
        className="flex flex-wrap gap-2"
      >
        {RANGES.map((value) => {
          const active = range === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setRange(value)}
              className={`inline-flex shrink-0 items-center rounded-full border px-3.5 py-2 text-sm whitespace-nowrap transition ${
                active
                  ? 'border-black/20 bg-white text-accent shadow-[0_1px_0_rgba(0,0,0,0.06)]'
                  : 'border-black/15 bg-white text-muted hover:border-black/25 hover:text-foreground'
              }`}
            >
              {t(locale, RANGE_LABEL[value])}
            </button>
          );
        })}
      </div>

      {error ? (
        <p
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div
        aria-busy={loading}
        aria-live="polite"
        className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-5 ${
          loading ? 'opacity-60' : ''
        }`}
      >
        {METRICS.map((metric) => (
          <section key={metric.key} className={`${cardClass} p-4 sm:p-5`}>
            <p className="text-[10px] tracking-[0.2em] text-muted uppercase">
              {t(locale, metric.labelKey)}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-wide text-foreground">
              {metrics[metric.key]}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
