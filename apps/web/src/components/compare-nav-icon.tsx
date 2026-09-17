'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCompareItems } from '@/lib/compare';
import { t, type Locale } from '@/lib/i18n';
import { HeaderNavBadge, headerIconButtonClass } from './header-nav-badge';

export function CompareNavIcon({ locale }: { locale: Locale }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(getCompareItems().length);
    sync();
    window.addEventListener('throttlelk-compare', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('throttlelk-compare', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <Link
      href={`/${locale}/compare`}
      className={headerIconButtonClass}
      aria-label={
        count > 0
          ? `${t(locale, 'compare')} (${count})`
          : t(locale, 'compare')
      }
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3.5" y="4.5" width="7" height="15" rx="1.5" />
        <rect x="13.5" y="4.5" width="7" height="15" rx="1.5" />
        <path d="M6.5 9h1M6.5 13h1M16.5 9h1M16.5 13h1" />
      </svg>
      <HeaderNavBadge count={count} />
    </Link>
  );
}
