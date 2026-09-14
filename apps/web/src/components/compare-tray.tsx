'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  clearCompare,
  getCompareItems,
  type CompareItem,
} from '@/lib/compare';
import { t, type Locale } from '@/lib/i18n';

export function CompareTray({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(getCompareItems());
    sync();
    window.addEventListener('throttlelk-compare', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('throttlelk-compare', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <p className="text-sm text-muted">
          {t(locale, 'compare')}: {items.map((i) => i.title).join(' · ')}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="text-sm text-muted underline"
            onClick={() => {
              clearCompare();
              setItems([]);
            }}
          >
            {t(locale, 'clearCompare')}
          </button>
          <Link
            href={`/${locale}/compare`}
            className="bg-accent px-3 py-1.5 text-sm text-white"
          >
            {t(locale, 'viewCompare')}
          </Link>
        </div>
      </div>
    </div>
  );
}
