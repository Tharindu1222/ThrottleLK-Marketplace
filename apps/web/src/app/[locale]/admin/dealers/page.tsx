'use client';

import { AdminDealers } from '@/components/admin/admin-dealers';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminDealersPage() {
  const { search } = useAdminSearch();
  return <AdminDealers search={search} />;
}
