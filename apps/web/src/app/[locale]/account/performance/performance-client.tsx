'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  PerformancePanel,
  PerformanceStockSwitch,
  type PerformanceMetrics,
  type PerformanceRange,
  type PerformanceStock,
} from '@/components/account/performance-panel';
import { apiGet, ApiRequestError } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

const cardClass =
  'overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]';

function stockFromQuery(value: string | null): PerformanceStock | null {
  if (value === 'parts') return 'parts';
  if (value === 'bike' || value === 'bikes') return 'bike';
  return null;
}

export function PerformanceClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryStock = stockFromQuery(searchParams.get('stock'));
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [canBike, setCanBike] = useState(false);
  const [canParts, setCanParts] = useState(false);
  const [range, setRange] = useState<PerformanceRange>('all');
  const [data, setData] = useState<PerformanceMetrics | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);
  const stockRef = useRef<PerformanceStock>('bike');

  const bothShops = canBike && canParts;
  const stock: PerformanceStock = bothShops
    ? (queryStock ?? 'bike')
    : canParts
      ? 'parts'
      : 'bike';

  function selectStock(next: PerformanceStock) {
    const path = `/${locale}/account/performance`;
    router.replace(
      next === 'parts' ? `${path}?stock=parts` : `${path}?stock=bikes`,
      { scroll: false },
    );
  }

  useEffect(() => {
    const user = getStoredUser();
    setToken(getAccessToken());
    setCanBike(Boolean(user?.roles?.includes('dealer')));
    setCanParts(Boolean(user?.roles?.includes('parts_dealer')));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    if (canBike && canParts) return;
    if (!searchParams.get('stock')) return;
    router.replace(`/${locale}/account/performance`, { scroll: false });
  }, [canBike, canParts, locale, ready, router, searchParams, token]);

  useEffect(() => {
    if (!ready) return;
    const access = getAccessToken();
    setToken(access);
    if (!access) {
      setLoading(false);
      setData(null);
      return;
    }

    const user = getStoredUser();
    const missingRole =
      user != null &&
      (stock === 'bike'
        ? !user.roles?.includes('dealer')
        : !user.roles?.includes('parts_dealer'));
    if (missingRole) {
      setForbidden(true);
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    const stockChanged = stockRef.current !== stock;
    stockRef.current = stock;

    void (async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      setForbidden(false);
      if (stockChanged) setData(null);
      try {
        const result = await apiGet<PerformanceMetrics>(
          stock === 'parts'
            ? '/api/v1/parts-dealers/mine/performance'
            : '/api/v1/dealers/mine/performance',
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
  }, [range, ready, stock]);

  if (!ready) return null;

  if (!token) {
    return (
      <p className="text-muted">
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/performance`)}`}
          className="font-medium text-foreground underline decoration-black/20 underline-offset-2 transition hover:text-accent hover:decoration-accent"
        >
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  if (forbidden) {
    const applyHref =
      stock === 'parts'
        ? `/${locale}/parts-dealers/apply`
        : `/${locale}/dealers/apply`;
    const applyLabel =
      stock === 'parts' ? t(locale, 'becomePartsDealer') : t(locale, 'dealerApply');
    return (
      <div className="min-w-0 space-y-5">
        {bothShops ? (
          <PerformanceStockSwitch locale={locale} stock={stock} onStock={selectStock} />
        ) : null}
        <section className={`${cardClass} max-w-xl p-5 sm:p-6`}>
          <p className="font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
            {t(locale, 'noActiveShowroom')}
          </p>
          <p className="mt-2 text-sm text-muted">{t(locale, 'noActiveShowroomHint')}</p>
          <Link
            href={applyHref}
            className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent/90"
          >
            {applyLabel}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <PerformancePanel
      locale={locale}
      range={range}
      onRange={setRange}
      metrics={data}
      loading={loading}
      error={error}
      listingsHref={
        stock === 'parts'
          ? `/${locale}/account/parts-listings`
          : `/${locale}/account/listings`
      }
      stock={stock}
      onStock={selectStock}
      showStockSwitch={bothShops}
    />
  );
}
