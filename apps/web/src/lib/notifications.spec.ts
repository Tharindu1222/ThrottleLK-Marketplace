import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notificationHref, type AppNotification } from './notifications';

function notification(
  type: string,
  dataJson: AppNotification['dataJson'],
): AppNotification {
  return {
    id: 'n-1',
    type,
    title: 'Alert',
    message: 'Test',
    readAt: null,
    createdAt: new Date().toISOString(),
    dataJson,
  };
}
test('part warning and expiry reminder links open the owner editor', () => {
  for (const kind of ['spare', 'modified', 'accessory']) {
    assert.equal(
      notificationHref(
        'en',
        notification('part_listing_warning', {
          partListingId: 'part-1',
          slug: 'part-slug',
          kind,
        }),
      ),
      '/en/account/parts-listings/part-1/edit',
    );
  }
  assert.equal(
    notificationHref(
      'si',
      notification('part_listing_expiring_soon', { partListingId: 'part-1' }),
    ),
    '/si/account/parts-listings/part-1/edit',
  );
  assert.equal(
    notificationHref(
      'en',
      notification('listing_expiring_soon', { listingId: 'bike-1' }),
    ),
    '/en/account/listings/bike-1/edit',
  );
});
test('approved accessories, messages, and moderation keep their destinations', () => {
  assert.equal(
    notificationHref(
      'en',
      notification('part_listing_approved', {
        slug: 'helmet',
        kind: 'accessory',
      }),
    ),
    '/en/rider-accessories/helmet',
  );
  assert.equal(
    notificationHref(
      'en',
      notification('new_message', { conversationId: 'thread-1' }),
    ),
    '/en/account/messages/thread-1',
  );
  assert.equal(
    notificationHref('en', notification('part_listing_pending_review', {})),
    '/en/admin/moderation?queue=part-listings',
  );
});
