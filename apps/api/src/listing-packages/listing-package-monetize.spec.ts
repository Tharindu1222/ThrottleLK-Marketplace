import { mapListingPackageMonetize } from './listing-package-monetize';

describe('listing package monetize', () => {
  it('maps bike and parts package sales', () => {
    const result = mapListingPackageMonetize({
      summary: {
        collected: {
          totalLkr: 3500,
          count: 3,
          bikeLkr: 2000,
          bikeCount: 2,
          bikeSlots: 12,
          partsLkr: 1500,
          partsCount: 1,
          partsSlots: 8,
        },
        pending: {
          totalLkr: 500,
          count: 1,
          bikeLkr: 0,
          bikeCount: 0,
          partsLkr: 500,
          partsCount: 1,
        },
        failed: { totalLkr: '0', count: 0 },
        chargebacks: { totalLkr: 200, count: 1 },
      },
      packages: [
        {
          id: 'pkg-bike',
          name: 'Dealer 10',
          audience: 'bike',
          count: 2,
          slots: 12,
          totalLkr: 2000,
          pendingCount: 0,
          pendingLkr: 0,
        },
        {
          id: 'pkg-parts',
          name: 'Shop 8',
          audience: 'parts',
          count: 1,
          slots: 8,
          totalLkr: 1500,
          pendingCount: 1,
          pendingLkr: 500,
        },
      ],
      users: [
        {
          sellerId: 'u1',
          name: 'Nimal Perera',
          email: 'nimal@example.com',
          count: 2,
          totalLkr: 2000,
          lastPaidAt: '2026-09-30T11:20:00.000Z',
        },
      ],
    });

    expect(result.collected.bikeLkr).toBe(2000);
    expect(result.collected.partsSlots).toBe(8);
    expect(result.packages.map((pkg) => pkg.audience)).toEqual([
      'bike',
      'parts',
    ]);
    expect(result.pending.partsLkr).toBe(500);
    expect(result.packages[1]?.pendingCount).toBe(1);
    expect(result.users[0]?.lastPaidAt).toBe('2026-09-30T11:20:00.000Z');
  });

  it('returns zeros when the query has no rows', () => {
    const result = mapListingPackageMonetize(null);
    expect(result.collected.totalLkr).toBe(0);
    expect(result.packages).toEqual([]);
    expect(result.users).toEqual([]);
    expect(result.exceptions).toEqual([]);
  });
});
