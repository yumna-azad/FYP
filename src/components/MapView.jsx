import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default icon issue in many bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Colored divIcons for score bands
function coloredIcon(color) {
  return L.divIcon({
    className: "smartloc-pin",
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
    html: `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>`,
  });
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

/**
 * Props:
 *   locations: [{ id, name, lat, lng, description, scoreColor?, renderPopup? }]
 *   center: [lat,lng]           — optional; if provided, map flies here on change
 *   zoom: number                — default 13
 *   selectedId: string          — optional; when set, popup auto-opens on that marker
 */
export default function MapView({ locations = [], center, zoom = defaultZoom, selectedId }) {
  const mapCenter = center && center[0] != null && center[1] != null ? center : defaultCenter;
  const markerRefs = useRef({});

  // Open popup for selected marker whenever selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    const m = markerRefs.current[selectedId];
    if (m) m.openPopup();
  }, [selectedId]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ width: "100%", height: "100%", borderRadius: 16 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {center && <FlyToSelected center={center} zoom={zoom} />}

      {locations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.lat, loc.lng]}
          icon={loc.scoreColor ? coloredIcon(loc.scoreColor) : undefined}
          ref={(r) => {
            if (r) markerRefs.current[loc.id] = r;
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
      ))}
    </MapContainer>
  );
}
