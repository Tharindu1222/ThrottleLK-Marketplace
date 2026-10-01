import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { flattenAccountNav, visibleAccountNavSections } from './account-nav';

describe('visibleAccountNavSections', () => {
  it('keeps private-seller listings, then inbox, saved, and account last', () => {
    const sections = visibleAccountNavSections({
      isDealer: false,
      isPartsDealer: false,
    });
    assert.deepEqual(
      sections.map((section) => section.id),
      ['shop', 'inbox', 'saved', 'account'],
    );
    assert.deepEqual(
      sections.find((section) => section.id === 'shop')?.items.map((item) => item.id),
      ['listings'],
    );
    assert.equal(sections.at(-1)?.id, 'account');
    assert.deepEqual(
      sections.find((section) => section.id === 'account')?.items.map((item) => item.id),
      ['profile'],
    );
  });

  it('orders dealer shop work as inventory, listings, showroom, then performance', () => {
    const shop = visibleAccountNavSections({
      isDealer: true,
      isPartsDealer: false,
    }).find((section) => section.id === 'shop');
    assert.deepEqual(
      shop?.items.map((item) => item.id),
      ['inventory', 'listings', 'showroom', 'performance'],
    );
  });

  it('hides parts shop unless the user is a parts dealer', () => {
    const dealer = visibleAccountNavSections({
      isDealer: true,
      isPartsDealer: false,
    });
    assert.equal(
      dealer.some((section) => section.id === 'partsShop'),
      false,
    );

    const parts = visibleAccountNavSections({
      isDealer: false,
      isPartsDealer: true,
    });
    assert.deepEqual(
      parts.find((section) => section.id === 'shop')?.items.map((item) => item.id),
      ['listings', 'performance'],
    );
    assert.deepEqual(
      parts.map((section) => section.id),
      ['shop', 'partsShop', 'inbox', 'saved', 'account'],
    );
    assert.deepEqual(
      parts.find((section) => section.id === 'partsShop')?.items.map((item) => item.id),
      ['partsListings', 'partsShowroom'],
    );
  });

  it('places parts shop after bike shop when both dealer roles apply', () => {
    assert.deepEqual(
      visibleAccountNavSections({
        isDealer: true,
        isPartsDealer: true,
      }).map((section) => section.id),
      ['shop', 'partsShop', 'inbox', 'saved', 'account'],
    );
  });
});

describe('flattenAccountNav', () => {
  it('uses the same order for mobile chips as the grouped desktop nav', () => {
    assert.deepEqual(
      flattenAccountNav({ isDealer: true, isPartsDealer: false }).map(
        (item) => item.id,
      ),
      [
        'inventory',
        'listings',
        'showroom',
        'performance',
        'messages',
        'notifications',
        'favourites',
        'savedSearches',
        'profile',
      ],
    );
  });
});
