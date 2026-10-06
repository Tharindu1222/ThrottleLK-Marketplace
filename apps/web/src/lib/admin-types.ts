export type AdminDashboard = {
  users: number;
  activeListings: number;
  pendingListings: number;
  soldListings?: number;
  activePartListings?: number;
  pendingPartListings: number;
  soldPartListings?: number;
  activeDealers?: number;
  pendingDealers: number;
  activePartsDealers?: number;
  pendingPartsDealers: number;
  pendingPromoRequests?: number;
  openReports: number;
  listingPackagePending?: number;
  listingPackageFailed?: number;
  listingPackageChargebacks?: number;
};

export type PendingListing = {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  phone?: string | null;
  priceLkr: number;
  manufactureYear: number;
  coverImageUrl?: string | null;
  imageUrls?: string[];
  updatedAt: string;
  district?: { name: string } | null;
  city?: { name: string } | null;
  duplicateCount?: number;
  duplicateSignals?: Array<{
    listingId: string;
    title: string;
    status: string;
    reasons: Array<
      | 'same_seller_model_year'
      | 'same_phone_model'
      | 'same_title'
      | 'similar_title'
    >;
  }>;
  seller?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
};

export type PendingPartListing = {
  id: string;
  title: string;
  slug?: string;
  kind: string;
  description?: string | null;
  phone?: string | null;
  priceLkr: number;
  coverImageUrl?: string | null;
  imageUrls?: string[];
  updatedAt: string;
  district?: { name: string } | null;
  city?: { name: string } | null;
  partsDealer?: {
    id: string;
    name: string;
    slug: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
};

export type PendingDealer = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  description?: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: string;
  roles: string[];
  createdAt?: string;
  emailVerifiedAt?: string | null;
};

export type Brand = { id: string; name: string };
export type District = { id: string; name: string };

export type AdminReport = {
  id: string;
  listingId: string;
  partListingId?: string | null;
  subjectType?: 'bike' | 'part' | null;
  reason: string;
  description: string;
  createdAt: string;
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  listing?: {
    id: string;
    title: string;
    slug: string;
    kind?: string | null;
    coverImageUrl: string | null;
    status: string;
  } | null;
};

export type AdminPartListing = {
  id: string;
  title: string;
  slug: string;
  kind: 'spare' | 'modified' | 'accessory';
  priceLkr: number;
  status: string;
  rejectionReason?: string | null;
  condition: string;
  negotiable: boolean;
  categoryId: string;
  districtId: string;
  cityId: string;
  partsDealerId: string;
  description: string;
  phone: string | null;
  whatsapp: string | null;
  updatedAt: string;
  coverImageUrl?: string | null;
  partsDealer?: { id: string; name: string; slug: string } | null;
  category?: { id: string; name: string } | null;
  fitments?: Array<{
    id?: string;
    brandId: string;
    modelId: string | null;
  }>;
};

export type AdminPartsDealerRow = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  districtId: string;
  cityId: string;
  ownerUserId: string;
  status: string;
  verifiedAt: string | null;
  updatedAt: string;
  partsCount: number;
  partsByStatus?: Record<string, number>;
  coverImageUrl?: string | null;
  owner?: { id: string; email: string; firstName: string; lastName: string };
  district?: { id: string; name: string };
  city?: { id: string; name: string };
};
