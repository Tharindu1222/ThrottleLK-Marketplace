import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  dealerMapHref,
  dealerTypeQuery,
  mergeDealerCards,
  mergeDealerMapPins,
  paginateDealerCards,
  parseDealerDirectoryType,
  pinFromDealer,
} from './dealer-directory';

const bike = {
  id: 'b1',
  name: 'Island Motors',
  slug: 'island-motors',
  address: null,
  coverImageUrl: null,
};
const parts = {
  id: 'p1',
  name: 'A1 Spares',
  slug: 'a1-spares',
  address: null,
  coverImageUrl: null,
};

const bikePin = {
  id: 'b1',
  name: 'Island Motors',
  slug: 'island-motors',
  latitude: 6.9271,
  longitude: 79.8612,
  coverImageUrl: null,
};
const partsPin = {
  id: 'p1',
  name: 'A1 Spares',
  slug: 'a1-spares',
  latitude: 6.0535,
  longitude: 80.221,
  coverImageUrl: null,
};

describe('parseDealerDirectoryType', () => {
  it('defaults to all so bike and parts show together', () => {
    assert.equal(parseDealerDirectoryType(undefined), 'all');
    assert.equal(parseDealerDirectoryType('bike'), 'bike');
    assert.equal(parseDealerDirectoryType('parts'), 'parts');
  });
});

describe('mergeDealerCards', () => {
  it('tags and sorts bike and parts dealers together', () => {
    const merged = mergeDealerCards([bike], [parts]);
    assert.deepEqual(
      merged.map((row) => row.slug),
      ['a1-spares', 'island-motors'],
    );
    assert.equal(merged[0]?.kind, 'parts');
    assert.equal(merged[1]?.kind, 'bike');
  });
});

describe('paginateDealerCards', () => {
  it('pages a combined list', () => {
    const items = mergeDealerCards(
      [bike, { ...bike, id: 'b2', name: 'Zulu Bikes', slug: 'zulu' }],
      [parts],
    );
    const first = paginateDealerCards(items, 1, 2);
    assert.equal(first.data.length, 2);
    assert.equal(first.meta.total, 3);
    assert.equal(first.meta.hasNextPage, true);
  });
});

describe('dealerTypeQuery', () => {
  it('omits type from the all-dealers URL', () => {
    assert.equal(dealerTypeQuery('all'), undefined);
    assert.equal(dealerTypeQuery('bike'), 'bike');
  });
});

describe('mergeDealerMapPins', () => {
  it('tags bike and parts shops so the map can show both', () => {
    const merged = mergeDealerMapPins([bikePin], [partsPin]);
    assert.equal(merged.length, 2);
    assert.equal(merged.find((row) => row.slug === 'island-motors')?.kind, 'bike');
    assert.equal(merged.find((row) => row.slug === 'a1-spares')?.kind, 'parts');
  });

  it('keeps a one-sided list when the other source is empty', () => {
    assert.equal(mergeDealerMapPins([bikePin], []).length, 1);
    assert.equal(mergeDealerMapPins([], [partsPin]).length, 1);
    assert.deepEqual(mergeDealerMapPins([], []), []);
  });
});

describe('dealerMapHref', () => {
  it('routes each kind to its showroom path', () => {
    assert.equal(
      dealerMapHref('en', 'bike', 'island-motors'),
      '/en/dealers/island-motors',
    );
    assert.equal(
      dealerMapHref('en', 'parts', 'a1-spares'),
      '/en/parts-dealers/a1-spares',
    );
  });
});

describe('pinFromDealer', () => {
  it('uses district center when a shop has no coordinates', () => {
    const pin = pinFromDealer({
      ...partsPin,
      latitude: 0,
      longitude: 0,
      district: { name: 'Colombo' },
    });
    assert.ok(pin);
    assert.equal(pin?.approximate, true);
    assert.ok(pin && pin.latitude > 6);
  });
});
