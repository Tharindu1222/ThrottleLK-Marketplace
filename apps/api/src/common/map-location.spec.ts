import { resolveMapLocation } from './map-location';

describe('resolveMapLocation', () => {
  it('keeps an exact pin when both coordinates are set', () => {
    expect(
      resolveMapLocation({
        latitude: 6.04,
        longitude: 80.75,
        district: { name: 'Colombo' },
      }),
    ).toEqual({
      latitude: 6.04,
      longitude: 80.75,
      approximate: false,
    });
  });

  it('falls back to the district center when the shop has no pin', () => {
    const loc = resolveMapLocation({
      latitude: null,
      longitude: null,
      district: { name: 'Colombo' },
    });
    expect(loc?.approximate).toBe(true);
    expect(loc?.latitude).toBeCloseTo(6.9271, 3);
    expect(loc?.longitude).toBeCloseTo(79.8612, 3);
  });

  it('returns null when there is no pin and no known district', () => {
    expect(
      resolveMapLocation({
        latitude: null,
        longitude: null,
        district: null,
      }),
    ).toBeNull();
  });
});
