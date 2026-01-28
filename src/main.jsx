import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css";

// Add error handler for unhandled errors
window.addEventListener("error", (event) => {
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
