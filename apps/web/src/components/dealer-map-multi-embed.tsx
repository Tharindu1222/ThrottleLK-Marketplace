'use client';

import dynamic from 'next/dynamic';
import type { DealerMapPin } from '@/components/dealer-map-multi';

const DealerMapMulti = dynamic(
  () =>
    import('@/components/dealer-map-multi').then((m) => m.DealerMapMulti),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[420px] w-full animate-pulse bg-zinc-100" />
    ),
  },
);

export function DealerMapMultiEmbed({
  dealers,
  locale,
  viewShowroomLabel,
  verifiedLabel,
  approximateLabel,
  kindLabels,
  className,
  pathPrefix,
}: {
  dealers: DealerMapPin[];
  locale: string;
  viewShowroomLabel: string;
  verifiedLabel: string;
  approximateLabel?: string;
  kindLabels?: { bike: string; parts: string };
  className?: string;
  pathPrefix?: string;
}) {
  return (
    <DealerMapMulti
      dealers={dealers}
      locale={locale}
      viewShowroomLabel={viewShowroomLabel}
      verifiedLabel={verifiedLabel}
      approximateLabel={approximateLabel}
      kindLabels={kindLabels}
      className={className}
      pathPrefix={pathPrefix}
    />
  );
}
