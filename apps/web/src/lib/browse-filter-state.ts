import type { BrowseFilterState } from '@/components/browse-filters';

function spStr(
  sp: Record<string, string | string[] | undefined>,
  key: string,
) {
  const v = sp[key];
  return typeof v === 'string' ? v : undefined;
}

export function browseFilterState(
  sp: Record<string, string | string[] | undefined>,
): BrowseFilterState {
  return {
    q: spStr(sp, 'q'),
    brandId: spStr(sp, 'brandId'),
    modelId: spStr(sp, 'modelId'),
    categoryId: spStr(sp, 'categoryId'),
    districtId: spStr(sp, 'districtId'),
    cityId: spStr(sp, 'cityId'),
    minPrice: spStr(sp, 'minPrice'),
    maxPrice: spStr(sp, 'maxPrice'),
    minYear: spStr(sp, 'minYear'),
    maxYear: spStr(sp, 'maxYear'),
    minRegistrationYear: spStr(sp, 'minRegistrationYear'),
    maxRegistrationYear: spStr(sp, 'maxRegistrationYear'),
    minMileage: spStr(sp, 'minMileage'),
    maxMileage: spStr(sp, 'maxMileage'),
    minEngineCc: spStr(sp, 'minEngineCc'),
    maxEngineCc: spStr(sp, 'maxEngineCc'),
    condition: spStr(sp, 'condition'),
    fuelType: spStr(sp, 'fuelType'),
    transmission: spStr(sp, 'transmission'),
    sellerType: spStr(sp, 'sellerType'),
    featured: spStr(sp, 'featured'),
    negotiable: spStr(sp, 'negotiable'),
    sort: spStr(sp, 'sort'),
  };
}
