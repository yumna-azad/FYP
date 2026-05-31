import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import L from "leaflet";
// Note: marker PNG imports handled via mergeOptions below
import App from "./App.jsx";
import "./styles.css";


// Fix Leaflet default marker icons broken by Vite's asset bundling
// Use CDN paths so Vite bundling doesn't interfere with icon resolution
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
// Defensive patch: Leaflet's Marker._removeIcon can throw during React
// StrictMode's double-unmount (dev only) when this._icon has already been
// nulled. Guard it so the second cleanup pass is a no-op.
// https://github.com/PaulLeCam/react-leaflet/issues/936
const _origRemoveIcon = L.Marker.prototype._removeIcon;
L.Marker.prototype._removeIcon = function () {
  if (!this._icon) return;
  try {
    return _origRemoveIcon.apply(this, arguments);
  } catch (e) {
    // Swallow only the known "_leaflet_events on undefined" race condition
    if (String(e?.message || "").includes("_leaflet_events")) return;
    throw e;
  }
};

// Errors we don't want to blow away the whole UI for. These are cleanup-phase
// races from Leaflet / react-leaflet that don't affect the running app.
const IGNORABLE_ERROR_PATTERNS = [
  /_leaflet_events/i,
  /_removeIcon/i,
  /ResizeObserver loop/i,
];

function isIgnorableError(err) {
  const message = String(err?.message || err || "");
  const stack = String(err?.stack || "");
  return IGNORABLE_ERROR_PATTERNS.some((p) => p.test(message) || p.test(stack));
}

// Global error handler for catastrophic errors — but skip the known benign ones
window.addEventListener("error", (event) => {
  if (isIgnorableError(event.error)) {
    console.warn("[suppressed harmless error]:", event.error?.message);
    event.preventDefault();
    return;
  }
  console.error("Global error:", event.error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: Arial; color: red;">
        <h1>JavaScript Error Detected</h1>
        <p><strong>Error:</strong> ${event.error?.message || "Unknown error"}</p>
        <p><strong>File:</strong> ${event.filename}</p>
        <p><strong>Line:</strong> ${event.lineno}</p>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${event.error?.stack || "No stack trace"}</pre>
      </div>
    `;
  }
});

// Add unhandled promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  if (isIgnorableError(event.reason)) {
    event.preventDefault();
    return;
  }
  console.error("Unhandled promise rejection:", event.reason);
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found!");
  }

  console.log("Root element found, creating React root...");
  const root = ReactDOM.createRoot(rootElement);
  
  console.log("Rendering App...");
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  
  console.log("App rendered successfully!");
} catch (error) {
  console.error("Failed to render app:", error);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial; color: red;">
        <h1>Failed to Load App</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack}</pre>
        <p>Please check the browser console (F12) for more details.</p>
      </div>
    `;
  }
}
