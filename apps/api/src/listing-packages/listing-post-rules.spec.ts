import {
  bikeQuotaAudience,
  freeListingsFor,
  listingsRemaining,
  DEFAULT_FREE_QUOTA,
} from './listing-post-rules';

describe('listing quota rules', () => {
  it('gives 5 free listings to a normal user, 10 to a dealer, and 10 to parts', () => {
    expect(freeListingsFor('private', DEFAULT_FREE_QUOTA)).toBe(5);
    expect(freeListingsFor('dealer', DEFAULT_FREE_QUOTA)).toBe(10);
    expect(freeListingsFor('parts', DEFAULT_FREE_QUOTA)).toBe(10);
  });

  it('uses the dealer quota only after the seller has an active dealer shop', () => {
    expect(bikeQuotaAudience(false)).toBe('private');
    expect(bikeQuotaAudience(true)).toBe('dealer');
  });

  it('adds purchased listings on top of the free quota', () => {
    expect(listingsRemaining(5, 0, 4)).toBe(1);
    expect(listingsRemaining(5, 0, 5)).toBe(0);
    expect(listingsRemaining(10, 15, 10)).toBe(15);
    expect(listingsRemaining(10, 40, 12)).toBe(38);
  });
});
