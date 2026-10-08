import { NotificationsService } from './notifications.service';
import { Notification } from './notification.entity';
import { NotificationEmail } from './notification-email.entity';

function makeService(adminIds: string[]) {
  const rows = new Map<string, Notification>();
  const save = jest.fn(async (row: Record<string, unknown>) => ({
    id: 'n1',
    ...row,
  }));
  const create = jest.fn((row: Record<string, unknown>) => row);
  const users = {
    findByIdOrThrow: jest.fn(async (id: string) => ({
      id,
      email: `${id}@throttlelk.lk`,
    })),
    findActiveAdminIds: jest.fn(async () => adminIds),
  };
  let input: Record<string, unknown>;
  let data: string;
  const builder = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn(async () => {
      const key = String(input.eventKey);
      if (!rows.has(key)) {
        const row = {
          ...input,
          dataJson: JSON.parse(data),
        } as unknown as Notification;
        rows.set(key, row);
        await save(row as unknown as Record<string, unknown>);
      }
      return {};
    }),
  };
  builder.values.mockImplementation((value: Record<string, unknown>) => {
    input = value;
    return builder;
  });
  builder.setParameter.mockImplementation((_name: string, value: string) => {
    data = value;
    return builder;
  });
  const deliveries = { create, save: jest.fn(async (row: unknown) => row) };
  const repository = {
    createQueryBuilder: () => builder,
    findOneByOrFail: async ({ eventKey }: { eventKey: string }) =>
      rows.get(eventKey),
    manager: { transaction: jest.fn() },
  };
  const manager = {
    getRepository: (entity: unknown) =>
      entity === Notification
        ? repository
        : entity === NotificationEmail
          ? deliveries
          : {
              findOne: async ({ where }: { where: { id: string } }) =>
                users.findByIdOrThrow(where.id),
            },
  };
  repository.manager.transaction.mockImplementation(
    async (work: (tx: unknown) => Promise<unknown>) => {
      const snapshot = new Map(rows);
      try {
        return await work(manager);
      } catch (error) {
        rows.clear();
        for (const [key, row] of snapshot) rows.set(key, row);
        throw error;
      }
    },
  );
  const email = {
    sender: () => 'ThrottleLK <alerts@example.test>',
    send: jest.fn(async () => undefined),
  };
  const service = new NotificationsService(
    repository as never,
    users as never,
    email as never,
  );
  return {
    service,
    save,
    users,
    rows,
    deliveries,
    repository,
    manager,
    builder,
    email,
  };
}

describe('NotificationsService.listingPendingReview', () => {
  it('creates a listing_pending_review notification for every active admin', async () => {
    const { service, save, users } = makeService(['admin-1', 'admin-2']);

    await service.listingPendingReview({
      id: 'listing-1',
      title: 'BMW Motorrad S 1000 R 2026',
      slug: 'bmw-s-1000-r',
    });

    expect(users.findActiveAdminIds).toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls.map((call) => call[0].userId).sort()).toEqual([
      'admin-1',
      'admin-2',
    ]);
    expect(save.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        type: 'listing_pending_review',
        title: 'Listing pending review',
        dataJson: {
          listingId: 'listing-1',
          slug: 'bmw-s-1000-r',
        },
      }),
    );
  });

  it('creates no notifications when no admins exist', async () => {
    const { service, save } = makeService([]);

    await service.listingPendingReview({
      id: 'listing-1',
      title: 'Honda CBR',
      slug: 'honda-cbr',
    });

    expect(save).not.toHaveBeenCalled();
  });
});

describe('NotificationsService durable delivery', () => {
  it('queues email without sending it in the business request', async () => {
    const { service, deliveries, email } = makeService([]);
    await service.listingApproved('seller-1', {
      id: 'bike-1',
      title: 'Honda',
      slug: 'honda',
    });
    expect(deliveries.save).toHaveBeenCalledTimes(1);
    expect(email.send).not.toHaveBeenCalled();
  });
  it('retries transient persistence failures with one event identity', async () => {
    const { service, builder, rows, deliveries } = makeService([]);
    builder.execute.mockRejectedValueOnce(
      new Error('Temporary database failure'),
    );
    await service.listingApproved('seller-1', {
      id: 'bike-1',
      title: 'Honda',
      slug: 'honda',
    });
    expect(rows.size).toBe(1);
    expect(deliveries.save).toHaveBeenCalledTimes(1);
    expect(builder.values.mock.calls[0][0].eventKey).toBe(
      builder.values.mock.calls[1][0].eventKey,
    );
  });
  it('rolls back the notification when email-queue persistence fails', async () => {
    const { service, deliveries, repository, rows } = makeService([]);
    deliveries.save.mockRejectedValueOnce(new Error('Queue failure'));
    await expect(
      repository.manager.transaction((manager: never) =>
        service.notifyUser(
          {
            userId: 'seller-1',
            type: 'new_message',
            title: 'Message',
            message: 'Hello',
          },
          manager,
        ),
      ),
    ).rejects.toThrow('Queue failure');
    expect(rows.size).toBe(0);
  });
  it('deduplicates expiring reminders while allowing a reminder after renewal', async () => {
    const { service, rows, deliveries } = makeService([]);
    const listing = {
      id: 'bike-1',
      title: 'Honda',
      slug: 'honda',
      expiresAt: new Date('2026-10-20T00:00:00Z'),
    };
    await service.listingExpiringSoon('seller-1', listing);
    await service.listingExpiringSoon('seller-1', listing);
    expect(rows.size).toBe(1);
    expect(deliveries.save).toHaveBeenCalledTimes(1);
    await service.listingExpiringSoon('seller-1', {
      ...listing,
      expiresAt: new Date('2026-11-20T00:00:00Z'),
    });
    expect(rows.size).toBe(2);
  });
  it('preserves part identity in warnings', async () => {
    const { service } = makeService([]);
    expect(
      await service.partListingWarning(
        'seller-1',
        { id: 'part-1', title: 'Exhaust', slug: 'exhaust', kind: 'modified' },
        'Fix description',
      ),
    ).toMatchObject({
      type: 'part_listing_warning',
      dataJson: { partListingId: 'part-1', kind: 'modified' },
    });
  });
  it('describes Boost without promising homepage placement', async () => {
    const { service } = makeService([]);
    const row = await service.promoApproved('seller-1', {
      requestId: 'req-1',
      title: 'Honda',
      endsAt: new Date('2026-10-20T00:00:00Z'),
      listingId: 'bike-1',
      partListingId: null,
      tier: 'boost',
      surfaces: ['browse', 'detail'],
    });
    expect(row.message).not.toContain('homepage');
  });
});
