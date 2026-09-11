'use client';

import { AdminReports } from '@/components/admin/admin-reports';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminReportsPage() {
  const { search } = useAdminSearch();
  return <AdminReports search={search} />;
}
