import { listingActiveDays } from './listing-expiry';

type RowQuery = (sql: string, params?: unknown[]) => Promise<unknown>;

/** TypeORM returns `[rows, rowCount]` for UPDATE and a row array for SELECT. */
function updateRows<T>(result: unknown): T[] {
  if (!Array.isArray(result)) return [];
  if (
    result.length === 2 &&
    Array.isArray(result[0]) &&
    typeof result[1] === 'number'
  ) {
    return result[0] as T[];
  }
  return result as T[];
}

const TABLES = {
  listings: 'listings',
  part_listings: 'part_listings',
} as const;

export async function expireActiveRows(input: {
  query: RowQuery;
  table: keyof typeof TABLES;
  lockKey: number;
  now?: Date;
}): Promise<{
  expired: Array<{ id: string; sellerId: string; title: string }>;
  backfilled: number;
}> {
  const now = input.now ?? new Date();
  const lockRows = (await input.query(
    `SELECT pg_try_advisory_lock($1) AS locked`,
    [input.lockKey],
  )) as Array<{ locked?: boolean | string }>;
  const locked = lockRows?.[0]?.locked;
  if (locked !== true && locked !== 't') {
    return { expired: [], backfilled: 0 };
  }

  const table = TABLES[input.table];
  try {
    const backfilled = updateRows<{ id: string }>(
      await input.query(
        `UPDATE ${table}
         SET expires_at = COALESCE(published_at, created_at, $2) + ($1 * INTERVAL '1 day')
         WHERE status = 'active' AND expires_at IS NULL
         RETURNING id`,
        [listingActiveDays(), now],
      ),
    );
    const expired = updateRows<{ id: string; sellerId: string; title: string }>(
      await input.query(
        `UPDATE ${table}
         SET status = 'expired'
         WHERE status = 'active' AND expires_at <= $1
         RETURNING id, seller_id AS "sellerId", title`,
        [now],
      ),
    );
    return {
      expired,
      backfilled: backfilled.length,
    };
  } finally {
    await input.query(`SELECT pg_advisory_unlock($1)`, [input.lockKey]);
  }
}
