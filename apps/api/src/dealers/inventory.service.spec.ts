import { QueryFailedError } from 'typeorm';
import { InventoryService } from './inventory.service';
import type { Listing } from '../listings/listing.entity';
import type { DealerInventoryItem } from './dealer-inventory-item.entity';

function uniqueListingConflict() {
  const driverError = Object.assign(new Error('duplicate key'), {
    code: '23505',
    constraint: 'UQ_dealer_inventory_listing_id',
  });
  return new QueryFailedError(
    'INSERT INTO dealer_inventory_items',
    [],
    driverError,
  );
}

function makeService() {
  const items = {
    findOne: jest.fn(),
    save: jest.fn(async (row: DealerInventoryItem) => row),
    create: jest.fn((value: Partial<DealerInventoryItem>) => value),
    find: jest.fn(),
  };
  const service = new InventoryService(
    items as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, items };
}

const listing = {
  id: 'b92976d4-059b-4f4f-b1b7-8434db7baa71',
  dealerId: 'dealer-1',
  title: 'Honda Activa',
  priceLkr: 450000,
  manufactureYear: 2020,
  brand: { name: 'Honda' },
  model: { name: 'Dio' },
  status: 'active',
} as Listing;

describe('InventoryService.upsertFromListing', () => {
  it('skips listings with no dealer', async () => {
    const { service, items } = makeService();
    await service.upsertFromListing({ ...listing, dealerId: null } as Listing, 'owner-1');
    expect(items.findOne).not.toHaveBeenCalled();
    expect(items.save).not.toHaveBeenCalled();
  });

  it('updates the existing inventory row for a listing', async () => {
    const { service, items } = makeService();
    const existing = { id: 'inv-1', listingId: listing.id, title: 'old' };
    items.findOne.mockResolvedValueOnce(existing);

    await service.upsertFromListing(listing, 'owner-1');

    expect(items.create).not.toHaveBeenCalled();
    expect(items.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'inv-1',
        title: 'Honda Activa',
        askingPriceLkr: 450000,
      }),
    );
  });

  it('inserts when no inventory row exists yet', async () => {
    const { service, items } = makeService();
    items.findOne.mockResolvedValueOnce(null);

    await service.upsertFromListing(listing, 'owner-1');

    expect(items.create).toHaveBeenCalled();
    expect(items.save).toHaveBeenCalledWith(
      expect.objectContaining({
        dealerId: 'dealer-1',
        listingId: listing.id,
        askingPriceLkr: 450000,
      }),
    );
  });

  it('updates instead of failing when a concurrent insert already linked the listing', async () => {
    const { service, items } = makeService();
    const raced = {
      id: 'inv-raced',
      listingId: listing.id,
      title: 'old',
      askingPriceLkr: 1,
    };
    items.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(raced);
    items.save.mockRejectedValueOnce(uniqueListingConflict());

    await service.upsertFromListing(listing, 'owner-1');

    expect(items.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'inv-raced',
        title: 'Honda Activa',
        askingPriceLkr: 450000,
      }),
    );
  });
});
