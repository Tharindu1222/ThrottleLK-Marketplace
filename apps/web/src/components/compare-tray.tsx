'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  clearCompare,
  getCompareItems,
  type CompareItem,
} from '@/lib/compare';
import { t, type Locale } from '@/lib/i18n';

export function CompareTray({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const trayRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const root = document.documentElement;
    if (items.length === 0) {
      root.style.removeProperty('--compare-tray-offset');
      return;
    }

    const el = trayRef.current;
    if (!el) return;

    const apply = () => {
      root.style.setProperty('--compare-tray-offset', `${el.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--compare-tray-offset');
    };
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div
      ref={trayRef}
      className="fixed inset-x-0 bottom-0 z-40 max-w-full border-t border-black/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
        <p className="min-w-0 max-w-full text-sm break-words text-muted line-clamp-2">
          {t(locale, 'compare')}: {items.map((i) => i.title).join(' · ')}
        </p>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center px-2 text-sm text-muted underline sm:min-h-0 sm:px-0"
            onClick={() => {
              clearCompare();
              setItems([]);
            }}
          >
            {t(locale, 'clearCompare')}
          </button>
          <Link
            href={`/${locale}/compare`}
            className="inline-flex min-h-11 flex-1 items-center justify-center bg-accent px-4 text-sm text-white sm:flex-none sm:px-3 sm:py-1.5"
          >
            {t(locale, 'viewCompare')}
          </Link>
        </div>
      </div>
    </div>
  );
}
