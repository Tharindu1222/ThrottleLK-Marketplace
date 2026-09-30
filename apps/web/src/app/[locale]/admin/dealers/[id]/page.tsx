'use client';

import { useParams } from 'next/navigation';
import { AdminDealerDetail } from '@/components/admin/admin-dealer-detail';

export default function AdminDealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <AdminDealerDetail id={id} />;
}
