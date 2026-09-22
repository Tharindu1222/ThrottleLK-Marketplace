import { PartListingsService } from './part-listings.service';

describe('PartListingsService admin', () => {
  function buildService(overrides: Record<string, unknown> = {}) {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [
        [
          {
            id: 'pl-1',
            title: 'Brake pads',
            kind: 'spare',
            status: 'active',
            priceLkr: 5000,
            updatedAt: new Date(),
            partsDealer: { id: 'pd-1', name: 'Parts Co', slug: 'parts-co' },
          },
        ],
        1,
      ]),
    };
    const partListings = {
      createQueryBuilder: jest.fn(() => qb),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'pl-new', ...x })),
      softRemove: jest.fn(async () => undefined),
      findOne: jest.fn(async () => ({
        id: 'pl-1',
        title: 'Brake pads',
        status: 'draft',
        partsDealerId: 'pd-1',
      })),
      ...((overrides.partListings as object) ?? {}),
    };
    // partListings, fitments, inquiries, listingImages, engagementEvents,
    // favourites, bikeListings, brands, models, partsDealersService, notifications, cache
    const service = new PartListingsService(
      partListings as never,
      { find: jest.fn(), delete: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { find: jest.fn() } as never,
      { find: jest.fn() } as never,
      { find: jest.fn() } as never,
      { find: jest.fn() } as never,
      { findOne: jest.fn() } as never,
      { find: jest.fn() } as never,
      { find: jest.fn() } as never,
      { findActiveOwned: jest.fn(), findById: jest.fn() } as never,
      { partListingPendingReview: jest.fn() } as never,
      { invalidateDashboard: jest.fn() } as never,
    );
    (service as unknown as { coverUrlsByListingId: Function }).coverUrlsByListingId =
      jest.fn(async () => new Map([['pl-1', 'https://cdn/x.jpg']]));
    (service as unknown as { allocateSlug: Function }).allocateSlug = jest.fn(
      async () => 'brake-pads-abc',
    );
    (service as unknown as { validateFitments: Function }).validateFitments =
      jest.fn(async () => undefined);
    (service as unknown as { replaceFitments: Function }).replaceFitments =
      jest.fn(async () => undefined);
    (service as unknown as { getById: Function }).getById = jest.fn(async () => ({
      id: 'pl-1',
      title: 'Brake pads',
      status: 'draft',
      partsDealerId: 'pd-1',
      publishedAt: null,
      soldAt: null,
      rejectionReason: null,
    }));
    return { service, partListings, qb };
  }

  it('listAllAdmin filters by partsDealerId and returns coverImageUrl', async () => {
    const { service, qb } = buildService();
    const result = await service.listAllAdmin({ partsDealerId: 'pd-1' });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'l.partsDealerId = :partsDealerId',
      { partsDealerId: 'pd-1' },
    );
    expect(result.items[0].coverImageUrl).toBe('https://cdn/x.jpg');
    expect(result.meta.total).toBe(1);
  });

  it('adminCreate sets partsDealerId and status', async () => {
    const { service, partListings } = buildService();
    await service.adminCreate({
      partsDealerId: 'pd-1',
      kind: 'spare',
      categoryId: '00000000-0000-4000-8000-000000000001',
      districtId: '00000000-0000-4000-8000-000000000002',
      cityId: '00000000-0000-4000-8000-000000000003',
      title: 'Brake pads set',
      description: 'OEM style brake pads for multiple models here.',
      priceLkr: 5000,
      negotiable: true,
      condition: 'new',
      phone: '0771234567',
      fitments: [{ brandId: '00000000-0000-4000-8000-000000000004' }],
      status: 'active',
    });
    expect(partListings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        partsDealerId: 'pd-1',
        status: 'active',
        publishedAt: expect.any(Date),
      }),
    );
  });

  it('adminDelete soft-removes the listing', async () => {
    const { service, partListings } = buildService();
    const result = await service.adminDelete('pl-1');
    expect(partListings.softRemove).toHaveBeenCalled();
    expect(result).toEqual({ id: 'pl-1', deleted: true });
  });
});
