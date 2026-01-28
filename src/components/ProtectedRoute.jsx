import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Renders children only if the user is authenticated; otherwise redirects to /login.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { pathname } = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: pathname }} replace />;
  }
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
