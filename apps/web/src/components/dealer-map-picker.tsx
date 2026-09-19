'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const LK_CENTER: L.LatLngExpression = [7.8731, 80.7718];
const DEFAULT_ZOOM = 7;
const PIN_ZOOM = 14;

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

export function DealerMapPicker({
  latitude,
  longitude,
  onChange,
  readOnly = false,
  className = '',
}: {
  latitude: number | null;
  longitude: number | null;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: !readOnly,
      dragging: true,
      doubleClickZoom: !readOnly,
    }).setView(
      latitude != null && longitude != null
        ? [latitude, longitude]
        : LK_CENTER,
      latitude != null && longitude != null ? PIN_ZOOM : DEFAULT_ZOOM,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (!readOnly) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onChangeRef.current?.(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, [readOnly]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (latitude == null || longitude == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const latLng: L.LatLngExpression = [latitude, longitude];
    if (!markerRef.current) {
      const marker = L.marker(latLng, {
        icon: markerIcon,
        draggable: !readOnly,
      }).addTo(map);
      if (!readOnly) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChangeRef.current?.(pos.lat, pos.lng);
        });
      }
      markerRef.current = marker;
      map.setView(latLng, Math.max(map.getZoom(), PIN_ZOOM));
    } else {
      markerRef.current.setLatLng(latLng);
      map.setView(latLng, Math.max(map.getZoom(), PIN_ZOOM));
    }
  }, [latitude, longitude, readOnly]);

  return (
    <div
      ref={containerRef}
      className={`z-0 w-full overflow-hidden border border-black/10 bg-zinc-100 ${className || 'h-64'}`}
    />
  );
}
