export type AdminDashboard = {
  users: number;
  activeListings: number;
  pendingListings: number;
  pendingDealers: number;
  pendingPartsDealers: number;
  pendingPartListings: number;
  pendingPromoRequests?: number;
  openReports: number;
};

export type PendingListing = {
  id: string;
  title: string;
  priceLkr: number;
  manufactureYear: number;
  coverImageUrl?: string | null;
  updatedAt: string;
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
  kind: string;
  priceLkr: number;
  coverImageUrl?: string | null;
  updatedAt: string;
  partsDealer?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type PendingDealer = { id: string; name: string; phone: string };

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
  reason: string;
  description: string;
  createdAt: string;
  listing?: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
    status: string;
  } | null;
};

export type AdminPartListing = {
  id: string;
  title: string;
  slug: string;
  kind: 'spare' | 'modified';
  priceLkr: number;
  status: string;
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
