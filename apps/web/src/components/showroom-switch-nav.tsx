'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import {
  ownedDealerHref,
  pickOwnedDealer,
  type OwnedDealer,
} from '@/lib/owned-dealer';

export function ShowroomSwitchNav({ locale }: { locale: Locale }) {
  const [bike, setBike] = useState<OwnedDealer | null>(null);
  const [parts, setParts] = useState<OwnedDealer | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;
    void Promise.all([
      apiGet<OwnedDealer[]>('/api/v1/dealers/mine', { token }),
      apiGet<OwnedDealer[]>('/api/v1/parts-dealers/mine', { token }),
    ])
      .then(([bikes, partsShops]) => {
        if (cancelled) return;
        setBike(pickOwnedDealer(bikes));
        setParts(pickOwnedDealer(partsShops));
      })
      .catch(() => {
        if (cancelled) return;
        setBike(null);
        setParts(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!bike && !parts) return null;

  const buttonClass =
    'inline-flex max-w-full items-center justify-center rounded-md bg-[#0a0a0a] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-accent';

  return (
    <nav aria-label={t(locale, 'viewShowroom')} className="mt-4 flex min-w-0 flex-wrap gap-2">
      {bike ? (
        <Link href={ownedDealerHref(locale, 'bike', bike)} className={buttonClass}>
          {t(locale, 'viewDealerShowrooms')} →
        </Link>
      ) : null}
      {parts ? (
        <Link href={ownedDealerHref(locale, 'parts', parts)} className={buttonClass}>
          {t(locale, 'viewPartsShowrooms')} →
        </Link>
      ) : null}
    </nav>
  );
}
