import { savedSearchMatchesListing } from './saved-search-match';

const listing = {
  title: 'Honda Dio 2019',
  brandId: 'brand-honda',
  modelId: 'model-dio',
  categoryId: 'cat-scooter',
  districtId: 'dist-colombo',
  cityId: 'city-nugegoda',
  priceLkr: 350000,
  manufactureYear: 2019,
  condition: 'used',
  fuelType: 'petrol',
  transmission: 'automatic',
  mileage: 18000,
  engineCc: 110,
  dealerId: null,
  negotiable: true,
};

describe('savedSearchMatchesListing', () => {
  it('matches an empty query', () => {
    expect(savedSearchMatchesListing({}, listing)).toBe(true);
  });

  it('matches when brand, price band and keyword align', () => {
    expect(
      savedSearchMatchesListing(
        {
          brandId: 'brand-honda',
          minPrice: 200000,
          maxPrice: 400000,
          q: 'dio',
        },
        listing,
      ),
    ).toBe(true);
  });

  it('rejects a different brand or out-of-range price', () => {
    expect(
      savedSearchMatchesListing({ brandId: 'brand-yamaha' }, listing),
    ).toBe(false);
    expect(savedSearchMatchesListing({ maxPrice: 300000 }, listing)).toBe(
      false,
    );
  });

  it('filters by seller type, fuel and mileage', () => {
    expect(
      savedSearchMatchesListing({ sellerType: 'private', fuelType: 'petrol' }, listing),
    ).toBe(true);
    expect(savedSearchMatchesListing({ sellerType: 'dealer' }, listing)).toBe(
      false,
    );
    expect(savedSearchMatchesListing({ maxMileage: 10000 }, listing)).toBe(
      false,
    );
  });
});
