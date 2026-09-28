'use client';

import { useReportWebVitals } from 'next/web-vitals';

type GtagFn = (
  command: 'event',
  name: string,
  params: Record<string, string | number | boolean>,
) => void;

export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== 'production') return;
    const value =
      metric.name === 'CLS'
        ? Math.round(metric.value * 1000)
        : Math.round(metric.value);
    const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
    if (gtag) {
      gtag('event', metric.name, {
        value,
        event_label: metric.id,
        non_interaction: true,
      });
    }
  });
  return null;
}
