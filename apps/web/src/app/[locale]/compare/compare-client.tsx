'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BRAND_LOGO_SRC } from '@/components/brand-logo';
import { apiGet } from '@/lib/api';
import {
  clearCompare,
  getCompareItems,
  toggleCompare,
  type CompareItem,
} from '@/lib/compare';
import { t, type Locale } from '@/lib/i18n';

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
  coverImageUrl?: string | null;
};

const rows: { key: keyof Listing | 'price'; labelKey: string }[] = [
  { key: 'price', labelKey: 'price' },
  { key: 'manufactureYear', labelKey: 'year' },
  { key: 'mileage', labelKey: 'mileage' },
  { key: 'engineCc', labelKey: 'cc' },
  { key: 'fuelType', labelKey: 'fuel' },
  { key: 'transmission', labelKey: 'transmission' },
  { key: 'condition', labelKey: 'condition' },
];

function formatLkr(n: number) {
  return `Rs. ${n.toLocaleString('en-LK')}`;
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

  function cell(listing: Listing, key: (typeof rows)[number]['key']) {
    if (key === 'price') return formatLkr(listing.priceLkr);
    if (key === 'mileage') {
      return listing.mileage != null
        ? `${listing.mileage.toLocaleString('en-LK')} km`
        : '—';
    }
    if (key === 'engineCc') {
      return listing.engineCc != null ? String(listing.engineCc) : '—';
    }
    return String(listing[key] ?? '—');
  }

  if (loading) {
    return (
      <p className="mt-10 text-sm text-muted">{t(locale, 'search')}…</p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-10 border border-black/10 bg-surface px-6 py-12 text-center">
        <p className="text-muted">{t(locale, 'compareEmpty')}</p>
        <Link
          href={`/${locale}/bikes`}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 font-[family-name:var(--font-display)] text-sm tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.9)] transition hover:brightness-110"
        >
          {t(locale, 'browse')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_40px_-24px_rgba(0,0,0,0.28)]">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="bg-surface/80">
              <th className="w-[140px] border-b border-black/10 p-4 align-bottom text-[11px] tracking-[0.14em] text-muted uppercase sm:w-[160px]">
                {t(locale, 'compare')}
              </th>
              {listings.map((listing) => (
                <th
                  key={listing.id}
                  className="w-[220px] min-w-[200px] border-b border-l border-black/10 p-4 align-top sm:w-[240px]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden border border-black/10 bg-surface">
                    {listing.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.coverImageUrl}
                        alt={listing.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[linear-gradient(160deg,#f0f0f0_0%,#fafafa_50%,#ececec_100%)] px-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={BRAND_LOGO_SRC}
                          alt=""
                          className="h-8 w-auto max-w-[50%] object-contain opacity-70 brightness-0"
                        />
                        <span className="text-[11px] text-muted">
                          {t(locale, 'photoComingSoon')}
                        </span>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/${locale}/bikes/${listing.slug}`}
                    className="mt-3 block font-[family-name:var(--font-display)] text-lg leading-snug tracking-wide text-foreground transition hover:text-accent"
                  >
                    {listing.title}
                  </Link>
                  <p className="mt-1.5 font-[family-name:var(--font-display)] text-xl tracking-wide text-accent">
                    {formatLkr(listing.priceLkr)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href={`/${locale}/bikes/${listing.slug}`}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      {t(locale, 'viewListing')}
                    </Link>
                    <button
                      type="button"
                      className="text-xs text-muted transition hover:text-accent"
                      onClick={() => removeListing(listing)}
                    >
                      {t(locale, 'removeCompare')}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isPrice = row.key === 'price';
              return (
                <tr
                  key={row.key}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-surface/50'}
                >
                  <th className="border-b border-black/5 px-4 py-3.5 text-left text-[11px] font-medium tracking-[0.12em] text-muted uppercase">
                    {t(locale, row.labelKey as 'price')}
                  </th>
                  {listings.map((listing) => (
                    <td
                      key={listing.id}
                      className={`border-b border-l border-black/5 px-4 py-3.5 text-sm ${
                        isPrice
                          ? 'font-[family-name:var(--font-display)] text-lg tracking-wide text-accent'
                          : 'text-foreground'
                      }`}
                    >
                      {cell(listing, row.key)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full border border-black/15 px-5 py-2.5 text-sm text-foreground transition hover:border-accent hover:text-accent"
        onClick={() => {
          clearCompare();
          setItems([]);
          setListings([]);
        }}
      >
        {t(locale, 'clearCompare')}
      </button>
    </div>
  );
}
