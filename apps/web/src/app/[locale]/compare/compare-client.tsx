'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { BRAND_LOGO_SRC } from '@/components/brand-logo';
import { apiGet } from '@/lib/api';
import {
  MAX_COMPARE,
  clearCompare,
  getCompareItems,
  toggleCompare,
  type CompareItem,
} from '@/lib/compare';
import { t, type Locale } from '@/lib/i18n';
import { composeListingTitle } from '@/lib/listing-title';

type Listing = {
  id: string;
  slug: string;
  title: string;
  priceLkr: number;
  manufactureYear: number;
  mileage: number | null;
  engineCc: number | null;
  fuelType: string;
  transmission: string;
  condition: string;
  colour?: string | null;
  brandName?: string | null;
  modelName?: string | null;
  coverImageUrl?: string | null;
};

type RowKey =
  | 'price'
  | 'manufactureYear'
  | 'mileage'
  | 'engineCc'
  | 'fuelType'
  | 'transmission'
  | 'condition'
  | 'colour';

const rows: { key: RowKey; labelKey: 'price' | 'year' | 'mileage' | 'cc' | 'fuel' | 'transmission' | 'condition' | 'colour' }[] =
  [
    { key: 'price', labelKey: 'price' },
    { key: 'manufactureYear', labelKey: 'year' },
    { key: 'mileage', labelKey: 'mileage' },
    { key: 'engineCc', labelKey: 'cc' },
    { key: 'fuelType', labelKey: 'fuel' },
    { key: 'transmission', labelKey: 'transmission' },
    { key: 'condition', labelKey: 'condition' },
    { key: 'colour', labelKey: 'colour' },
  ];

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
}

function pretty(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayTitle(listing: Listing) {
  return composeListingTitle({
    title: listing.title,
    brandName: listing.brandName,
    modelName: listing.modelName,
    manufactureYear: listing.manufactureYear,
  });
}

function Icon({
  children,
  className = 'h-4 w-4',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function rowIcon(key: RowKey) {
  switch (key) {
    case 'price':
      return (
        <Icon>
          <path d="M20.6 13.4 12.7 21.3a2 2 0 0 1-2.8 0L3 14.4V4h10.4l7.2 7.2a2 2 0 0 1 0 2.2z" />
          <circle cx="8.2" cy="8.2" r="1.2" />
        </Icon>
      );
    case 'manufactureYear':
      return (
        <Icon>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M4 11h16" />
        </Icon>
      );
    case 'mileage':
      return (
        <Icon>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 13l4-4" />
          <path d="M7 8.5a8 8 0 0 1 10 0" />
        </Icon>
      );
    case 'engineCc':
      return (
        <Icon>
          <path d="M7 8h10l1.5 4H18v5H6v-5h-.5L7 8z" />
          <path d="M9 8V6h6v2" />
          <path d="M10 17v2M14 17v2" />
        </Icon>
      );
    case 'fuelType':
      return (
        <Icon>
          <path d="M8 4h6l2 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          <path d="M14 8h3.5a2 2 0 0 1 2 2v5.5a1.5 1.5 0 1 0 3 0V11l-2-2" />
        </Icon>
      );
    case 'transmission':
      return (
        <Icon>
          <circle cx="7" cy="7" r="2.2" />
          <circle cx="17" cy="7" r="2.2" />
          <circle cx="12" cy="17" r="2.2" />
          <path d="M7 9.2v2.3h10V9.2M12 14.8v-3.3" />
        </Icon>
      );
    case 'condition':
      return (
        <Icon>
          <path d="M12 3l7 4v5c0 5-3.5 8.5-7 10-4.5-1.5-8-5-8-10V7l7-4z" />
          <path d="M9 12l2 2 4-4" />
        </Icon>
      );
    case 'colour':
      return (
        <Icon>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v16" />
          <path d="M12 12h8" />
        </Icon>
      );
  }
}

function cellValue(listing: Listing, key: RowKey): string {
  if (key === 'price') return formatLkr(listing.priceLkr);
  if (key === 'mileage') {
    return listing.mileage != null
      ? `${listing.mileage.toLocaleString('en-LK')} km`
      : '—';
  }
  if (key === 'engineCc') {
    return listing.engineCc != null ? `${listing.engineCc} cc` : '—';
  }
  if (key === 'manufactureYear') return String(listing.manufactureYear ?? '—');
  if (key === 'colour') {
    const colour = listing.colour?.trim();
    return colour ? pretty(colour) : '—';
  }
  const raw = listing[key];
  return raw ? pretty(String(raw)) : '—';
}

function rowDiffers(listings: Listing[], key: RowKey) {
  if (listings.length < 2) return false;
  return new Set(listings.map((listing) => cellValue(listing, key))).size > 1;
}

export function CompareClient({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const selected = getCompareItems();
    setItems(selected);
    if (selected.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all(
      selected.map((item) => apiGet<Listing>(`/api/v1/listings/${item.id}`)),
    )
      .then((data) => {
        setListings(data);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      )
      .finally(() => setLoading(false));
  }, []);

  function removeListing(listing: Listing) {
    toggleCompare({
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
    });
    const next = getCompareItems();
    setItems(next);
    setListings((prev) => prev.filter((l) => next.some((n) => n.id === l.id)));
  }

  function onClear() {
    clearCompare();
    setItems([]);
    setListings([]);
  }

  const showAddSlot = listings.length > 0 && listings.length < MAX_COMPARE;
  const visibleRows = rows.filter((row) => {
    if (row.key !== 'colour') return true;
    return listings.some((listing) => Boolean(listing.colour?.trim()));
  });
  const countLabel =
    listings.length === 1
      ? t(locale, 'compareCountOne')
      : t(locale, 'compareCount').replace('{n}', String(listings.length));

  if (loading) {
    return (
      <div className="mt-8 overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className="grid grid-cols-[8.5rem_repeat(2,minmax(0,1fr))] gap-px bg-black/[0.06]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse bg-white" />
          ))}
        </div>
        <p className="sr-only">{t(locale, 'compareLoading')}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-black/15 bg-surface px-6 py-14 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-accent shadow-sm">
          <Icon className="h-6 w-6">
            <rect x="3.5" y="4.5" width="7" height="15" rx="1.5" />
            <rect x="13.5" y="4.5" width="7" height="15" rx="1.5" />
            <path d="M6.5 9h1M6.5 13h1M16.5 9h1M16.5 13h1" />
          </Icon>
        </span>
        <p className="mt-4 font-[family-name:var(--font-display)] text-lg tracking-wide text-foreground">
          {t(locale, 'compareEmpty')}
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
          {t(locale, 'compareEmptyHint')}
        </p>
        <Link
          href={`/${locale}/bikes`}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.9)] transition hover:brightness-110"
        >
          <Icon className="h-4 w-4">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </Icon>
          {t(locale, 'browse')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-surface text-foreground/70">
            <Icon className="h-4 w-4">
              <rect x="3.5" y="4.5" width="7" height="15" rx="1.5" />
              <rect x="13.5" y="4.5" width="7" height="15" rx="1.5" />
            </Icon>
          </span>
          {countLabel}
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3.5 py-2 text-sm text-foreground transition hover:border-accent hover:text-accent"
          onClick={onClear}
        >
          <Icon className="h-4 w-4">
            <path d="M4 7h16M9 7V5h6v2M8 7l.8 12h6.4L16 7" />
          </Icon>
          {t(locale, 'compareClearAll')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_40px_-24px_rgba(0,0,0,0.28)]">
        <table className="w-full min-w-[32rem] border-collapse text-left sm:min-w-[40rem]">
          <thead>
            <tr className="border-b border-black/10">
              <th className="sticky left-0 z-20 w-[9.5rem] bg-white px-4 py-4 align-bottom text-[11px] font-medium tracking-[0.14em] text-muted uppercase">
                {t(locale, 'compareSpecs')}
              </th>
              {listings.map((listing) => {
                const title = displayTitle(listing);
                return (
                  <th
                    key={listing.id}
                    className="min-w-[11.5rem] max-w-[16rem] border-l border-black/10 px-4 py-4 align-top"
                  >
                    <div className="mx-auto w-full max-w-[13.5rem]">
                      <div className="relative overflow-hidden rounded-lg bg-surface">
                        <div className="aspect-[16/10] w-full">
                          {listing.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={listing.coverImageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-[linear-gradient(160deg,#f0f0f0_0%,#fafafa_50%,#ececec_100%)] px-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={BRAND_LOGO_SRC}
                                alt=""
                                className="h-7 w-auto max-w-[45%] object-contain opacity-70 brightness-0"
                              />
                              <span className="text-[10px] text-muted">
                                {t(locale, 'photoComingSoon')}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white shadow-sm transition hover:bg-accent"
                          onClick={() => removeListing(listing)}
                          aria-label={t(locale, 'removeCompare')}
                          title={t(locale, 'removeCompare')}
                        >
                          <Icon className="h-3.5 w-3.5">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </Icon>
                        </button>
                      </div>
                      <Link
                        href={`/${locale}/bikes/${listing.slug}`}
                        className="mt-3 block line-clamp-2 font-[family-name:var(--font-display)] text-[0.95rem] leading-snug tracking-wide text-foreground transition hover:text-accent"
                      >
                        {title}
                      </Link>
                      <p className="mt-1 font-[family-name:var(--font-display)] text-lg leading-none tracking-wide text-accent">
                        {formatLkr(listing.priceLkr)}
                      </p>
                      <Link
                        href={`/${locale}/bikes/${listing.slug}`}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent transition hover:underline"
                      >
                        {t(locale, 'viewListing')}
                        <Icon className="h-3.5 w-3.5">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </Icon>
                      </Link>
                    </div>
                  </th>
                );
              })}
              {showAddSlot ? (
                <th className="hidden min-w-[11rem] max-w-[14rem] border-l border-black/10 px-4 py-4 align-top md:table-cell">
                  <Link
                    href={`/${locale}/bikes`}
                    className="mx-auto flex aspect-[16/10] w-full max-w-[13.5rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-black/20 bg-surface text-muted transition hover:border-accent/50 hover:text-accent"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-current">
                      <Icon className="h-4 w-4">
                        <path d="M12 5v14M5 12h14" />
                      </Icon>
                    </span>
                    <span className="px-3 text-center text-xs font-medium">
                      {t(locale, 'compareAddAnother')}
                    </span>
                  </Link>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const differs = rowDiffers(listings, row.key);
              const isPrice = row.key === 'price';
              return (
                <tr
                  key={row.key}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-surface/70'}
                >
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 border-b border-black/5 px-4 py-3 text-left ${
                      index % 2 === 0 ? 'bg-white' : 'bg-surface'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground/80">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/[0.04] text-foreground/70">
                        {rowIcon(row.key)}
                      </span>
                      {t(locale, row.labelKey)}
                    </span>
                  </th>
                  {listings.map((listing) => {
                    const value = cellValue(listing, row.key);
                    return (
                      <td
                        key={listing.id}
                        className={`border-b border-l border-black/5 px-4 py-3 text-sm ${
                          isPrice
                            ? 'font-[family-name:var(--font-display)] tracking-wide text-accent'
                            : 'text-foreground'
                        } ${differs ? 'font-semibold' : ''}`}
                      >
                        <span
                          className={
                            differs
                              ? 'rounded-sm bg-accent/10 px-1.5 py-0.5'
                              : undefined
                          }
                        >
                          {value}
                        </span>
                        {differs ? (
                          <span className="sr-only">
                            {t(locale, 'compareDiffers')}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                  {showAddSlot ? (
                    <td className="hidden border-b border-l border-black/5 px-4 py-3 text-sm text-muted md:table-cell">
                      —
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
