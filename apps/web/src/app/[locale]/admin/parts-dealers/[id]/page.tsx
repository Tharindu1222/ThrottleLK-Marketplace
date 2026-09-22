'use client';

import { useParams } from 'next/navigation';
import { AdminPartsDealerDetail } from '@/components/admin/admin-parts-dealer-detail';

export default function AdminPartsDealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <AdminPartsDealerDetail id={id} />;
}
