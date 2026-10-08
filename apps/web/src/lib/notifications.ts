import type { Locale } from './i18n';
import { partListingBase } from './part-kind';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  dataJson?: {
    slug?: string;
    conversationId?: string;
    listingId?: string;
    dealerId?: string;
    partsDealerId?: string;
    partListingId?: string;
    kind?: string;
  } | null;
};

export function notificationHref(
  locale: Locale,
  n: AppNotification,
): string | null {
  const data = n.dataJson;
  if (n.type === 'listing_pending_review') {
    return `/${locale}/admin/moderation?queue=listings`;
  }
  if (n.type === 'part_listing_pending_review') {
    return `/${locale}/admin/moderation?queue=part-listings`;
  }
  if (n.type === 'dealer_pending_review') {
    return `/${locale}/admin/moderation?queue=dealers`;
  }
  if (n.type === 'parts_dealer_pending_review') {
    return `/${locale}/admin/moderation?queue=parts-dealers`;
  }
  if (n.type === 'part_listing_approved' && data?.slug) {
    return `/${locale}/${partListingBase(data.kind ?? '')}/${data.slug}`;
  }
  if (n.type === 'part_listing_rejected' && data?.partListingId) {
    return `/${locale}/account/parts-listings/${data.partListingId}/edit`;
  }
  if (n.type === 'part_listing_expired' && data?.partListingId) {
    return `/${locale}/account/parts-listings/${data.partListingId}/edit`;
  }
  if (
    (n.type === 'part_listing_warning' ||
      n.type === 'part_listing_expiring_soon') &&
    data?.partListingId
  ) {
    return `/${locale}/account/parts-listings/${data.partListingId}/edit`;
  }
  if (
    (n.type === 'listing_warning' || n.type === 'listing_expiring_soon') &&
    data?.listingId
  ) {
    return `/${locale}/account/listings/${data.listingId}/edit`;
  }
  if (n.type === 'listing_rejected' && data?.listingId) {
    return `/${locale}/account/listings/${data.listingId}/edit`;
  }
  if (n.type === 'listing_expired' && data?.listingId) {
    return `/${locale}/account/listings/${data.listingId}/edit`;
  }
  if (
    (n.type === 'promo_approved' || n.type === 'promo_rejected') &&
    data?.partListingId
  ) {
    return `/${locale}/account/parts-listings/${data.partListingId}/promote`;
  }
  if (
    (n.type === 'promo_approved' || n.type === 'promo_rejected') &&
    data?.listingId
  ) {
    return `/${locale}/account/listings/${data.listingId}/promote`;
  }
  if (n.type === 'listing_inquiry' && data?.slug) {
    return `/${locale}/bikes/${data.slug}`;
  }
  if (n.type === 'listing_inquiry' && data?.listingId) {
    return `/${locale}/account/listings/${data.listingId}/edit`;
  }
  if (!data) return null;
  if (data.conversationId) {
    return `/${locale}/account/messages/${data.conversationId}`;
  }
  if (n.type.startsWith('parts_dealer_') && data.slug) {
    return `/${locale}/parts-dealers/${data.slug}`;
  }
  if (n.type.startsWith('parts_dealer_')) {
    return `/${locale}/parts-dealers/apply`;
  }
  if (n.type.startsWith('dealer_') && data.slug) {
    return `/${locale}/dealers/${data.slug}`;
  }
  if (n.type.startsWith('dealer_')) {
    return `/${locale}/dealers/apply`;
  }
  if (data.slug && (n.type.includes('part') || data.kind)) {
    return `/${locale}/${partListingBase(data.kind ?? '')}/${data.slug}`;
  }
  if (data.slug) {
    return `/${locale}/bikes/${data.slug}`;
  }
  return null;
}

export function formatNotificationWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
