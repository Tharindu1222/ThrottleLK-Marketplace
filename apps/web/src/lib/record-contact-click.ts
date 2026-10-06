import { apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

/** Fire-and-forget contact click for phone or WhatsApp (does not block navigation). */
export function recordContactClick(
  listingId: string,
  type: 'phone' | 'whatsapp',
  subject: 'bike' | 'part' = 'bike',
) {
  const token = getAccessToken() ?? undefined;
  const path =
    subject === 'part'
      ? `/api/v1/part-listings/${listingId}/contact-clicks`
      : `/api/v1/listings/${listingId}/contact-clicks`;
  void apiSend(path, {
    method: 'POST',
    body: { type },
    token,
  }).catch(() => undefined);
}
