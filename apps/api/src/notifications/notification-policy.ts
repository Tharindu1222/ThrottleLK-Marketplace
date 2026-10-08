import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from '@throttlelk/types';

export function notificationChannels(
  type: string,
  preferences?: Partial<NotificationPreferences> | null,
) {
  const settings = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...preferences };
  const category =
    type === 'new_message' || type === 'listing_inquiry'
      ? 'messages'
      : type === 'price_drop' || type === 'saved_search_match'
        ? 'savedSearches'
        : type.startsWith('promo_')
          ? 'promotions'
          : type.startsWith('dealer_') || type.startsWith('parts_dealer_')
            ? 'shops'
            : 'listings';
  return {
    inApp: settings.inApp && settings[category],
    email: settings.email && settings[category],
  };
}
