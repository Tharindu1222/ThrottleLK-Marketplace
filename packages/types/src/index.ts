export type Locale = 'en' | 'si';

export type UserRole = 'buyer' | 'seller' | 'dealer' | 'parts_dealer' | 'admin';

export type PartListingKind = 'spare' | 'modified';

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
