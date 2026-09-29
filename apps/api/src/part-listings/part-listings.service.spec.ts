import { PartListingsService } from './part-listings.service';

describe('PartListingsService.relatedForBikeListing', () => {
  it('matches fitments by the same brand and model', async () => {
    const bikeListings = {
      findOne: jest.fn(async () => ({
        id: 'bike-1',
        brandId: 'brand-1',
        modelId: 'model-1',
        status: 'active',
      })),
    };
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [
        {
          id: 'part-1',
          slug: 'brake-pads',
          kind: 'spare',
          title: 'Brake pads',
          priceLkr: 5000,
          condition: 'new',
          categoryId: 'cat-1',
          districtId: 'd-1',
          partsDealerId: 'pd-1',
          viewCount: 0,
          phoneClickCount: 0,
          whatsappClickCount: 0,
          soldPriceLkr: null,
          publishedAt: new Date(),
          createdAt: new Date(),
          category: { name: 'Brakes' },
          district: { name: 'Colombo' },
          city: { name: 'Colombo' },
          images: [],
        },
      ]),
    };
    const partListings = {
      createQueryBuilder: jest.fn(() => qb),
    };
    const listingImages = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => []),
      })),
    };
    const partsDealersService = {
      activeVerifiedIds: jest.fn(async () => new Set(['pd-1'])),
    };

    // partListings, fitments, inquiries, listingImages, engagementEvents,
    // favourites, bikeListings, brands, models, partsDealersService, notifications, cache
    const service = new PartListingsService(
      partListings as never,
      {} as never,
      {} as never,
      listingImages as never,
      {} as never,
      {} as never,
      bikeListings as never,
      {} as never,
      {} as never,
      partsDealersService as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
    );

    const items = await service.relatedForBikeListing('bike-1', {
      kind: 'spare',
      limit: 6,
    });

    expect(bikeListings.findOne).toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith('f.brand_id = :brandId', {
      brandId: 'brand-1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('f.model_id = :modelId', {
      modelId: 'model-1',
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'part-1',
      kind: 'spare',
    });
  });
});

describe('PartListingsService.remove', () => {
  it('soft-removes an owned listing', async () => {
    const listing = { id: 'pl-1', partsDealerId: 'pd-1' };
    const partListings = {
      findOne: jest.fn(async () => listing),
      softRemove: jest.fn(async () => undefined),
    };
    const partsDealersService = {
      assertOwnedActivePartsDealer: jest.fn(async () => undefined),
    };
    const cache = { invalidateDashboard: jest.fn() };
    const service = new PartListingsService(
      partListings as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      partsDealersService as never,
      {} as never,
      cache as never,
    );

    const result = await service.remove({ id: 'user-1' } as never, 'pl-1');

    expect(partsDealersService.assertOwnedActivePartsDealer).toHaveBeenCalledWith(
      'user-1',
      'pd-1',
    );
    expect(partListings.softRemove).toHaveBeenCalledWith(listing);
    expect(cache.invalidateDashboard).toHaveBeenCalled();
    expect(result).toEqual({ id: 'pl-1', deleted: true });
  });
});

function chainableQb(overrides: Record<string, unknown> = {}) {
  const qb: Record<string, jest.Mock> = {};
  for (const method of [
    'leftJoinAndSelect',
    'innerJoin',
    'select',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
    'offset',
    'limit',
    'distinct',
    'clone',
  ]) {
    qb[method] = jest.fn().mockReturnThis();
  }
  qb.getManyAndCount = jest.fn(async () => [[], 0]);
  qb.getMany = jest.fn(async () => []);
  qb.getCount = jest.fn(async () => 0);
  qb.getRawMany = jest.fn(async () => []);
  Object.assign(qb, overrides);
  qb.clone.mockReturnValue(qb);
  return qb;
}

describe('PartListingsService.listPublic', () => {
  function makeService(partListings: object) {
    const listingImages = {
      createQueryBuilder: jest.fn(() =>
        chainableQb({
          getMany: jest.fn(async () => []),
        }),
      ),
    };
    return new PartListingsService(
      partListings as never,
      {} as never,
      {} as never,
      listingImages as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { activeVerifiedIds: jest.fn(async () => new Set(['pd-1'])) } as never,
      {} as never,
      { invalidateDashboard: jest.fn() } as never,
    );
  }

  it('paginates listing ids before loading 1:N fitments', async () => {
    const idQb = chainableQb({
      getCount: jest.fn(async () => 3),
      getRawMany: jest.fn(async () => [{ id: 'p1' }, { id: 'p2' }]),
    });
    const hydrateQb = chainableQb({
      getMany: jest.fn(async () => [
        {
          id: 'p1',
          slug: 'pads',
          kind: 'spare',
          title: 'Brake pads',
          priceLkr: 5000,
          condition: 'new',
          categoryId: 'cat-1',
          districtId: 'd-1',
          partsDealerId: 'pd-1',
          viewCount: 0,
          publishedAt: new Date('2026-01-02'),
          createdAt: new Date('2026-01-02'),
          category: { name: 'Brakes' },
          district: { name: 'Colombo' },
          city: { name: 'Colombo' },
          partsDealer: { name: 'Parts Co', slug: 'parts-co' },
          fitments: [
            { id: 'f1', brandId: 'b1', modelId: 'm1', brand: { name: 'Honda' } },
            { id: 'f2', brandId: 'b2', modelId: null, brand: { name: 'Yamaha' } },
          ],
        },
        {
          id: 'p2',
          slug: 'oil',
          kind: 'spare',
          title: 'Oil filter',
          priceLkr: 1200,
          condition: 'new',
          categoryId: 'cat-1',
          districtId: 'd-1',
          partsDealerId: 'pd-1',
          viewCount: 0,
          publishedAt: new Date('2026-01-01'),
          createdAt: new Date('2026-01-01'),
          category: { name: 'Engine' },
          district: { name: 'Colombo' },
          city: { name: 'Colombo' },
          partsDealer: { name: 'Parts Co', slug: 'parts-co' },
          fitments: [{ id: 'f3', brandId: 'b1', modelId: null }],
        },
      ]),
    });
    let calls = 0;
    const partListings = {
      createQueryBuilder: jest.fn(() => {
        calls += 1;
        return calls === 1 ? idQb : hydrateQb;
      }),
      find: jest.fn(),
    };
    const service = makeService(partListings);

    const { items, meta } = await service.listPublic({ page: 1, limit: 2 });

    expect(idQb.leftJoinAndSelect).not.toHaveBeenCalled();
    expect(idQb.skip).toHaveBeenCalledWith(0);
    expect(idQb.take).toHaveBeenCalledWith(2);
    expect(idQb.getRawMany).toHaveBeenCalled();
    expect(idQb.getCount).toHaveBeenCalled();
    expect(hydrateQb.skip).not.toHaveBeenCalled();
    expect(hydrateQb.take).not.toHaveBeenCalled();
    expect(hydrateQb.leftJoinAndSelect).toHaveBeenCalledWith(
      'l.fitments',
      expect.any(String),
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.id).toBe('p1');
    expect(meta).toMatchObject({ page: 1, limit: 2, total: 3 });
  });

  it('filters brand/model with EXISTS so pagination counts listings not join rows', async () => {
    const idQb = chainableQb({
      getCount: jest.fn(async () => 1),
      getRawMany: jest.fn(async () => [{ id: 'p1' }]),
    });
    const hydrateQb = chainableQb({
      getMany: jest.fn(async () => []),
    });
    let calls = 0;
    const service = makeService({
      createQueryBuilder: jest.fn(() => {
        calls += 1;
        return calls === 1 ? idQb : hydrateQb;
      }),
    });

    await service.listPublic({
      brandId: 'brand-1',
      modelId: 'model-1',
      page: 2,
      limit: 10,
    });

    const existsSql = idQb.andWhere.mock.calls
      .map(([sql]) => String(sql))
      .find((sql) => sql.includes('EXISTS'));
    expect(existsSql).toMatch(/part_listing_fitments/);
    expect(idQb.innerJoin).not.toHaveBeenCalled();
    expect(idQb.skip).toHaveBeenCalledWith(10);
    expect(idQb.take).toHaveBeenCalledWith(10);
  });
});
