import { PartListingsService } from './part-listings.service';

describe('PartListingsService.relatedForBikeListing', () => {
  it('matches fitments by brand and optional model', async () => {
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
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'part-1',
      kind: 'spare',
    });
  });
});
