'use client';

import { AdminAudit } from '@/components/admin/admin-audit';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminAuditPage() {
  const { search } = useAdminSearch();
  return <AdminAudit search={search} />;
}
