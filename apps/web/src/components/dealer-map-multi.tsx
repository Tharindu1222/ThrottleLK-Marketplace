'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const LK_CENTER: L.LatLngExpression = [7.8731, 80.7718];
const DEFAULT_ZOOM = 7;

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type DealerMapPin = {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  coverImageUrl?: string | null;
  verifiedAt?: string | null;
  city?: { name: string } | null;
  district?: { name: string } | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function DealerMapMulti({
  dealers,
  locale,
  viewShowroomLabel,
  verifiedLabel,
  className = '',
  pathPrefix = 'dealers',
}: {
  dealers: DealerMapPin[];
  locale: string;
  viewShowroomLabel: string;
  verifiedLabel: string;
  className?: string;
  /** URL segment under locale, e.g. `dealers` or `parts-dealers`. */
  pathPrefix?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      dragging: true,
    }).setView(LK_CENTER, DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    const onResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', onResize);
    // Leaflet needs a tick after layout to size correctly in flex containers
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layer = L.layerGroup().addTo(map);
    const bounds: L.LatLngExpression[] = [];

    for (const dealer of dealers) {
      const latLng: L.LatLngExpression = [
        dealer.latitude,
        dealer.longitude,
      ];
      bounds.push(latLng);

      const location = [dealer.city?.name, dealer.district?.name]
        .filter(Boolean)
        .join(', ');
      const href = `/${locale}/${pathPrefix}/${encodeURIComponent(dealer.slug)}`;
      const cover =
        dealer.coverImageUrl != null && dealer.coverImageUrl !== ''
          ? `<img src="${escapeHtml(dealer.coverImageUrl)}" alt="" width="200" height="125" style="display:block;width:200px;height:125px;object-fit:cover;border-radius:4px;margin-bottom:8px" loading="lazy" />`
          : '';
      const html = `
        <div style="width:200px;font:14px/1.4 system-ui,sans-serif">
          ${cover}
          <strong>${escapeHtml(dealer.name)}</strong>
          ${
            dealer.verifiedAt
              ? `<div style="margin-top:6px;display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:11px;font-weight:600;border:1px solid rgba(5,150,105,.15)"><svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6.2 10.2 8.6 12.6 13.8 7.2" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>${escapeHtml(verifiedLabel)}</div>`
              : ''
          }
          ${location ? `<div style="margin-top:4px;opacity:.7">${escapeHtml(location)}</div>` : ''}
          <a href="${href}" style="display:inline-block;margin-top:8px;color:#e10600;font-weight:600;text-decoration:none">
            ${escapeHtml(viewShowroomLabel)}
          </a>
        </div>
      `;

      L.marker(latLng, { icon: markerIcon })
        .bindPopup(html, { maxWidth: 240 })
        .addTo(layer);
    }

    if (bounds.length === 1) {
      map.setView(bounds[0], 12);
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 12 });
    } else {
      map.setView(LK_CENTER, DEFAULT_ZOOM);
    }

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      layer.remove();
    };
  }, [dealers, locale, viewShowroomLabel, verifiedLabel, pathPrefix]);

  return (
    <div
      ref={containerRef}
      className={`z-0 w-full overflow-hidden bg-zinc-100 ${className || 'h-full min-h-[420px]'}`}
    />
  );
}
