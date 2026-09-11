'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import {
  getCompareItems,
  toggleCompare,
  type CompareItem,
} from '@/lib/compare';
import { t, type Locale } from '@/lib/i18n';

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
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void onFavourite()}
        className="border border-white/20 px-4 py-2 text-sm hover:border-accent"
      >
        {favourited ? t(locale, 'unfavourite') : t(locale, 'favourite')}
      </button>
      <button
        type="button"
        onClick={onCompare}
        className="border border-white/20 px-4 py-2 text-sm hover:border-accent"
      >
        {inCompare ? t(locale, 'removeCompare') : t(locale, 'addCompare')}
      </button>
      <Link
        href={`/${locale}/compare`}
        className="text-sm text-accent underline"
      >
        {t(locale, 'compare')}
      </Link>
      {message ? <p className="w-full text-sm text-muted">{message}</p> : null}
    </div>
  );
}
