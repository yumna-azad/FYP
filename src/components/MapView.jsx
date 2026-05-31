import React, { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Default Leaflet icon configuration is performed once at app startup
// in src/main.jsx so it runs before any map component renders.
// Reuse a single instance instead of constructing a new one per Marker.
const DEFAULT_ICON = new L.Icon.Default();

// Icon fix is applied once in main.jsx

// Module-level cache so identical pin configs reuse the same L.divIcon instance
// across re-renders. Without this, Leaflet throws "_leaflet_events" on cleanup
// because it tries to remove an icon instance that React already replaced.
const ICON_CACHE = new Map();

function buildColoredIcon(color, rank, selected) {
  const size = selected ? 44 : 34;
  const head = selected ? 20 : 16;
  return L.divIcon({
    className: "smartloc-pin",
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -size + 4],
    html: `<div style="position:relative;width:${size}px;height:${size + 10}px;">
      <svg width="${size}" height="${size + 10}" viewBox="0 0 ${size} ${size + 10}" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));">
        <path d="M${size / 2} 0C${size * 0.22} 0 0 ${size * 0.22} 0 ${size / 2}c0 ${size * 0.38} ${size / 2} ${size * 0.75} ${size / 2} ${size * 0.75}s${size / 2} -${size * 0.37} ${size / 2} -${size * 0.75}C${size} ${size * 0.22} ${size * 0.78} 0 ${size / 2} 0z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${head / 2}" fill="white"/>
        <text x="${size / 2}" y="${size / 2 + head / 4}" text-anchor="middle" font-size="${head - 4}" font-weight="700" fill="${color}" font-family="Outfit, sans-serif">${rank}</text>
      </svg>
    </div>`,
  });
}

function getCachedIcon(color, rank, selected) {
  const key = `${color}|${rank}|${selected ? 1 : 0}`;
  let icon = ICON_CACHE.get(key);
  if (!icon) {
    icon = buildColoredIcon(color, rank, selected);
    ICON_CACHE.set(key, icon);
  }
  return icon;
}

const defaultCenter = [6.9497, 80.7891]; // Nuwara Eliya
const defaultZoom = 13;

function FlyToSelected({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] != null && center[1] != null) {
      map.flyTo(center, zoom ?? defaultZoom, { duration: 0.8 });
    }
  }, [map, center?.[0], center?.[1], zoom]);
  return null;
}

// Fixes Leaflet's "tiles only fill part of the container" bug.
// Leaflet captures container size at mount; if the layout hasn't finished
// (route transition, theme switch, sidebar collapse, etc.) it sizes wrong.
// We call invalidateSize() after mount + on any container resize.
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    // Multiple staggered calls cover slow layout passes (fonts, fly-in
    // animations, MUI Grid breakpoint shifts).
    const timers = [50, 250, 600, 1200].map((ms) =>
      setTimeout(() => map.invalidateSize({ animate: false }), ms)
    );

    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    observer.observe(container);

    const onWinResize = () => map.invalidateSize({ animate: false });
    window.addEventListener("resize", onWinResize);

    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
  }, [map]);
  return null;
}

/**
 * Props:
 *   locations: [{ id, name, lat, lng, description, scoreColor?, rank?, renderPopup? }]
 *   center: [lat,lng]           — optional; if provided, map flies here on change
 *   zoom: number                — default 13
 *   selectedId: string          — optional; when set, popup auto-opens on that marker
 */
export default function MapView({ locations = [], center, zoom = defaultZoom, selectedId }) {
  const mapCenter = center && center[0] != null && center[1] != null ? center : defaultCenter;
  const markerRefs = useRef({});

  // Stable map key — only remounts when the locations list actually changes
  const locationsKey = useMemo(
    () => locations.map((l) => l.id).join("|"),
    [locations]
  );

  // Open popup for selected marker whenever selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    // slight delay lets the icon-swap finish first so the popup anchors correctly
    const t = setTimeout(() => {
      const m = markerRefs.current[selectedId];
      if (m && m.openPopup) m.openPopup();
    }, 50);
    return () => clearTimeout(t);
  }, [selectedId, locationsKey]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ width: "100%", height: "100%", borderRadius: 16 }}
      scrollWheelZoom={false}
      attributionControl={false}
    >
      <TileLayer
        attribution=""
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateOnResize />
      {center && <FlyToSelected center={center} zoom={zoom} />}

      {locations.map((loc) => {
        const selected = loc.id === selectedId;
        const icon = loc.scoreColor
          ? getCachedIcon(loc.scoreColor, String(loc.rank ?? ""), selected)
          : null;

        return (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            {...(icon ? { icon } : {})}
            zIndexOffset={selected ? 1000 : 0}
            ref={(r) => {
              if (r) markerRefs.current[loc.id] = r;
              else delete markerRefs.current[loc.id];
            }}
          >
            <Popup minWidth={240} maxWidth={320}>
              {loc.renderPopup ? (
                loc.renderPopup()
              ) : (
                <>
                  <strong>{loc.name}</strong>
                  {loc.description ? <div style={{ marginTop: 4 }}>{loc.description}</div> : null}
                </>
              )}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
