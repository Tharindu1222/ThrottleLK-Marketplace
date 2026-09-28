const FACET_KEYS = [
  'q',
  'brandId',
  'modelId',
  'categoryId',
  'districtId',
  'cityId',
  'minPrice',
  'maxPrice',
  'minYear',
  'maxYear',
  'minRegistrationYear',
  'maxRegistrationYear',
  'condition',
  'fuelType',
  'transmission',
  'minMileage',
  'maxMileage',
  'minEngineCc',
  'maxEngineCc',
  'sellerType',
  'featured',
  'negotiable',
  'sort',
] as const;

export function isFacetedSearch(
  searchParams: Record<string, string | string[] | undefined>,
): boolean {
  return FACET_KEYS.some((key) => {
    const value = searchParams[key];
    if (Array.isArray(value)) return value.some((item) => item.trim() !== '');
    return typeof value === 'string' && value.trim() !== '';
  });
}

export function browseCanonicalPath(
  locale: string,
  page = 1,
): string {
  const base = `/${locale}/bikes`;
  return page > 1 ? `${base}?page=${page}` : base;
}
