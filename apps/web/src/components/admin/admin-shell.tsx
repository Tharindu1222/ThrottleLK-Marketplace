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
    <div className="admin-app h-svh overflow-hidden">
      <div className="flex h-full">
        <AdminSidebar
          locale={locale}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-64">
          <AdminTopbar
            locale={locale}
            title={title}
            subtitle={subtitle}
            onMenuClick={() => setMobileOpen(true)}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
          />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <AdminGate locale={locale}>{children}</AdminGate>
          </main>
        </div>
      </div>
    </div>
  );
}
