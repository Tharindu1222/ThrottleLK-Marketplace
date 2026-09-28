import { browseCanonicalPath, isFacetedSearch } from './search-index';

describe('faceted search index rules', () => {
  it('treats unfiltered browse as indexable', () => {
    expect(isFacetedSearch({})).toBe(false);
    expect(isFacetedSearch({ page: '2' })).toBe(false);
  });

  it('marks filter combinations as faceted', () => {
    expect(isFacetedSearch({ brandId: 'abc' })).toBe(true);
    expect(isFacetedSearch({ q: 'dio', sort: 'price_asc' })).toBe(true);
  });

  it('canonicalizes browse to locale path plus page only', () => {
    expect(browseCanonicalPath('si')).toBe('/si/bikes');
    expect(browseCanonicalPath('en', 3)).toBe('/en/bikes?page=3');
  });
});
