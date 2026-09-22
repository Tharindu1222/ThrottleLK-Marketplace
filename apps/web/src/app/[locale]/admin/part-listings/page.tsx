'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminPartListings } from '@/components/admin/admin-part-listings';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminPartListingsPage() {
  const { search, setSearch } = useAdminSearch();
  const q = useSearchParams().get('q');
  useEffect(() => {
    if (q) setSearch(q);
  }, [q, setSearch]);
  return <AdminPartListings search={search} />;
}
