import { AdminAuditService, auditAreaFor } from './admin-audit.service';

describe('AdminAuditService', () => {
  it('snapshots the admin name and email with the action', async () => {
    const saved: unknown[] = [];
    const service = new AdminAuditService(
      {
        create: (value: unknown) => value,
        save: async (value: unknown) => {
          saved.push(value);
          return value;
        },
      } as never,
      {} as never,
    );

    await service.record(
      {
        id: 'admin-1',
        firstName: 'Nimal',
        lastName: 'Perera',
        email: 'nimal@example.com',
      } as never,
      'listing.approve',
      'listing',
      'listing-9',
      'ok',
    );

    expect(saved).toEqual([
      {
        actorUserId: 'admin-1',
        actorName: 'Nimal Perera',
        actorEmail: 'nimal@example.com',
        action: 'listing.approve',
        entityType: 'listing',
        entityId: 'listing-9',
        note: 'ok',
      },
    ]);
  });

  it('fills the admin name from the user record when older rows have none', async () => {
    const row = {
      id: 'log-1',
      actorUserId: 'admin-1',
      actorName: null,
      actorEmail: null,
      action: 'dealer.approve',
      entityType: 'dealer',
      entityId: 'dealer-1',
      note: null,
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
    };
    const logQuery = {
      orderBy: () => logQuery,
      skip: () => logQuery,
      take: () => logQuery,
      getManyAndCount: async () => [[row], 1],
    };
    const userQuery = {
      select: () => userQuery,
      where: () => userQuery,
      getMany: async () => [
        {
          id: 'admin-1',
          firstName: 'Ayesha',
          lastName: 'Fernando',
          email: 'ayesha@example.com',
        },
      ],
    };
    const service = new AdminAuditService(
      { createQueryBuilder: () => logQuery } as never,
      { createQueryBuilder: () => userQuery } as never,
    );

    const result = await service.list({ page: 1, limit: 30 });

    expect(result.items[0]).toMatchObject({
      actorName: 'Ayesha Fernando',
      actorEmail: 'ayesha@example.com',
      action: 'dealer.approve',
    });
    expect(result.meta.total).toBe(1);
  });

  it('groups each record into the admin section it belongs to', () => {
    expect(auditAreaFor('listing')).toBe('listings');
    expect(auditAreaFor('dealer')).toBe('listings');
    expect(auditAreaFor('part_listing')).toBe('parts');
    expect(auditAreaFor('parts_dealer')).toBe('parts');
    expect(auditAreaFor('part_category')).toBe('parts');
    expect(auditAreaFor('brand')).toBe('taxonomy');
    expect(auditAreaFor('model')).toBe('taxonomy');
    expect(auditAreaFor('promo_placement')).toBe('promotions');
    expect(auditAreaFor('promo_request')).toBe('promotions');
    expect(auditAreaFor('promo_package')).toBe('monetize');
    expect(auditAreaFor('promo_settings')).toBe('monetize');
    expect(auditAreaFor('user')).toBe('users');
  });

  it('deletes audit rows older than 90 days', async () => {
    const now = new Date('2026-10-06T00:00:00.000Z');
    let cutoff: Date | undefined;
    const query = {
      delete: () => query,
      where: (_sql: string, params: { cutoff: Date }) => {
        cutoff = params.cutoff;
        return query;
      },
      execute: async () => ({ affected: 4 }),
    };
    const service = new AdminAuditService(
      { createQueryBuilder: () => query } as never,
      {} as never,
    );

    await expect(service.purgeOlderThan(now)).resolves.toBe(4);
    expect(cutoff?.toISOString()).toBe('2026-07-08T00:00:00.000Z');
  });
});
