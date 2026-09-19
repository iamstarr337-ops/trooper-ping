"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Ping, pingOpacity } from "@/lib/types";
import "leaflet/dist/leaflet.css";

function Recenter({
  lat,
  lng,
  zoom,
}: {
  lat: number;
  lng: number;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom ?? map.getZoom(), { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
}

function userIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:#38bdf8;border:3px solid #fff;
      box-shadow:0 0 0 6px rgba(56,189,248,0.35);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function trooperIcon(type: string, opacity: number) {
  const color = type === "moving" ? "#f97316" : "#ef4444";
  return L.divIcon({
    className: "",
    html: `<div style="
      opacity:${opacity};
      width:28px;height:28px;border-radius:50%;
      background:${color};border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      font-size:14px;line-height:1;
    ">🚓</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function ageLabel(createdAt: string): string {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

interface MapViewProps {
  center: { lat: number; lng: number };
  userPos: { lat: number; lng: number } | null;
  pings: Ping[];
  onFlag: (id: string) => void;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
  /** Free / demo mode — limited markers, no flag */
  demo?: boolean;
}

export default function MapView({
  center,
  userPos,
  pings,
  onFlag,
  flyTo,
  demo = false,
}: MapViewProps) {
  const uIcon = useMemo(() => userIcon(), []);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        className={`h-full w-full z-0 ${demo ? "tp-demo-map" : ""}`}
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {flyTo && (
          <Recenter lat={flyTo.lat} lng={flyTo.lng} zoom={flyTo.zoom ?? 13} />
        )}

        {userPos && !demo && (
          <>
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={40}
              pathOptions={{
                color: "#38bdf8",
                fillColor: "#38bdf8",
                fillOpacity: 0.08,
                weight: 1,
                opacity: 0.4,
              }}
            />
            <Marker position={[userPos.lat, userPos.lng]} icon={uIcon}>
              <Popup>You are here</Popup>
            </Marker>
          </>
        )}

        {pings.map((p) => {
          const opacity = pingOpacity(p.createdAt) * (demo ? 0.85 : 1);
          if (opacity <= 0) return null;
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={trooperIcon(p.type, opacity)}
              opacity={opacity}
            >
              <Popup>
                <div className="text-sm min-w-[140px]">
                  <div className="font-semibold text-gray-900">
                    {p.type === "moving" ? "Moving" : "Parked / Posted"}
                  </div>
                  <div className="text-gray-600 text-xs mt-0.5">
                    {ageLabel(p.createdAt)}
                    {p.anonymous ? " · anon" : ""}
                    {demo ? " · demo" : ""}
                  </div>
                  {p.note && (
                    <p className="mt-1 text-gray-800 text-xs italic">
                      &ldquo;{p.note}&rdquo;
                    </p>
                  )}
                  {!demo && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-red-600 underline"
                      onClick={() => onFlag(p.id)}
                    >
                      Flag as inaccurate
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      {demo && (
        <div
          className="pointer-events-none absolute inset-0 z-[400] tp-demo-blur"
          aria-hidden
        />
      )}
    </div>
  );
}
