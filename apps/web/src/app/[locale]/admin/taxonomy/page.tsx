'use client';

import { AdminTaxonomy } from '@/components/admin/admin-taxonomy';
import { useAdminSearch } from '@/components/admin/admin-layout-client';

export default function AdminTaxonomyPage() {
  const { search } = useAdminSearch();
  return <AdminTaxonomy search={search} />;
}
