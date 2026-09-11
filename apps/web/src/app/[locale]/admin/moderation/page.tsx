'use client';

import { AdminModeration } from '@/components/admin/admin-moderation';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminModerationPage() {
  const { search } = useAdminSearch();
  return <AdminModeration search={search} />;
}
