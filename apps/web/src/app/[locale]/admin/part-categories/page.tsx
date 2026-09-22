'use client';

import { AdminPartCategories } from '@/components/admin/admin-part-categories';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminPartCategoriesPage() {
  const { search } = useAdminSearch();
  return <AdminPartCategories search={search} />;
}
