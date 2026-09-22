'use client';

import { AdminPartListings } from '@/components/admin/admin-part-listings';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminPartListingsPage() {
  const { search } = useAdminSearch();
  return <AdminPartListings search={search} />;
}
