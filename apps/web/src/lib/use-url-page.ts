'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { parsePageParam } from '@/lib/pagination';

export function useUrlPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = parsePageParam(searchParams.get('page'));

  const goTo = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next <= 1) params.delete('page');
      else params.set('page', String(next));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { page, goTo };
}
