import {
  paginationMeta,
  parsePageLimit,
} from './pagination';

describe('parsePageLimit', () => {
  it.each([
    [{}, { page: 1, limit: 20, skip: 0 }],
    [{ page: '2', limit: '10' }, { page: 2, limit: 10, skip: 10 }],
    [{ page: '0', limit: '0' }, { page: 1, limit: 1, skip: 0 }],
    [{ page: '-3', limit: '500' }, { page: 1, limit: 100, skip: 0 }],
    [{ page: 'abc', limit: 'nope' }, { page: 1, limit: 20, skip: 0 }],
  ])('parses %j', (input, expected) => {
    expect(parsePageLimit(input)).toEqual(expected);
  });
});

describe('paginationMeta', () => {
  it('describes an empty result set', () => {
    expect(paginationMeta(0, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('flags next and previous pages', () => {
    expect(paginationMeta(45, 2, 20)).toMatchObject({
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });
});
