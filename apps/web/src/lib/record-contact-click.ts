import { apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

/** Fire-and-forget contact click for phone or WhatsApp (does not block navigation). */
export function recordContactClick(
  listingId: string,
  type: 'phone' | 'whatsapp',
) {
  const token = getAccessToken() ?? undefined;
  void apiSend(`/api/v1/listings/${listingId}/contact-clicks`, {
    method: 'POST',
    body: { type },
    token,
  }).catch(() => undefined);
}
