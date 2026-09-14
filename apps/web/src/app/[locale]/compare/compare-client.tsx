'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

export function CompareClient({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const selected = getCompareItems();
    setItems(selected);
    if (selected.length === 0) {
      setListings([]);
      return;
    }
    void Promise.all(
      selected.map((item) => apiGet<Listing>(`/api/v1/listings/${item.id}`)),
    )
      .then(setListings)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, []);

  if (items.length === 0) {
    return (
      <p className="mt-6 text-muted">
        {t(locale, 'compareEmpty')}{' '}
        <Link href={`/${locale}/bikes`} className="text-accent underline">
          {t(locale, 'browse')}
        </Link>
      </p>
    );
  }

  function cell(listing: Listing, key: (typeof rows)[number]['key']) {
    if (key === 'price') return `Rs. ${listing.priceLkr.toLocaleString('en-LK')}`;
    if (key === 'mileage') {
      return listing.mileage != null
        ? `${listing.mileage.toLocaleString()} km`
        : '—';
    }
    if (key === 'engineCc') return listing.engineCc ?? '—';
    return String(listing[key] ?? '—');
  }

  return (
    <div className="mt-8 overflow-x-auto">
      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="border-b border-black/10 p-3 text-muted"> </th>
            {listings.map((listing) => (
              <th key={listing.id} className="border-b border-black/10 p-3">
                <Link
                  href={`/${locale}/bikes/${listing.slug}`}
                  className="font-[family-name:var(--font-display)] text-lg hover:text-accent"
                >
                  {listing.title}
                </Link>
                <div className="mt-2">
                  <button
                    type="button"
                    className="text-xs text-muted underline"
                    onClick={() => {
                      toggleCompare({
                        id: listing.id,
                        slug: listing.slug,
                        title: listing.title,
                      });
                      const next = getCompareItems();
                      setItems(next);
                      setListings((prev) =>
                        prev.filter((l) => next.some((n) => n.id === l.id)),
                      );
                    }}
                  >
                    {t(locale, 'removeCompare')}
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th className="border-b border-black/5 p-3 text-muted">
                {t(locale, row.labelKey as 'price')}
              </th>
              {listings.map((listing) => (
                <td key={listing.id} className="border-b border-black/5 p-3">
                  {cell(listing, row.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="mt-6 text-sm text-muted underline"
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
