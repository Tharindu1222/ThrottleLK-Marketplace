import type { DataSource } from 'typeorm';
import {
  promoMonetizeRangeStart,
  type MonetizeRange,
  type PromoMoneyBucket,
  type PromoMoneyChannel,
} from './promo-ledger';

const LEDGER_BUCKETS = [
  'collected',
  'pending',
  'rejected',
  'chargeback',
  'failed',
] as const;
const LEDGER_CHANNELS = ['bike', 'spare', 'modification'] as const;

export type MonetizeBucketFilter = 'all' | PromoMoneyBucket;
export type MonetizeChannelFilter = 'all' | PromoMoneyChannel;

export type MonetizeRequestQuery = {
  range?: string;
  page?: string;
  limit?: string;
  bucket?: string;
  channel?: string;
  q?: string;
  listingQ?: string;
};

export type ParsedMonetizeQuery = {
  range: MonetizeRange;
  page: number;
  limit: number;
  bucket: MonetizeBucketFilter;
  channel: MonetizeChannelFilter;
  q: string;
  listingQ: string;
};

type SummaryJson = {
  collected?: {
    totalLkr?: unknown;
    count?: unknown;
    bikeLkr?: unknown;
    spareLkr?: unknown;
    modificationLkr?: unknown;
    payhereLkr?: unknown;
    bankLkr?: unknown;
    liveCount?: unknown;
    liveLkr?: unknown;
  };
  pending?: { totalLkr?: unknown; count?: unknown };
  rejected?: { totalLkr?: unknown; count?: unknown };
  chargebacks?: { totalLkr?: unknown; count?: unknown };
  failed?: { totalLkr?: unknown; count?: unknown };
};

type PackageJson = { name?: unknown; count?: unknown; totalLkr?: unknown };
type UserJson = {
  sellerId?: unknown;
  name?: unknown;
  email?: unknown;
  count?: unknown;
  totalLkr?: unknown;
  lastPaidAt?: unknown;
};
type TransactionJson = {
  id?: unknown;
  at?: unknown;
  bucket?: unknown;
  channel?: unknown;
  amountLkr?: unknown;
  packageName?: unknown;
  durationDays?: unknown;
  paymentProvider?: unknown;
  paymentStatus?: unknown;
  sellerId?: unknown;
  sellerName?: unknown;
  sellerEmail?: unknown;
  listingTitle?: unknown;
  live?: unknown;
};

function asInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function asIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function asJson<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (value == null) return fallback;
  return value as T;
}

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 1_000_000);
}

function parseLimit(raw: string | undefined): number {
  if (raw == null || raw.trim() === '') return 25;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 25;
  return Math.min(50, Math.max(1, n));
}

export function parseMonetizeQuery(
  query: MonetizeRequestQuery,
): ParsedMonetizeQuery {
  const range: MonetizeRange =
    query.range === 'month' || query.range === '30d' ? query.range : 'all';
  const bucket: MonetizeBucketFilter = LEDGER_BUCKETS.includes(
    query.bucket as PromoMoneyBucket,
  )
    ? (query.bucket as PromoMoneyBucket)
    : 'all';
  const channel: MonetizeChannelFilter = LEDGER_CHANNELS.includes(
    query.channel as PromoMoneyChannel,
  )
    ? (query.channel as PromoMoneyChannel)
    : 'all';
  return {
    range,
    page: parsePage(query.page),
    limit: parseLimit(query.limit),
    bucket,
    channel,
    q: (query.q ?? '').trim().slice(0, 80),
    listingQ: (query.listingQ ?? '').trim().slice(0, 80),
  };
}

function likeContains(q: string): string | null {
  if (!q) return null;
  const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  return `%${escaped}%`;
}

const MONETIZE_SQL = `
WITH classified AS (
  SELECT
    r.id,
    r.seller_id,
    COALESCE(
      NULLIF(
        TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))),
        ''
      ),
      'Seller'
    ) AS seller_name,
    COALESCE(u.email, '') AS seller_email,
    COALESCE(listing.title, part.title, 'Listing') AS listing_title,
    COALESCE(pkg.name, 'Package') AS package_name,
    COALESCE(pkg.duration_days, 0)::int AS duration_days,
    r.payment_provider,
    r.payment_status,
    GREATEST(
      0,
      ROUND(COALESCE(r.charged_price_lkr, pkg.price_lkr, 0)::numeric)
    )::int AS amount_lkr,
    CASE
      WHEN r.payment_status = 'chargedback' THEN 'chargeback'
      WHEN r.payment_status = 'failed' THEN 'failed'
      WHEN r.status = 'approved' AND r.payment_status = 'paid' THEN 'collected'
      WHEN r.status = 'rejected' THEN 'rejected'
      ELSE 'pending'
    END AS bucket,
    CASE
      WHEN r.subject_type = 'bike' THEN 'bike'
      WHEN part.kind = 'modified' THEN 'modification'
      ELSE 'spare'
    END AS channel,
    CASE
      WHEN r.payment_status = 'chargedback'
      THEN COALESCE(r.updated_at, r.paid_at, r.created_at)
      WHEN r.payment_status = 'paid' AND r.paid_at IS NOT NULL
      THEN r.paid_at
      ELSE r.created_at
    END AS event_at,
    CASE
      WHEN r.status = 'approved'
        AND r.payment_status = 'paid'
        AND EXISTS (
          SELECT 1
          FROM homepage_placements hp
          WHERE hp.request_id = r.id
            AND hp.ends_at > $1::timestamptz
        )
      THEN TRUE
      ELSE FALSE
    END AS live
  FROM promo_requests r
  LEFT JOIN promo_packages pkg ON pkg.id = r.package_id
  LEFT JOIN users u ON u.id = r.seller_id
  LEFT JOIN listings listing ON listing.id = r.listing_id
  LEFT JOIN part_listings part ON part.id = r.part_listing_id
  WHERE (
    $2::timestamptz IS NULL
    OR (
      r.payment_status = 'chargedback'
      AND COALESCE(r.updated_at, r.paid_at, r.created_at) >= $2
    )
    OR (
      r.payment_status = 'paid'
      AND COALESCE(r.paid_at, r.created_at) >= $2
    )
    OR (
      r.payment_status NOT IN ('paid', 'chargedback')
      AND r.created_at >= $2
    )
  )
),
filtered AS (
  SELECT *
  FROM classified
  WHERE ($3::text = 'all' OR bucket = $3)
    AND ($4::text = 'all' OR channel = $4)
    AND (
      $5::text IS NULL
      OR seller_name ILIKE $5 ESCAPE '\\'
      OR seller_email ILIKE $5 ESCAPE '\\'
      OR listing_title ILIKE $5 ESCAPE '\\'
      OR package_name ILIKE $5 ESCAPE '\\'
    )
)
SELECT
  (
    SELECT json_build_object(
      'collected', json_build_object(
        'totalLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected'), 0),
        'count', COUNT(*) FILTER (WHERE bucket = 'collected'),
        'bikeLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected' AND channel = 'bike'), 0),
        'spareLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected' AND channel = 'spare'), 0),
        'modificationLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected' AND channel = 'modification'), 0),
        'payhereLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected' AND payment_provider = 'payhere'), 0),
        'bankLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected' AND payment_provider = 'bank'), 0),
        'liveCount', COUNT(*) FILTER (WHERE bucket = 'collected' AND live),
        'liveLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected' AND live), 0)
      ),
      'pending', json_build_object(
        'totalLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'pending'), 0),
        'count', COUNT(*) FILTER (WHERE bucket = 'pending')
      ),
      'rejected', json_build_object(
        'totalLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'rejected'), 0),
        'count', COUNT(*) FILTER (WHERE bucket = 'rejected')
      ),
      'failed', json_build_object(
        'totalLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'failed'), 0),
        'count', COUNT(*) FILTER (WHERE bucket = 'failed')
      ),
      'chargebacks', json_build_object(
        'totalLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'chargeback'), 0),
        'count', COUNT(*) FILTER (WHERE bucket = 'chargeback')
      )
    )
    FROM classified
  ) AS summary,
  (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'name', name,
          'count', count,
          'totalLkr', total_lkr
        )
        ORDER BY total_lkr DESC, name ASC
      ),
      '[]'::json
    )
    FROM (
      SELECT
        package_name AS name,
        COUNT(*)::int AS count,
        SUM(amount_lkr)::int AS total_lkr
      FROM classified
      WHERE bucket = 'collected'
      GROUP BY package_name
    ) pkgs
  ) AS packages,
  (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'sellerId', seller_id,
          'name', name,
          'email', email,
          'count', count,
          'totalLkr', total_lkr,
          'lastPaidAt', last_paid_at
        )
        ORDER BY total_lkr DESC, seller_id ASC
      ),
      '[]'::json
    )
    FROM (
      SELECT
        seller_id,
        MAX(seller_name) AS name,
        MAX(seller_email) AS email,
        COUNT(*)::int AS count,
        SUM(amount_lkr)::int AS total_lkr,
        MAX(event_at) AS last_paid_at
      FROM classified
      WHERE bucket = 'collected'
      GROUP BY seller_id
      ORDER BY SUM(amount_lkr) DESC, seller_id ASC
      LIMIT 20
    ) sellers
  ) AS users,
  (SELECT COUNT(*)::int FROM filtered) AS "transactionCount",
  (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'id', id,
          'at', event_at,
          'bucket', bucket,
          'channel', channel,
          'amountLkr', amount_lkr,
          'packageName', package_name,
          'durationDays', duration_days,
          'paymentProvider', payment_provider,
          'paymentStatus', payment_status,
          'sellerId', seller_id,
          'sellerName', seller_name,
          'sellerEmail', seller_email,
          'listingTitle', listing_title,
          'live', live
        )
        ORDER BY event_at DESC, id DESC
      ),
      '[]'::json
    )
    FROM (
      SELECT *
      FROM filtered
      ORDER BY event_at DESC, id DESC
      LIMIT $6 OFFSET $7
    ) page_rows
  ) AS transactions
`;

function moneyPair(value: { totalLkr?: unknown; count?: unknown } | undefined) {
  return {
    totalLkr: asInt(value?.totalLkr),
    count: asInt(value?.count),
  };
}

function mapTransaction(row: TransactionJson) {
  const bucket = LEDGER_BUCKETS.includes(row.bucket as PromoMoneyBucket)
    ? (row.bucket as PromoMoneyBucket)
    : 'pending';
  const channel = LEDGER_CHANNELS.includes(row.channel as PromoMoneyChannel)
    ? (row.channel as PromoMoneyChannel)
    : 'spare';
  const provider =
    row.paymentProvider === 'payhere' || row.paymentProvider === 'bank'
      ? row.paymentProvider
      : null;
  return {
    id: String(row.id ?? ''),
    at: asIso(row.at) ?? new Date(0).toISOString(),
    bucket,
    channel,
    amountLkr: asInt(row.amountLkr),
    packageName: String(row.packageName ?? 'Package'),
    durationDays: asInt(row.durationDays),
    paymentProvider: provider,
    paymentStatus: String(row.paymentStatus ?? ''),
    sellerId: String(row.sellerId ?? ''),
    sellerName: String(row.sellerName ?? 'Seller'),
    sellerEmail: String(row.sellerEmail ?? ''),
    listingTitle: String(row.listingTitle ?? 'Listing'),
    live: row.live === true,
  };
}

export async function queryPromoMonetize(
  dataSource: DataSource,
  query: ParsedMonetizeQuery,
  now: Date,
) {
  const start = promoMonetizeRangeStart(query.range, now);
  const offset = (query.page - 1) * query.limit;
  const rows = await dataSource.query(MONETIZE_SQL, [
    now,
    start,
    query.bucket,
    query.channel,
    likeContains(query.q),
    query.limit,
    offset,
  ]);
  const row = (Array.isArray(rows) ? rows[0] : null) as
    | {
        summary?: unknown;
        packages?: unknown;
        users?: unknown;
        transactionCount?: unknown;
        transactions?: unknown;
      }
    | undefined;
  const summary = asJson<SummaryJson>(row?.summary, {});
  const collected = summary.collected ?? {};
  const packages = asJson<PackageJson[]>(row?.packages, []).map((pkg) => ({
    name: String(pkg.name ?? 'Package'),
    count: asInt(pkg.count),
    totalLkr: asInt(pkg.totalLkr),
  }));
  const users = asJson<UserJson[]>(row?.users, []).map((user) => ({
    sellerId: String(user.sellerId ?? ''),
    name: String(user.name ?? 'Seller'),
    email: String(user.email ?? ''),
    count: asInt(user.count),
    totalLkr: asInt(user.totalLkr),
    lastPaidAt: asIso(user.lastPaidAt),
  }));
  const transactions = asJson<TransactionJson[]>(row?.transactions, []).map(
    mapTransaction,
  );
  const transactionCount = asInt(row?.transactionCount);
  const pageCount =
    transactionCount === 0 ? 0 : Math.ceil(transactionCount / query.limit);

  return {
    currency: 'LKR' as const,
    range: query.range,
    collected: {
      totalLkr: asInt(collected.totalLkr),
      count: asInt(collected.count),
      bikeLkr: asInt(collected.bikeLkr),
      spareLkr: asInt(collected.spareLkr),
      modificationLkr: asInt(collected.modificationLkr),
      payhereLkr: asInt(collected.payhereLkr),
      bankLkr: asInt(collected.bankLkr),
      liveCount: asInt(collected.liveCount),
      liveLkr: asInt(collected.liveLkr),
    },
    pending: moneyPair(summary.pending),
    rejected: moneyPair(summary.rejected),
    chargebacks: moneyPair(summary.chargebacks),
    failed: moneyPair(summary.failed),
    packages,
    users,
    page: query.page,
    limit: query.limit,
    transactionCount,
    pageCount,
    transactions,
  };
}
