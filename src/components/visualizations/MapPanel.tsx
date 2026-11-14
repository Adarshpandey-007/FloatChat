"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { LatLngExpression } from 'leaflet';
import { useChatStore } from '../../store/chatStore';
import { MapSearchBar } from './MapSearchBar';
import { Skeleton } from '../ui/Skeleton';
import type { FloatSummary } from './LeafletMap';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 p-4">
      <Skeleton className="h-full w-full rounded-2xl" />
    </div>
  ),
});

export function MapPanel() {
  const [floats, setFloats] = useState<FloatSummary[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { targetCenter } = useChatStore();

  const center: LatLngExpression = targetCenter
    ? [targetCenter.lat, targetCenter.lon]
    : [12, 75];

  useEffect(() => {
    setIsClient(true);
    const controller = new AbortController();

    fetch('/api/floats', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Failed to load map floats (${r.status})`);
        }
        return r.json();
      })
      .then((data) => {
        setFloats(data.floats || []);
        setLoadError(null);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setLoadError('Map data could not be loaded. Please refresh.');
      });

    return () => controller.abort();
  }, []);

  if (!isClient) {
    return (
      <div className="absolute inset-0 p-4">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <MapSearchBar floats={floats} />
      {loadError && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000] rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm">
          {loadError}
        </div>
      )}
      <LeafletMap
        floats={floats}
        center={center}
        zoom={targetCenter ? 6 : 4}
      />
    </div>
  );
}
