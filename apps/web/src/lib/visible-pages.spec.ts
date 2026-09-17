import { visiblePageNumbers, pageRange } from './visible-pages';

describe('visiblePageNumbers', () => {
  it('lists every page when the total is small', () => {
    expect(visiblePageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('inserts ellipsis for large totals', () => {
    expect(visiblePageNumbers(10, 85)).toEqual([
      1,
      'ellipsis',
      8,
      9,
      10,
      11,
      12,
      'ellipsis',
      85,
    ]);
  });
});

describe('pageRange', () => {
  it('describes the current slice', () => {
    expect(pageRange(3, 20, 327)).toEqual({ from: 41, to: 60 });
  });
});
