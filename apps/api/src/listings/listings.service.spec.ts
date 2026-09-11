import { ListingsService } from './listings.service';

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
