import { describeAdminMutation } from './describe-admin-audit';

describe('describeAdminMutation', () => {
  it('ignores reads', () => {
    expect(
      describeAdminMutation({
        method: 'GET',
        routePath: '/api/v1/admin/audit-logs',
      }),
    ).toBeNull();
  });

  it('describes an approve route and keeps the existing action name', () => {
    expect(
      describeAdminMutation({
        method: 'POST',
        routePath: '/api/v1/admin/listings/:id/approve',
        params: { id: 'listing-1' },
      }),
    ).toEqual({
      action: 'listing.approve',
      entityType: 'listing',
      entityId: 'listing-1',
      note: null,
    });
  });

  it('stores a rejection reason and the target id', () => {
    expect(
      describeAdminMutation({
        method: 'POST',
        routePath: '/admin/dealers/:id/reject',
        params: { id: 'dealer-1' },
        body: { reason: 'Incomplete shop profile' },
      }),
    ).toEqual({
      action: 'dealer.reject',
      entityType: 'dealer',
      entityId: 'dealer-1',
      note: 'Incomplete shop profile',
    });
  });

  it('uses the created record id and omits passwords', () => {
    expect(
      describeAdminMutation({
        method: 'POST',
        routePath: '/api/v1/admin/users',
        body: {
          firstName: 'Nimal',
          email: 'nimal@example.com',
          password: 'secret-value',
        },
        response: { success: true, data: { id: 'user-9' } },
      }),
    ).toEqual({
      action: 'user.create',
      entityType: 'user',
      entityId: 'user-9',
      note: 'firstName=Nimal, email=nimal@example.com',
    });
  });

  it('keeps the report decision and the admin note', () => {
    expect(
      describeAdminMutation({
        method: 'POST',
        routePath: '/api/v1/admin/reports/:id/resolve',
        params: { id: 'report-1' },
        body: { action: 'remove_listing', note: 'Fake photos' },
      }),
    ).toEqual({
      action: 'report.resolve',
      entityType: 'report',
      entityId: 'report-1',
      note: 'remove_listing: Fake photos',
    });
  });

  it('logs image removal against the parent record', () => {
    expect(
      describeAdminMutation({
        method: 'DELETE',
        routePath: '/api/v1/admin/part-listings/:id/images/:imageId',
        params: { id: 'part-1', imageId: 'img-2' },
      }),
    ).toEqual({
      action: 'part_listing.image.delete',
      entityType: 'part_listing',
      entityId: 'part-1',
      note: 'image img-2',
    });
  });

  it('covers promotion reviews', () => {
    expect(
      describeAdminMutation({
        method: 'POST',
        routePath: '/api/v1/admin/promotions/requests/:id/approve',
        params: { id: 'req-1' },
      }),
    ).toEqual({
      action: 'promo_request.approve',
      entityType: 'promo_request',
      entityId: 'req-1',
      note: null,
    });
  });

  it('covers taxonomy, shops, and placement changes', () => {
    expect(
      describeAdminMutation({
        method: 'POST',
        routePath: '/api/v1/admin/brands',
        body: { name: 'Yamaha' },
        response: { data: { id: 'brand-1' } },
      })?.action,
    ).toBe('brand.create');
    expect(
      describeAdminMutation({
        method: 'PATCH',
        routePath: '/api/v1/admin/promotions/settings',
        body: { currency: 'LKR' },
      }),
    ).toMatchObject({
      action: 'promo_settings.update',
      entityId: null,
      note: 'currency=LKR',
    });
    expect(
      describeAdminMutation({
        method: 'POST',
        routePath: '/api/v1/admin/promotions/placements/:id/end',
        params: { id: 'place-1' },
      })?.action,
    ).toBe('promo_placement.end');
    expect(
      describeAdminMutation({
        method: 'PATCH',
        routePath: '/api/v1/admin/users/:id/status',
        params: { id: 'user-1' },
        body: { status: 'suspended' },
      }),
    ).toMatchObject({ action: 'user.status', note: 'status=suspended' });
  });

  it('ignores routes that are not admin mutations', () => {
    expect(
      describeAdminMutation({
        method: 'POST',
        routePath: '/api/v1/promotions/checkout',
      }),
    ).toBeNull();
  });

  it('names the changed record and covers every admin section', () => {
    expect(
      describeAdminMutation({
        method: 'PATCH',
        routePath: '/api/v1/admin/listings/:id',
        params: { id: 'listing-1' },
        body: { priceLkr: 450000 },
        response: { data: { id: 'listing-1', title: 'Honda CB 350' } },
      }),
    ).toMatchObject({
      action: 'listing.update',
      entityType: 'listing',
      note: 'Honda CB 350; priceLkr=450000',
    });
    expect(
      describeAdminMutation({
        method: 'PATCH',
        routePath: '/api/v1/admin/part-listings/:id',
        params: { id: 'part-1' },
        body: { status: 'paused' },
      })?.action,
    ).toBe('part_listing.update');
    expect(
      describeAdminMutation({
        method: 'POST',
        routePath: '/api/v1/admin/part-categories',
        body: { name: 'Brake pads' },
        response: { data: { id: 'cat-1', name: 'Brake pads' } },
      })?.action,
    ).toBe('part_category.create');
    expect(
      describeAdminMutation({
        method: 'POST',
        routePath: '/api/v1/admin/models',
        body: { name: 'CB 350' },
      })?.action,
    ).toBe('model.create');
    expect(
      describeAdminMutation({
        method: 'PATCH',
        routePath: '/api/v1/admin/promotions/packages/:id',
        params: { id: 'pkg-1' },
        body: { priceLkr: 2500 },
      })?.action,
    ).toBe('promo_package.update');
    expect(
      describeAdminMutation({
        method: 'PATCH',
        routePath: '/api/v1/admin/users/:id',
        params: { id: 'user-2' },
        body: { firstName: 'Kamal' },
        response: { data: { id: 'user-2', firstName: 'Kamal', lastName: 'Silva' } },
      }),
    ).toMatchObject({
      action: 'user.update',
      note: 'Kamal Silva; firstName=Kamal',
    });
  });
});
