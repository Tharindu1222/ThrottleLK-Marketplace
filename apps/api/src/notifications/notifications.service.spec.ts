import { NotificationsService } from './notifications.service';

function makeService(adminIds: string[]) {
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
  const email = { send: jest.fn(async () => undefined) };
  const service = new NotificationsService(
    { save, create } as never,
    users as never,
    email as never,
  );
  return { service, save, users };
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
