import type { User } from '../users/user.entity';
import type { PartsDealer } from './parts-dealer.entity';
import { PartsDealersService } from './parts-dealers.service';

function makeAdminService(opts: {
  dealer?: Partial<PartsDealer> | null;
  listRows?: Partial<PartsDealer>[];
  countRows?: Array<{ partsDealerId: string; count: string }>;
  statusRows?: Array<{ status: string; count: string }>;
}) {
  const dealer = opts.dealer ?? null;
  const listRows = opts.listRows ?? (dealer ? [dealer] : []);

  const countQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(async () => opts.countRows ?? []),
  };

  const statusQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(async () => opts.statusRows ?? []),
  };

  let qbCall = 0;
  const partListingsRepo = {
    count: jest.fn(async () => 0),
    find: jest.fn(async () => []),
    createQueryBuilder: jest.fn(() => {
      qbCall += 1;
      return qbCall === 1 ? countQb : statusQb;
    }),
  };

  const partsDealersRepo = {
    findOne: jest.fn(async () => dealer as PartsDealer | null),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [listRows, listRows.length]),
    })),
  };

  const owner = { id: 'user-1', roles: [] } as unknown as User;
  const service = new PartsDealersService(
    partsDealersRepo as never,
    partListingsRepo as never,
    { count: jest.fn(async () => 0) } as never,
    { count: jest.fn(async () => 0) } as never,
    { findByIdOrThrow: jest.fn(async () => owner) } as never,
    {} as never,
    { invalidateDashboard: jest.fn() } as never,
  );

  return { service, partListingsRepo, partsDealersRepo, countQb, statusQb };
}

describe('PartsDealersService partsCount', () => {
  it('adminGet includes partsCount and partsByStatus', async () => {
    const { service } = makeAdminService({
      dealer: {
        id: 'pd-1',
        name: 'Shop',
        images: [],
      } as Partial<PartsDealer>,
      countRows: [{ partsDealerId: 'pd-1', count: '4' }],
      statusRows: [
        { status: 'active', count: '2' },
        { status: 'draft', count: '1' },
        { status: 'pending_review', count: '1' },
      ],
    });

    const result = (await service.adminGet('pd-1')) as Awaited<
      ReturnType<PartsDealersService['adminGet']>
    > & { partsCount: number; partsByStatus: Record<string, number> };

    expect(result.partsCount).toBe(4);
    expect(result.partsByStatus).toEqual({
      active: 2,
      draft: 1,
      pending_review: 1,
    });
  });

  it('listAllAdmin includes partsCount per item', async () => {
    const { service } = makeAdminService({
      listRows: [
        { id: 'pd-1', name: 'Shop A', images: [] },
        { id: 'pd-2', name: 'Shop B', images: [] },
      ],
      countRows: [
        { partsDealerId: 'pd-1', count: '3' },
        { partsDealerId: 'pd-2', count: '7' },
      ],
    });

    const result = (await service.listAllAdmin()) as Awaited<
      ReturnType<PartsDealersService['listAllAdmin']>
    > & { items: Array<{ partsCount: number }> };

    expect(result.items).toHaveLength(2);
    expect(result.items[0].partsCount).toBe(3);
    expect(result.items[1].partsCount).toBe(7);
  });

  it('defaults partsCount to 0 when dealer has no listings', async () => {
    const { service } = makeAdminService({
      dealer: {
        id: 'pd-1',
        name: 'Empty Shop',
        images: [],
      },
      countRows: [],
      statusRows: [],
    });

    const result = (await service.adminGet('pd-1')) as Awaited<
      ReturnType<PartsDealersService['adminGet']>
    > & { partsCount: number; partsByStatus: Record<string, number> };

    expect(result.partsCount).toBe(0);
    expect(result.partsByStatus).toEqual({});
  });
});
