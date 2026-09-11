'use client';

import { AdminUsers } from '@/components/admin/admin-users';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminUsersPage() {
  const { search } = useAdminSearch();
  return <AdminUsers search={search} />;
}
