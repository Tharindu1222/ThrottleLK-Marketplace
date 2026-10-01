'use client';

import { useSearchParams } from 'next/navigation';
import { AdminModeration } from '@/components/admin/admin-moderation';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminModerationPage() {
  const { search } = useAdminSearch();
  const queue = useSearchParams().get('queue') ?? undefined;
  return <AdminModeration search={search} initialQueue={queue} />;
}
