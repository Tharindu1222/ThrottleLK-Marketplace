export type MonetizeRange = 'all' | 'month' | '30d';
export type PromoMoneyChannel = 'bike' | 'spare' | 'modification';
export type PromoMoneyBucket =
  | 'collected'
  | 'pending'
  | 'rejected'
  | 'chargeback'
  | 'failed';

export type PromoLedgerInput = {
  id: string;
  createdAt: Date;
  paidAt: Date | null;
  updatedAt: Date | null;
  status: 'pending' | 'approved' | 'rejected';
  paymentStatus: 'unpaid' | 'paid' | 'failed' | 'chargedback';
  paymentProvider: 'payhere' | 'bank' | null;
  subjectType: 'bike' | 'part';
  partKind: 'spare' | 'modified' | null;
  amountLkr: number;
  packageName: string;
  durationDays: number;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  listingTitle: string;
  placementEndsAt: Date | null;
};

const TRANSACTION_LIMIT = 400;
export const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Start of the monetize window. `null` means all time. Month starts at 00:00 Asia/Colombo. */
export function promoMonetizeRangeStart(
  range: MonetizeRange,
  now: Date,
): Date | null {
  if (range === 'all') return null;
  if (range === '30d') return new Date(now.getTime() - 30 * 86_400_000);
  const colombo = new Date(now.getTime() + COLOMBO_OFFSET_MS);
  return new Date(
    Date.UTC(colombo.getUTCFullYear(), colombo.getUTCMonth(), 1) -
      COLOMBO_OFFSET_MS,
  );
}

export function promoMoneyChannel(
  subjectType: string,
  partKind: string | null,
): PromoMoneyChannel {
  if (subjectType === 'bike') return 'bike';
  if (partKind === 'modified') return 'modification';
  return 'spare';
}

export function promoMoneyBucket(row: {
  status: PromoLedgerInput['status'];
  paymentStatus: PromoLedgerInput['paymentStatus'];
}): PromoMoneyBucket {
  if (row.paymentStatus === 'chargedback') return 'chargeback';
  if (row.paymentStatus === 'failed') return 'failed';
  if (row.status === 'approved' && row.paymentStatus === 'paid') {
    return 'collected';
  }
  if (row.status === 'rejected') return 'rejected';
  return 'pending';
}

/** When a row belongs in a monetize window. Paid money uses paid_at even before approval. Chargebacks use the reversal time. */
export function promoMonetizeEventAt(row: {
  paymentStatus: PromoLedgerInput['paymentStatus'];
  createdAt: Date;
  paidAt: Date | null;
  updatedAt: Date | null;
}): Date {
  if (row.paymentStatus === 'chargedback') {
    return row.updatedAt ?? row.paidAt ?? row.createdAt;
  }
  if (row.paymentStatus === 'paid' && row.paidAt) return row.paidAt;
  return row.createdAt;
}

function eventAt(row: PromoLedgerInput): Date {
  return promoMonetizeEventAt(row);
}

function inRange(at: Date, start: Date | null): boolean {
  return start == null || at.getTime() >= start.getTime();
}

export function summarizePromoLedger(
  rows: PromoLedgerInput[],
  now: Date,
  range: MonetizeRange,
) {
  const start = promoMonetizeRangeStart(range, now);
  const collected = {
    totalLkr: 0,
    count: 0,
    bikeLkr: 0,
    spareLkr: 0,
    modificationLkr: 0,
    payhereLkr: 0,
    bankLkr: 0,
    liveCount: 0,
    liveLkr: 0,
  };
  const pending = { totalLkr: 0, count: 0 };
  const rejected = { totalLkr: 0, count: 0 };
  const chargebacks = { totalLkr: 0, count: 0 };
  const failed = { totalLkr: 0, count: 0 };
  const packageMap = new Map<string, { count: number; totalLkr: number }>();
  const userMap = new Map<
    string,
    {
      sellerId: string;
      name: string;
      email: string;
      count: number;
      totalLkr: number;
      lastPaidAt: string | null;
    }
  >();
  const transactions: Array<{
    id: string;
    at: string;
    bucket: PromoMoneyBucket;
    channel: PromoMoneyChannel;
    amountLkr: number;
    packageName: string;
    durationDays: number;
    paymentProvider: PromoLedgerInput['paymentProvider'];
    paymentStatus: PromoLedgerInput['paymentStatus'];
    sellerId: string;
    sellerName: string;
    sellerEmail: string;
    listingTitle: string;
    live: boolean;
  }> = [];

  for (const row of rows) {
    const bucket = promoMoneyBucket(row);
    const at = eventAt(row);
    if (!inRange(at, start)) continue;
    const amount = Math.max(0, Math.round(row.amountLkr || 0));
    const channel = promoMoneyChannel(row.subjectType, row.partKind);
    const live =
      bucket === 'collected' &&
      row.placementEndsAt != null &&
      row.placementEndsAt.getTime() > now.getTime();

    if (bucket === 'collected') {
      collected.totalLkr += amount;
      collected.count += 1;
      if (channel === 'bike') collected.bikeLkr += amount;
      else if (channel === 'modification') collected.modificationLkr += amount;
      else collected.spareLkr += amount;
      if (row.paymentProvider === 'payhere') collected.payhereLkr += amount;
      else if (row.paymentProvider === 'bank') collected.bankLkr += amount;
      if (live) {
        collected.liveCount += 1;
        collected.liveLkr += amount;
      }
      const pkg = packageMap.get(row.packageName) ?? { count: 0, totalLkr: 0 };
      pkg.count += 1;
      pkg.totalLkr += amount;
      packageMap.set(row.packageName, pkg);
      const user = userMap.get(row.sellerId) ?? {
        sellerId: row.sellerId,
        name: row.sellerName,
        email: row.sellerEmail,
        count: 0,
        totalLkr: 0,
        lastPaidAt: null,
      };
      user.count += 1;
      user.totalLkr += amount;
      const iso = at.toISOString();
      if (!user.lastPaidAt || iso > user.lastPaidAt) user.lastPaidAt = iso;
      userMap.set(row.sellerId, user);
    } else if (bucket === 'pending') {
      pending.totalLkr += amount;
      pending.count += 1;
    } else if (bucket === 'rejected') {
      rejected.totalLkr += amount;
      rejected.count += 1;
    } else if (bucket === 'failed') {
      failed.totalLkr += amount;
      failed.count += 1;
    } else {
      chargebacks.totalLkr += amount;
      chargebacks.count += 1;
    }

    transactions.push({
      id: row.id,
      at: at.toISOString(),
      bucket,
      channel,
      amountLkr: amount,
      packageName: row.packageName,
      durationDays: row.durationDays,
      paymentProvider: row.paymentProvider,
      paymentStatus: row.paymentStatus,
      sellerId: row.sellerId,
      sellerName: row.sellerName,
      sellerEmail: row.sellerEmail,
      listingTitle: row.listingTitle,
      live,
    });
  }

  transactions.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const transactionCount = transactions.length;

  return {
    currency: 'LKR' as const,
    range,
    collected,
    pending,
    rejected,
    chargebacks,
    failed,
    packages: [...packageMap.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.totalLkr - a.totalLkr),
    users: [...userMap.values()].sort((a, b) => b.totalLkr - a.totalLkr),
    transactionCount,
    transactionsTruncated: transactionCount > TRANSACTION_LIMIT,
    transactions: transactions.slice(0, TRANSACTION_LIMIT),
  };
}
