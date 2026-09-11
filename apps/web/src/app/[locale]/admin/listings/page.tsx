'use client';

import { AdminListings } from '@/components/admin/admin-listings';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminListingsPage() {
  const { search } = useAdminSearch();
  return <AdminListings search={search} />;
}
