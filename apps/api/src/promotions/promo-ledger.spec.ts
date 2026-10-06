import {
  promoMoneyBucket,
  promoMoneyChannel,
  promoMonetizeEventAt,
  summarizePromoLedger,
  type PromoLedgerInput,
} from './promo-ledger';

function row(partial: Partial<PromoLedgerInput>): PromoLedgerInput {
  return {
    id: 'r1',
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    paidAt: new Date('2026-09-02T10:00:00.000Z'),
    status: 'approved',
    paymentStatus: 'paid',
    paymentProvider: 'payhere',
    subjectType: 'bike',
    partKind: null,
    amountLkr: 1000,
    packageName: 'Featured',
    durationDays: 7,
    sellerId: 'u1',
    sellerName: 'Nimal Perera',
    sellerEmail: 'nimal@example.com',
    listingTitle: 'Honda Dio',
    placementEndsAt: null,
    updatedAt: null,
    ...partial,
  };
}

describe('promo money classification', () => {
  it('splits bikes, spare parts, and modifications', () => {
    expect(promoMoneyChannel('bike', null)).toBe('bike');
    expect(promoMoneyChannel('part', 'spare')).toBe('spare');
    expect(promoMoneyChannel('part', null)).toBe('spare');
    expect(promoMoneyChannel('part', 'modified')).toBe('modification');
  });

  it('counts only approved paid rows as collected', () => {
    expect(
      promoMoneyBucket({ status: 'approved', paymentStatus: 'paid' }),
    ).toBe('collected');
    expect(
      promoMoneyBucket({ status: 'pending', paymentStatus: 'unpaid' }),
    ).toBe('pending');
    expect(
      promoMoneyBucket({ status: 'rejected', paymentStatus: 'unpaid' }),
    ).toBe('rejected');
    expect(
      promoMoneyBucket({ status: 'pending', paymentStatus: 'chargedback' }),
    ).toBe('chargeback');
    expect(
      promoMoneyBucket({ status: 'pending', paymentStatus: 'failed' }),
    ).toBe('failed');
  });
});

describe('summarizePromoLedger', () => {
  const now = new Date('2026-09-30T12:00:00.000Z');

  it('sums collected balance by channel and leaves pending out of the balance', () => {
    const summary = summarizePromoLedger(
      [
        row({ id: 'bike', amountLkr: 2000, paymentProvider: 'bank' }),
        row({
          id: 'spare',
          subjectType: 'part',
          partKind: 'spare',
          amountLkr: 500,
          sellerId: 'u2',
          sellerName: 'Kamal',
          sellerEmail: 'kamal@example.com',
          listingTitle: 'Chain kit',
          packageName: 'Boost',
        }),
        row({
          id: 'mod',
          subjectType: 'part',
          partKind: 'modified',
          amountLkr: 1500,
          sellerId: 'u1',
          listingTitle: 'Exhaust',
          placementEndsAt: new Date('2026-10-10T00:00:00.000Z'),
        }),
        row({
          id: 'wait',
          status: 'pending',
          paymentStatus: 'unpaid',
          paidAt: null,
          amountLkr: 9000,
        }),
      ],
      now,
      'all',
    );

    expect(summary.collected.totalLkr).toBe(4000);
    expect(summary.collected.count).toBe(3);
    expect(summary.collected.bikeLkr).toBe(2000);
    expect(summary.collected.spareLkr).toBe(500);
    expect(summary.collected.modificationLkr).toBe(1500);
    expect(summary.collected.bankLkr).toBe(2000);
    expect(summary.collected.payhereLkr).toBe(2000);
    expect(summary.collected.liveCount).toBe(1);
    expect(summary.collected.liveLkr).toBe(1500);
    expect(summary.pending).toEqual({ totalLkr: 9000, count: 1 });
    expect(summary.users[0]).toMatchObject({
      sellerId: 'u1',
      count: 2,
      totalLkr: 3500,
    });
    expect(summary.packages.map((pkg) => pkg.name)).toEqual([
      'Featured',
      'Boost',
    ]);
  });

  it('keeps older collected payments out of the current Colombo month', () => {
    const summary = summarizePromoLedger(
      [
        row({
          id: 'old',
          paidAt: new Date('2026-08-31T18:00:00.000Z'),
          amountLkr: 5000,
        }),
        row({
          id: 'new',
          paidAt: new Date('2026-08-31T18:30:00.000Z'),
          amountLkr: 700,
        }),
      ],
      now,
      'month',
    );
    expect(summary.collected.totalLkr).toBe(700);
    expect(summary.collected.count).toBe(1);
  });

  it('keeps failed PayHere payments out of pending', () => {
    const summary = summarizePromoLedger(
      [
        row({
          id: 'dead',
          status: 'pending',
          paymentStatus: 'failed',
          paidAt: null,
          amountLkr: 800,
        }),
        row({
          id: 'wait',
          status: 'pending',
          paymentStatus: 'unpaid',
          paidAt: null,
          amountLkr: 100,
        }),
      ],
      now,
      'all',
    );
    expect(summary.failed).toEqual({ totalLkr: 800, count: 1 });
    expect(summary.pending).toEqual({ totalLkr: 100, count: 1 });
    expect(summary.chargebacks.count).toBe(0);
  });

  it('places a paid promotion in the month it was paid, before approval', () => {
    const summary = summarizePromoLedger(
      [
        row({
          id: 'late',
          status: 'pending',
          paymentStatus: 'paid',
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          paidAt: new Date('2026-09-02T10:00:00.000Z'),
          amountLkr: 1500,
        }),
      ],
      now,
      'month',
    );
    expect(promoMonetizeEventAt({
      paymentStatus: 'paid',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      paidAt: new Date('2026-09-02T10:00:00.000Z'),
      updatedAt: null,
    }).toISOString()).toBe('2026-09-02T10:00:00.000Z');
    expect(summary.collected.totalLkr).toBe(0);
    expect(summary.pending).toEqual({ totalLkr: 1500, count: 1 });
  });

  it('shows a chargeback in the month it was reversed', () => {
    const summary = summarizePromoLedger(
      [
        row({
          id: 'cb',
          status: 'approved',
          paymentStatus: 'chargedback',
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          paidAt: new Date('2026-08-02T00:00:00.000Z'),
          updatedAt: new Date('2026-09-10T00:00:00.000Z'),
          amountLkr: 2200,
        }),
      ],
      now,
      'month',
    );
    expect(summary.collected.totalLkr).toBe(0);
    expect(summary.chargebacks).toEqual({ totalLkr: 2200, count: 1 });
  });
});
