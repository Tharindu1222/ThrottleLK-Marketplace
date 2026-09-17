export function sellerProfileHref(
  locale: string,
  seller: { id: string; dealerSlug?: string | null },
) {
  if (seller.dealerSlug) return `/${locale}/dealers/${seller.dealerSlug}`;
  return `/${locale}/sellers/${seller.id}`;
}
