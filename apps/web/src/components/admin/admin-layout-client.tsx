'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { AdminShell } from './admin-shell';

const SearchCtx = createContext<{
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
}>({
  search: '',
  setSearch: () => {},
});

export function useAdminSearch() {
  return useContext(SearchCtx);
}

const titles: Record<string, { title: string; subtitle: string; placeholder: string }> = {
  '': {
    title: 'Overview',
    subtitle: 'Marketplace operations dashboard',
    placeholder: 'Search admin…',
  },
  moderation: {
    title: 'Moderation',
    subtitle: 'Review listings and dealers',
    placeholder: 'Search listings or dealers…',
  },
  users: {
    title: 'Users',
    subtitle: 'Manage account access',
    placeholder: 'Search users…',
  },
  listings: {
    title: 'Listings',
    subtitle: 'Manage all marketplace listings',
    placeholder: 'Search listings…',
  },
  dealers: {
    title: 'Dealer shops',
    subtitle: 'Manage dealer shop profiles',
    placeholder: 'Search dealers…',
  },
  taxonomy: {
    title: 'Catalog',
    subtitle: 'Categories, brands, and locations',
    placeholder: 'Search this tab…',
  },
  reports: {
    title: 'Reports',
    subtitle: 'Open listing reports',
    placeholder: 'Search reports…',
  },
};

export function AdminLayoutClient({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const segment = pathname.replace(new RegExp(`^/${locale}/admin/?`), '').split('/')[0] || '';
  const meta = titles[segment] ?? titles[''];

  useEffect(() => {
    setSearch('');
  }, [pathname]);

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <SearchCtx.Provider value={value}>
      <AdminShell
        locale={locale}
        title={meta.title}
        subtitle={meta.subtitle}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={meta.placeholder}
      >
        {children}
      </AdminShell>
    </SearchCtx.Provider>
  );
}
