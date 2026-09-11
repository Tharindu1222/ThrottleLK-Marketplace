'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { AdminGate } from './admin-gate';
import { AdminSidebar } from './admin-sidebar';
import { AdminTopbar } from './admin-topbar';

export function AdminShell({
  locale,
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
}: {
  locale: Locale;
  title: string;
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-app min-h-screen">
      <div className="flex min-h-screen">
        <AdminSidebar
          locale={locale}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar
            title={title}
            subtitle={subtitle}
            onMenuClick={() => setMobileOpen(true)}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <AdminGate locale={locale}>{children}</AdminGate>
          </main>
        </div>
      </div>
    </div>
  );
}
