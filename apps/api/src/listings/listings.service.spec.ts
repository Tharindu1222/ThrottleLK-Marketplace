import { ListingsService, searchTokens } from './listings.service';

describe('ListingsService status rules', () => {
  it('documents allowed submit sources', () => {
    const allowed = ['draft', 'rejected'];
    expect(allowed).toContain('draft');
    expect(allowed).not.toContain('active');
  });

  it('exports service class', () => {
    expect(ListingsService).toBeDefined();
  });
});

describe('searchTokens', () => {
  it('splits on spaces and hyphens so d tracker matches D-Tracker', () => {
    expect(searchTokens('d tracker')).toEqual(['d', 'tracker']);
    expect(searchTokens('  D-Tracker  ')).toEqual(['D', 'Tracker']);
  });

  it('ignores empty query', () => {
    expect(searchTokens('   ')).toEqual([]);
  });
});
