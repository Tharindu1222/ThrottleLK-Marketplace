'use client';

import dynamic from 'next/dynamic';

export const HeroBikeOrbitLazy = dynamic(
  () => import('./hero-bike-orbit').then((mod) => mod.HeroBikeOrbit),
  { ssr: false },
);
