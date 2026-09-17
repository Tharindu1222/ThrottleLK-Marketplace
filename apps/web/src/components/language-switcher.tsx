'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { t, type Locale } from '@/lib/i18n';
import { headerIconButtonClass } from './header-nav-badge';

const OPTIONS: { locale: Locale; labelKey: 'languageEnglish' | 'languageSinhala' }[] =
  [
    { locale: 'en', labelKey: 'languageEnglish' },
    { locale: 'si', labelKey: 'languageSinhala' },
  ];

function hrefFor(next: Locale, pathname: string, search: string) {
  const rest = pathname.replace(/^\/(en|si)(?=\/|$)/, '') || '/';
  const path = `/${next}${rest === '/' ? '' : rest}`;
  return search ? `${path}?${search}` : path;
}

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(window.location.search.replace(/^\?/, ''));
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [locale, pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={headerIconButtonClass}
        aria-label={t(locale, 'language')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
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
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18" />
          <path d="M12 3a14 14 0 0 0 0 18" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[11.5rem] overflow-hidden border border-black/10 bg-white py-1 shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_40px_-20px_rgba(0,0,0,0.35)]"
        >
          {OPTIONS.map((option) => {
            const active = option.locale === locale;
            return (
              <Link
                key={option.locale}
                role="menuitem"
                href={hrefFor(option.locale, pathname, search)}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition hover:bg-black/[0.04] ${
                  active ? 'text-foreground' : 'text-muted hover:text-foreground'
                }`}
                onClick={() => setOpen(false)}
              >
                <span>{t(locale, option.labelKey)}</span>
                {active ? (
                  <svg
                    className="h-4 w-4 text-accent"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
