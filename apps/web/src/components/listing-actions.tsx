'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import {
  getCompareItems,
  toggleCompare,
  type CompareItem,
} from '@/lib/compare';
import { t, type Locale } from '@/lib/i18n';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? '0' : '1.75'}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16.5 3.5c-1.74 0-3.41.81-4.5 2.09A6.03 6.03 0 0 0 7.5 3.5 5.5 5.5 0 0 0 2 9c0 6.16 8.5 11.5 10 11.5S22 15.16 22 9a5.5 5.5 0 0 0-5.5-5.5z" />
    </svg>
  );
}

function CompareIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h7M4 12h10M4 18h7" />
      <path
        d={active ? 'M16 8l4 4-4 4M20 12H10' : 'M14 8l4 4-4 4'}
        strokeWidth={active ? '2' : '1.75'}
      />
    </svg>
  );
}

export function ListingActions({
  locale,
  listing,
}: {
  locale: Locale;
  listing: { id: string; slug: string; title: string };
}) {
  const [token, setToken] = useState<string | null>(null);
  const [favourited, setFavourited] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    setInCompare(getCompareItems().some((c) => c.id === listing.id));
    if (!access) return;
    void apiGet<string[]>('/api/v1/favourites/ids', { token: access })
      .then((ids) => setFavourited(ids.includes(listing.id)))
      .catch(() => undefined);
  }, [listing.id]);

  async function onFavourite() {
    if (!token) {
      window.location.href = `/${locale}/login`;
      return;
    }
    setMessage(null);
    try {
      if (favourited) {
        await apiSend(`/api/v1/favourites/${listing.id}`, {
          method: 'DELETE',
          token,
        });
        setFavourited(false);
      } else {
        await apiSend(`/api/v1/favourites/${listing.id}`, { token });
        setFavourited(true);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    }
  }

  function onCompare() {
    const item: CompareItem = {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
    };
    const result = toggleCompare(item);
    setInCompare(result.items.some((c) => c.id === listing.id));
    if (result.full) {
      setMessage(t(locale, 'compareFull'));
    } else {
      setMessage(null);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => void onFavourite()}
          aria-pressed={favourited}
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
            favourited
              ? 'border-accent bg-accent/5 text-accent'
              : 'border-black/15 bg-white text-foreground hover:border-accent hover:text-accent'
          }`}
        >
          <HeartIcon filled={favourited} />
          <span className="whitespace-nowrap">
            {favourited ? t(locale, 'unfavourite') : t(locale, 'favourite')}
          </span>
        </button>
        <button
          type="button"
          onClick={onCompare}
          aria-pressed={inCompare}
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${
            inCompare
              ? 'border-accent bg-accent/5 text-accent'
              : 'border-black/15 bg-white text-foreground hover:border-accent hover:text-accent'
          }`}
        >
          <CompareIcon active={inCompare} />
          <span className="whitespace-nowrap">
            {inCompare ? t(locale, 'removeCompare') : t(locale, 'addCompare')}
          </span>
        </button>
      </div>
      {message ? (
        <p className="max-w-[16rem] text-right text-xs text-muted">{message}</p>
      ) : null}
    </div>
  );
}
