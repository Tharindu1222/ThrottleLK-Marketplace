import { expireActiveRows } from './expire-stale';

describe('expireActiveRows', () => {
  it('returns the bike seller when expiring listings', async () => {
    const sql: string[] = [];
    const expired = await expireActiveRows({
      table: 'listings',
      lockKey: 1,
      query: async (statement) => {
        sql.push(statement);
        if (statement.includes('pg_try_advisory_lock')) return [{ locked: true }];
        if (statement.includes('RETURNING')) {
          return [[{ id: 'listing-1', sellerId: 'seller-1', title: 'Honda' }], 1];
        }
        return [[], 0];
      },
    });

    expect(sql.some((statement) => statement.includes('seller_id AS "sellerId"'))).toBe(
      true,
    );
    expect(expired.expired).toEqual([
      { id: 'listing-1', sellerId: 'seller-1', title: 'Honda' },
    ]);
  });

  it('does not read seller_id from part listings', async () => {
    const sql: string[] = [];
    await expireActiveRows({
      table: 'part_listings',
      lockKey: 2,
      query: async (statement) => {
        sql.push(statement);
        if (statement.includes('pg_try_advisory_lock')) return [{ locked: true }];
        if (statement.includes('RETURNING')) {
          return [[{ id: 'part-1', title: 'Pads' }], 1];
        }
        return [[], 0];
      },
    });

    const returning = sql.find((statement) => statement.includes('RETURNING'));
    expect(returning).toBeDefined();
    expect(returning).not.toContain('seller_id');
  });
});
