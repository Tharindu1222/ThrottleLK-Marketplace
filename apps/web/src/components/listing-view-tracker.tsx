'use client';

import { useEffect, useRef } from 'react';
import { apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

/** Records one public listing view after mount (seller’s own views are ignored by API). */
export function ListingViewTracker({ listingId }: { listingId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const token = getAccessToken() ?? undefined;
    void apiSend(`/api/v1/listings/${listingId}/views`, {
      method: 'POST',
      token,
    }).catch(() => undefined);
  }, [listingId]);

  return null;
}
