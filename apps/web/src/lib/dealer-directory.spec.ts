import {
  dealerTypeQuery,
  mergeDealerCards,
  paginateDealerCards,
  parseDealerDirectoryType,
} from './dealer-directory';

const bike = {
  id: 'b1',
  name: 'Island Motors',
  slug: 'island-motors',
  address: null,
  coverImageUrl: null,
};
const parts = {
  id: 'p1',
  name: 'A1 Spares',
  slug: 'a1-spares',
  address: null,
  coverImageUrl: null,
};

describe('parseDealerDirectoryType', () => {
  it('defaults to all so bike and parts show together', () => {
    expect(parseDealerDirectoryType(undefined)).toBe('all');
    expect(parseDealerDirectoryType('bike')).toBe('bike');
    expect(parseDealerDirectoryType('parts')).toBe('parts');
  });
});

describe('mergeDealerCards', () => {
  it('tags and sorts bike and parts dealers together', () => {
    const merged = mergeDealerCards([bike], [parts]);
    expect(merged.map((row) => row.slug)).toEqual(['a1-spares', 'island-motors']);
    expect(merged[0]?.kind).toBe('parts');
    expect(merged[1]?.kind).toBe('bike');
  });
});

describe('paginateDealerCards', () => {
  it('pages a combined list', () => {
    const items = mergeDealerCards(
      [bike, { ...bike, id: 'b2', name: 'Zulu Bikes', slug: 'zulu' }],
      [parts],
    );
    const first = paginateDealerCards(items, 1, 2);
    expect(first.data).toHaveLength(2);
    expect(first.meta.total).toBe(3);
    expect(first.meta.hasNextPage).toBe(true);
  });
});

describe('dealerTypeQuery', () => {
  it('omits type from the all-dealers URL', () => {
    expect(dealerTypeQuery('all')).toBeUndefined();
    expect(dealerTypeQuery('bike')).toBe('bike');
  });
});
