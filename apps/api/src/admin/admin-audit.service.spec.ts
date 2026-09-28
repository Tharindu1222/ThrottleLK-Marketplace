import { AdminAuditService } from './admin-audit.service';

describe('AdminAuditService', () => {
  it('stores the actor, action and entity', async () => {
    const saved: unknown[] = [];
    const service = new AdminAuditService({
      create: (value: unknown) => value,
      save: async (value: unknown) => {
        saved.push(value);
        return value;
      },
    } as never);

    await service.record(
      { id: 'admin-1' } as never,
      'listing.approve',
      'listing',
      'listing-9',
      'ok',
    );

    expect(saved).toEqual([
      {
        actorUserId: 'admin-1',
        action: 'listing.approve',
        entityType: 'listing',
        entityId: 'listing-9',
        note: 'ok',
      },
    ]);
  });
});
