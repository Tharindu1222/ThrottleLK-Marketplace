export type AdminDashboard = {
  users: number;
  activeListings: number;
  pendingListings: number;
  pendingDealers: number;
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
};
