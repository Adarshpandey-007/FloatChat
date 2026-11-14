"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { useChatStore } from '../../store/chatStore';

export interface FloatSummary {
  id: string;
  lat: number;
  lon: number;
  lastObs: string;
}

interface LeafletMapProps {
  floats: FloatSummary[];
  center: LatLngExpression;
  zoom: number;
}

// Fix Leaflet default marker icon paths
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const focusedIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'focused-float-marker',
});

// Component to handle map pan/zoom events inside MapContainer
function MapController() {
  const map = useMap();
  const targetCenter = useChatStore((s) => s.targetCenter);

  useEffect(() => {
    if (targetCenter && map) {
      try {
        map.setView([targetCenter.lat, targetCenter.lon], 6, { animate: true });
      } catch (error) {
        console.warn('Map view update failed:', error);
      }
    }
  }, [targetCenter, map]);

  return null;
}

export default function LeafletMap({ floats, center, zoom }: LeafletMapProps) {
  const focusedFloatId = useChatStore((s) => s.focusedFloatId);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      attributionControl={true}
      zoomControl={true}
    >
      <MapController />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {floats.map((f) => {
        const highlighted = f.id === focusedFloatId;
        return (
          <Marker
            key={f.id}
            position={[f.lat, f.lon]}
            icon={highlighted ? focusedIcon : DefaultIcon}
            eventHandlers={{
              click: (e) => {
                e.originalEvent?.stopPropagation();
              },
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{f.id}</div>
                <div>
                  {f.lat.toFixed(2)}, {f.lon.toFixed(2)}
                </div>
                <div className="text-[10px]">{new Date(f.lastObs).toUTCString()}</div>
                {highlighted && (
                  <div className="mt-1 text-[10px] text-floatchat-secondary font-semibold">
                    Focused
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

