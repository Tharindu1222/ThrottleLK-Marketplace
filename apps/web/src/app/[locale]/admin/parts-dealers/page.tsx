'use client';

import { AdminPartsDealers } from '@/components/admin/admin-parts-dealers';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminPartsDealersPage() {
  const { search } = useAdminSearch();
  return <AdminPartsDealers search={search} />;
}
