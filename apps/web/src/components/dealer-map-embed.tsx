'use client';

import dynamic from 'next/dynamic';

const DealerMapPicker = dynamic(
  () =>
    import('@/components/dealer-map-picker').then((m) => m.DealerMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse bg-zinc-100" />
    ),
  },
);

export function DealerMapEmbed({
  latitude,
  longitude,
  className,
}: {
  latitude: number;
  longitude: number;
  className?: string;
}) {
  return (
    <DealerMapPicker
      latitude={latitude}
      longitude={longitude}
      readOnly
      className={className}
    />
  );
}
