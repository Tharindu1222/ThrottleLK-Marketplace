import { composeListingTitle } from './listing-title';

describe('composeListingTitle', () => {
  it('joins brand, model, and year', () => {
    expect(
      composeListingTitle({
        title: 'honda',
        brandName: 'Honda',
        modelName: 'CBR600RR',
        manufactureYear: 2015,
      }),
    ).toBe('Honda CBR600RR 2015');
  });

  it('does not duplicate brand when the model already includes it', () => {
    expect(
      composeListingTitle({
        brandName: 'Honda',
        modelName: 'Honda Activa',
        manufactureYear: 2021,
      }),
    ).toBe('Honda Activa 2021');
  });

  it('does not duplicate year when it is already in the name', () => {
    expect(
      composeListingTitle({
        brandName: 'BMW Motorrad',
        modelName: 'S 1000 R 2026',
        manufactureYear: 2026,
      }),
    ).toBe('BMW Motorrad S 1000 R 2026');
  });

  it('falls back to stored title plus year', () => {
    expect(
      composeListingTitle({
        title: 'honda',
        manufactureYear: 2015,
      }),
    ).toBe('honda 2015');
  });
});
