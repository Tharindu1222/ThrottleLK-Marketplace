import {
  mapToPublicCategory,
  normalizeFuelType,
} from './category-map';

describe('category-map', () => {
  it('maps Commuter to Street Bikes', () => {
    expect(mapToPublicCategory('Commuter')).toBe('Street Bikes');
  });

  it('keeps Street Bikes', () => {
    expect(mapToPublicCategory('Street Bikes')).toBe('Street Bikes');
  });

  it('normalizes fuel types', () => {
    expect(normalizeFuelType('Petrol')).toBe('petrol');
    expect(normalizeFuelType('Electric')).toBe('electric');
    expect(normalizeFuelType(null)).toBeNull();
  });
});
