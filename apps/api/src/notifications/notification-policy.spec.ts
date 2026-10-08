import { notificationChannels } from './notification-policy';

describe('notification preferences', () => {
  it('preserves existing defaults and supports separate channels', () => {
    expect(notificationChannels('listing_approved')).toEqual({
      email: true,
      inApp: true,
    });
    expect(notificationChannels('listing_approved', { email: false })).toEqual({
      email: false,
      inApp: true,
    });
    expect(notificationChannels('listing_approved', { inApp: false })).toEqual({
      email: true,
      inApp: false,
    });
  });
  it.each([
    ['new_message', 'messages'],
    ['listing_inquiry', 'messages'],
    ['listing_expiring_soon', 'listings'],
    ['part_listing_warning', 'listings'],
    ['parts_dealer_approved', 'shops'],
    ['promo_approved', 'promotions'],
    ['price_drop', 'savedSearches'],
    ['saved_search_match', 'savedSearches'],
  ])('honours the category opt-out for %s', (type, category) => {
    expect(notificationChannels(type, { [category]: false })).toEqual({
      email: false,
      inApp: false,
    });
  });
});
