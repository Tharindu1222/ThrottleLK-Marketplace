import type { DataSource } from 'typeorm';

export type ListingPackageAudience = 'bike' | 'parts';

export type ListingPackageMonetize = {
  collected: {
    totalLkr: number;
    count: number;
    bikeLkr: number;
    bikeCount: number;
    bikeSlots: number;
    partsLkr: number;
    partsCount: number;
    partsSlots: number;
  };
  pending: {
    totalLkr: number;
    count: number;
    bikeLkr: number;
    bikeCount: number;
    partsLkr: number;
    partsCount: number;
  };
  failed: { totalLkr: number; count: number };
  chargebacks: { totalLkr: number; count: number };
  packages: {
    id: string;
    name: string;
    audience: ListingPackageAudience;
    count: number;
    slots: number;
    totalLkr: number;
    pendingCount: number;
    pendingLkr: number;
  }[];
  users: {
    sellerId: string;
    name: string;
    email: string;
    count: number;
    totalLkr: number;
    lastPaidAt: string | null;
  }[];
  exceptions: {
    id: string;
    at: string;
    bucket: 'pending' | 'failed' | 'chargeback';
    audience: ListingPackageAudience;
    amountLkr: number;
    packageName: string;
    payhereOrderId: string;
    sellerName: string;
    sellerEmail: string;
  }[];
};

type MoneyJson = {
  totalLkr?: unknown;
  count?: unknown;
  bikeLkr?: unknown;
  bikeCount?: unknown;
  partsLkr?: unknown;
  partsCount?: unknown;
};
type CollectedJson = MoneyJson & {
  bikeLkr?: unknown;
  bikeCount?: unknown;
  bikeSlots?: unknown;
  partsLkr?: unknown;
  partsCount?: unknown;
  partsSlots?: unknown;
};
type SummaryJson = {
  collected?: CollectedJson;
  pending?: MoneyJson;
  failed?: MoneyJson;
  chargebacks?: MoneyJson;
};
type PackageJson = {
  id?: unknown;
  name?: unknown;
  audience?: unknown;
  count?: unknown;
  slots?: unknown;
  totalLkr?: unknown;
  pendingCount?: unknown;
  pendingLkr?: unknown;
};
type ExceptionJson = {
  id?: unknown;
  at?: unknown;
  bucket?: unknown;
  audience?: unknown;
  amountLkr?: unknown;
  packageName?: unknown;
  payhereOrderId?: unknown;
  sellerName?: unknown;
  sellerEmail?: unknown;
};
type UserJson = {
  sellerId?: unknown;
  name?: unknown;
  email?: unknown;
  count?: unknown;
  totalLkr?: unknown;
  lastPaidAt?: unknown;
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

function moneyPair(value: MoneyJson | undefined) {
  return {
    totalLkr: asInt(value?.totalLkr),
    count: asInt(value?.count),
  };
}

function pendingMoney(value: MoneyJson | undefined) {
  return {
    ...moneyPair(value),
    bikeLkr: asInt(value?.bikeLkr),
    bikeCount: asInt(value?.bikeCount),
    partsLkr: asInt(value?.partsLkr),
    partsCount: asInt(value?.partsCount),
  };
}

function audienceOf(value: unknown): ListingPackageAudience {
  return value === 'parts' ? 'parts' : 'bike';
}

function exceptionBucket(
  value: unknown,
): 'pending' | 'failed' | 'chargeback' {
  if (value === 'failed' || value === 'chargeback') return value;
  return 'pending';
}

function likeContains(q: string): string | null {
  if (!q) return null;
  const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  return `%${escaped}%`;
}

const LISTING_PACKAGE_SQL = `
WITH classified AS (
  SELECT
    o.id,
    o.payhere_order_id,
    o.seller_id,
    o.package_id,
    CASE WHEN o.audience = 'parts' THEN 'parts' ELSE 'bike' END AS audience,
    COALESCE(NULLIF(TRIM(pkg.name), ''), 'Package') AS package_name,
    COALESCE(
      NULLIF(
        TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))),
        ''
      ),
      'Seller'
    ) AS seller_name,
    COALESCE(u.email, '') AS seller_email,
    GREATEST(0, ROUND(COALESCE(o.charged_price_lkr, 0)::numeric))::int AS amount_lkr,
    GREATEST(0, COALESCE(o.listing_count, 0))::int AS slots,
    CASE
      WHEN o.status = 'chargedback' THEN 'chargeback'
      WHEN o.status = 'paid' THEN 'collected'
      WHEN o.status = 'failed' THEN 'failed'
      ELSE 'pending'
    END AS bucket,
    CASE
      WHEN o.status = 'chargedback' THEN COALESCE(o.updated_at, o.paid_at, o.created_at)
      WHEN o.status = 'paid' AND o.paid_at IS NOT NULL THEN o.paid_at
      ELSE o.created_at
    END AS event_at
  FROM listing_post_orders o
  LEFT JOIN listing_packages pkg ON pkg.id = o.package_id
  LEFT JOIN users u ON u.id = o.seller_id
  WHERE (
    $1::timestamptz IS NULL
    OR (
      o.status = 'chargedback'
      AND COALESCE(o.updated_at, o.paid_at, o.created_at) >= $1
    )
    OR (
      o.status = 'paid'
      AND COALESCE(o.paid_at, o.created_at) >= $1
    )
    OR (
      o.status NOT IN ('paid', 'chargedback')
      AND o.created_at >= $1
    )
  )
)
SELECT
  (
    SELECT json_build_object(
      'collected', json_build_object(
        'totalLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected'), 0),
        'count', COUNT(*) FILTER (WHERE bucket = 'collected'),
        'bikeLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected' AND audience = 'bike'), 0),
        'bikeCount', COUNT(*) FILTER (WHERE bucket = 'collected' AND audience = 'bike'),
        'bikeSlots', COALESCE(SUM(slots) FILTER (WHERE bucket = 'collected' AND audience = 'bike'), 0),
        'partsLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected' AND audience = 'parts'), 0),
        'partsCount', COUNT(*) FILTER (WHERE bucket = 'collected' AND audience = 'parts'),
        'partsSlots', COALESCE(SUM(slots) FILTER (WHERE bucket = 'collected' AND audience = 'parts'), 0)
      ),
      'pending', json_build_object(
        'totalLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'pending'), 0),
        'count', COUNT(*) FILTER (WHERE bucket = 'pending'),
        'bikeLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'pending' AND audience = 'bike'), 0),
        'bikeCount', COUNT(*) FILTER (WHERE bucket = 'pending' AND audience = 'bike'),
        'partsLkr', COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'pending' AND audience = 'parts'), 0),
        'partsCount', COUNT(*) FILTER (WHERE bucket = 'pending' AND audience = 'parts')
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
          'id', id,
          'name', name,
          'audience', audience,
          'count', count,
          'slots', slots,
          'totalLkr', total_lkr,
          'pendingCount', pending_count,
          'pendingLkr', pending_lkr
        )
        ORDER BY total_lkr DESC, pending_lkr DESC, name ASC
      ),
      '[]'::json
    )
    FROM (
      SELECT
        package_id::text AS id,
        package_name AS name,
        audience,
        COUNT(*) FILTER (WHERE bucket = 'collected')::int AS count,
        COALESCE(SUM(slots) FILTER (WHERE bucket = 'collected'), 0)::int AS slots,
        COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'collected'), 0)::int AS total_lkr,
        COUNT(*) FILTER (WHERE bucket = 'pending')::int AS pending_count,
        COALESCE(SUM(amount_lkr) FILTER (WHERE bucket = 'pending'), 0)::int AS pending_lkr
      FROM classified
      WHERE bucket IN ('collected', 'pending')
      GROUP BY package_id, package_name, audience
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
        AND (
          $2::text IS NULL
          OR seller_name ILIKE $2 ESCAPE '\\'
          OR seller_email ILIKE $2 ESCAPE '\\'
        )
      GROUP BY seller_id
      ORDER BY SUM(amount_lkr) DESC, seller_id ASC
      LIMIT 20
    ) sellers
  ) AS users,
  (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'id', id,
          'at', event_at,
          'bucket', bucket,
          'audience', audience,
          'amountLkr', amount_lkr,
          'packageName', package_name,
          'payhereOrderId', payhere_order_id,
          'sellerName', seller_name,
          'sellerEmail', seller_email
        )
        ORDER BY event_at DESC, id DESC
      ),
      '[]'::json
    )
    FROM (
      SELECT *
      FROM classified
      WHERE bucket IN ('pending', 'failed', 'chargeback')
        AND (
          $2::text IS NULL
          OR seller_name ILIKE $2 ESCAPE '\\'
          OR seller_email ILIKE $2 ESCAPE '\\'
          OR package_name ILIKE $2 ESCAPE '\\'
          OR payhere_order_id ILIKE $2 ESCAPE '\\'
        )
      ORDER BY event_at DESC, id DESC
      LIMIT 100
    ) open_rows
  ) AS exceptions
`;

export function mapListingPackageMonetize(row: {
  summary?: unknown;
  packages?: unknown;
  users?: unknown;
  exceptions?: unknown;
} | null | undefined): ListingPackageMonetize {
  const summary = asJson<SummaryJson>(row?.summary, {});
  const collected = summary.collected ?? {};
  return {
    collected: {
      totalLkr: asInt(collected.totalLkr),
      count: asInt(collected.count),
      bikeLkr: asInt(collected.bikeLkr),
      bikeCount: asInt(collected.bikeCount),
      bikeSlots: asInt(collected.bikeSlots),
      partsLkr: asInt(collected.partsLkr),
      partsCount: asInt(collected.partsCount),
      partsSlots: asInt(collected.partsSlots),
    },
    pending: pendingMoney(summary.pending),
    failed: moneyPair(summary.failed),
    chargebacks: moneyPair(summary.chargebacks),
    packages: asJson<PackageJson[]>(row?.packages, []).map((pkg) => ({
      id: String(pkg.id ?? ''),
      name: String(pkg.name ?? 'Package'),
      audience: audienceOf(pkg.audience),
      count: asInt(pkg.count),
      slots: asInt(pkg.slots),
      totalLkr: asInt(pkg.totalLkr),
      pendingCount: asInt(pkg.pendingCount),
      pendingLkr: asInt(pkg.pendingLkr),
    })),
    users: asJson<UserJson[]>(row?.users, []).map((user) => ({
      sellerId: String(user.sellerId ?? ''),
      name: String(user.name ?? 'Seller'),
      email: String(user.email ?? ''),
      count: asInt(user.count),
      totalLkr: asInt(user.totalLkr),
      lastPaidAt: asIso(user.lastPaidAt),
    })),
    exceptions: asJson<ExceptionJson[]>(row?.exceptions, []).map((order) => ({
      id: String(order.id ?? ''),
      at: asIso(order.at) ?? new Date(0).toISOString(),
      bucket: exceptionBucket(order.bucket),
      audience: audienceOf(order.audience),
      amountLkr: asInt(order.amountLkr),
      packageName: String(order.packageName ?? 'Package'),
      payhereOrderId: String(order.payhereOrderId ?? ''),
      sellerName: String(order.sellerName ?? 'Seller'),
      sellerEmail: String(order.sellerEmail ?? ''),
    })),
  };
}

export async function queryListingPackageMonetize(
  dataSource: DataSource,
  start: Date | null,
  q = '',
): Promise<ListingPackageMonetize> {
  const rows = await dataSource.query(LISTING_PACKAGE_SQL, [
    start,
    likeContains(q.trim().slice(0, 80)),
  ]);
  const row = (Array.isArray(rows) ? rows[0] : null) as
    | {
        summary?: unknown;
        packages?: unknown;
        users?: unknown;
        exceptions?: unknown;
      }
    | undefined;
  return mapListingPackageMonetize(row);
}
