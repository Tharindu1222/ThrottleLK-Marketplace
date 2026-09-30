'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { t, type Locale } from '@/lib/i18n';

export function HomeHeroSearch({
  locale,
  districts,
}: {
  locale: Locale;
  districts: { id: string; name: string }[];
}) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const q = String(data.get('q') ?? '').trim();
    const districtId = String(data.get('districtId') ?? '').trim();
    if (q) params.set('q', q);
    if (districtId) params.set('districtId', districtId);
    const query = params.toString();
    router.push(query ? `/${locale}/bikes?${query}` : `/${locale}/bikes`);
  }

  return (
    <form
      action={`/${locale}/bikes`}
      method="get"
      role="search"
      onSubmit={onSubmit}
      className="relative z-20 order-2 min-w-0 w-full rounded-2xl bg-white p-1.5 shadow-[0_22px_48px_-20px_rgba(0,0,0,0.65)] lg:order-3 lg:col-span-2"
    >
      <div className="flex min-w-0 flex-col sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f4f4] text-black/45"
          >
            <SearchIcon />
          </span>
          <div className="min-w-0 flex-1">
            <label
              htmlFor="hero-bike-search"
              className="block text-xs font-medium text-black/50"
            >
              {t(locale, 'homeHeroSearchLabel')}
            </label>
            <input
              id="hero-bike-search"
              name="q"
              type="search"
              placeholder={t(locale, 'homeHeroSearchHint')}
              autoComplete="off"
              className="mt-0.5 w-full bg-transparent text-[15px] text-black outline-none placeholder:text-black/35"
            />
          </div>
        </div>

        {districts.length > 0 ? (
          <div className="flex min-w-0 items-center gap-3 border-t border-black/8 px-3 py-2.5 sm:w-[16rem] sm:max-w-[16rem] sm:border-t-0 sm:border-l">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f4f4] text-black/45"
            >
              <PinIcon />
            </span>
            <div className="min-w-0 flex-1">
              <label
                htmlFor="hero-district"
                className="block text-xs font-medium text-black/50"
              >
                {t(locale, 'homeHeroLocationLabel')}
              </label>
              <select
                id="hero-district"
                name="districtId"
                defaultValue=""
                className="mt-0.5 w-full min-w-0 max-w-full bg-transparent text-[15px] text-black outline-none"
              >
                <option value="">{t(locale, 'homeAllSriLanka')}</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition hover:brightness-110 sm:self-center sm:px-7"
        >
          <SearchIcon className="h-4 w-4 text-white" />
          {t(locale, 'search')}
        </button>
      </div>
    </form>
  );
}

function SearchIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.2" />
    </svg>
  );
}
