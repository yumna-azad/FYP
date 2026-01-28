import React, { useEffect } from "react";
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
  shadowUrl: markerShadow
});

const defaultCenter = [6.9497, 80.7891]; // Nuwara Eliya
const defaultZoom = 13;

function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] != null && center[1] != null) {
      map.setView(center, zoom ?? defaultZoom);
    }
  }, [map, center, zoom]);
  return null;
}

/**
 * Reusable Leaflet map centered on Nuwara Eliya.
 * Accepts optional: locations [{ id, name, lat, lng, description }], center [lat,lng], zoom.
 */
export default function MapView({ locations = [], center, zoom = defaultZoom }) {
  const mapCenter = center && center[0] != null && center[1] != null ? center : defaultCenter;
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
      {center && <MapCenterUpdater center={center} zoom={zoom} />}

      {locations.map((loc) => (
        <Marker key={loc.id} position={[loc.lat, loc.lng]}>
          <Popup>
            <strong>{loc.name}</strong>
            {loc.description ? <div style={{ marginTop: 4 }}>{loc.description}</div> : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

