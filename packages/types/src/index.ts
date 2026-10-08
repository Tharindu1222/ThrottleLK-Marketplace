export type Locale = 'en' | 'si';

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  messages: boolean;
  listings: boolean;
  shops: boolean;
  promotions: boolean;
  savedSearches: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: true,
  inApp: true,
  messages: true,
  listings: true,
  shops: true,
  promotions: true,
  savedSearches: true,
};

export type UserRole = 'buyer' | 'seller' | 'dealer' | 'parts_dealer' | 'admin';

export type PartListingKind = 'spare' | 'modified' | 'accessory';

export type RegistrationStatus = 'registered' | 'unregistered';

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'rejected'
  | 'paused'
  | 'sold'
  | 'expired';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
