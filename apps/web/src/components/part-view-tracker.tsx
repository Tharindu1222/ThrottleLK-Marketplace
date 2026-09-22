'use client';

import { useEffect, useRef } from 'react';
import { apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export function PartViewTracker({ partListingId }: { partListingId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const token = getAccessToken() ?? undefined;
    void apiSend(`/api/v1/part-listings/${partListingId}/views`, {
      method: 'POST',
      token,
    }).catch(() => undefined);
  }, [partListingId]);

  return null;
}
