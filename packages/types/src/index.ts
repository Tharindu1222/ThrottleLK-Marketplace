export type Locale = 'en' | 'si';

export type UserRole = 'buyer' | 'seller' | 'dealer' | 'admin';

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'rejected'
  | 'paused'
  | 'sold'
  | 'expired';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
