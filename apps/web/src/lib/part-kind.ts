export function partListingBase(kind: string) {
  if (kind === 'modified') return 'modified-parts';
  if (kind === 'accessory') return 'rider-accessories';
  return 'spare-parts';
}

export function partListingHref(locale: string, kind: string, slug: string) {
  return `/${locale}/${partListingBase(kind)}/${slug}`;
}
