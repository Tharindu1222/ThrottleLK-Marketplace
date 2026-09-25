import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  dealerCoverUrl,
  dealerDirectionsHref,
  dealerInitials,
  dealerMemberYear,
  dealerOsmHref,
  dealerWhatsappHref,
  formatDealerLocation,
  formatStreetAddress,
} from './dealer-showroom';

describe('formatDealerLocation', () => {
  it('joins city and district once, skipping empties', () => {
    assert.equal(
      formatDealerLocation({
        city: { name: 'Colombo' },
        district: { name: 'Colombo' },
      }),
      'Colombo',
    );
    assert.equal(
      formatDealerLocation({ city: { name: 'Beliatta' }, district: null }),
      'Beliatta',
    );
    assert.equal(formatDealerLocation({}), '');
  });
});

describe('formatStreetAddress', () => {
  it('normalizes messy commas and spaces', () => {
    assert.equal(
      formatStreetAddress('299/2 , new road, sitinamaluwa,beliatta'),
      '299/2, new road, sitinamaluwa, beliatta',
    );
  });
});

describe('dealerCoverUrl', () => {
  it('prefers cover, then first image by sort order', () => {
    assert.equal(
      dealerCoverUrl({
        coverImageUrl: 'https://cdn/cover.jpg',
        images: [{ imageUrl: 'https://cdn/a.jpg', sortOrder: 0 }],
      }),
      'https://cdn/cover.jpg',
    );
    assert.equal(
      dealerCoverUrl({
        coverImageUrl: null,
        images: [
          { imageUrl: 'https://cdn/b.jpg', sortOrder: 2 },
          { imageUrl: 'https://cdn/a.jpg', sortOrder: 1 },
        ],
      }),
      'https://cdn/a.jpg',
    );
    assert.equal(dealerCoverUrl({ coverImageUrl: null, images: [] }), null);
  });
});

describe('dealerInitials', () => {
  it('uses up to two name parts', () => {
    assert.equal(dealerInitials('Tharindu Dilshan'), 'TD');
    assert.equal(dealerInitials('Island Motors Pvt Ltd'), 'IM');
    assert.equal(dealerInitials('  '), '');
  });
});

describe('dealerWhatsappHref', () => {
  it('keeps digits only', () => {
    assert.equal(
      dealerWhatsappHref('070 460 8282'),
      'https://wa.me/0704608282',
    );
    assert.equal(dealerWhatsappHref(null), null);
  });
});

describe('dealerDirectionsHref', () => {
  it('prefers coordinates, then address/location search', () => {
    assert.equal(
      dealerDirectionsHref(
        { latitude: 6.1, longitude: 80.7, address: 'Main St' },
        'Beliatta',
      ),
      'https://www.google.com/maps/dir/?api=1&destination=6.1,80.7',
    );
    assert.equal(
      dealerDirectionsHref(
        { latitude: null, longitude: null, address: 'Main St' },
        'Beliatta',
      ),
      'https://www.google.com/maps/search/?api=1&query=Main%20St%2C%20Beliatta',
    );
    assert.equal(
      dealerDirectionsHref(
        { latitude: null, longitude: null, address: null },
        '',
      ),
      null,
    );
  });
});

describe('dealerOsmHref', () => {
  it('builds an OpenStreetMap pin URL', () => {
    assert.equal(
      dealerOsmHref(6.1, 80.7),
      'https://www.openstreetmap.org/?mlat=6.1&mlon=80.7#map=16/6.1/80.7',
    );
  });
});

describe('dealerMemberYear', () => {
  it('reads a calendar year from createdAt', () => {
    assert.equal(dealerMemberYear('2026-03-01T00:00:00.000Z'), 2026);
    assert.equal(dealerMemberYear(), null);
  });
});
