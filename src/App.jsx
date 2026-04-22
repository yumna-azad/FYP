import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, Box } from "@mui/material";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import Chatbot from "./components/Chatbot.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import RecommendationsPage from "./pages/RecommendationsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AdminMeetingsPage from "./pages/AdminMeetingsPage.jsx";
import AdminSocialMediaPage from "./pages/AdminSocialMediaPage.jsx";
import AdminMailPage from "./pages/AdminMailPage.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CssBaseline />
        <AuthProvider>
          <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
            <ErrorBoundary>
              <Sidebar />
            </ErrorBoundary>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <ErrorBoundary>
                <TopBar />
              </ErrorBoundary>
              <Box component="main" sx={{ flex: 1, p: 3, minHeight: 0 }}>
                <Routes>
                  <Route path="/" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
                  <Route path="/login" element={<ErrorBoundary><LoginPage /></ErrorBoundary>} />
                  <Route path="/register" element={<ErrorBoundary><RegisterPage /></ErrorBoundary>} />
                  <Route path="/dashboard" element={<ProtectedRoute><ErrorBoundary><DashboardPage /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/recommendations" element={<ProtectedRoute><ErrorBoundary><RecommendationsPage /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ErrorBoundary><ProfilePage /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute requireAdmin><ErrorBoundary><AdminPage /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/meetings" element={<ProtectedRoute requireAdmin><ErrorBoundary><AdminMeetingsPage /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/social-media" element={<ProtectedRoute requireAdmin><ErrorBoundary><AdminSocialMediaPage /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="/admin/mail" element={<ProtectedRoute requireAdmin><ErrorBoundary><AdminMailPage /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Box>
            </Box>
          </Box>
          <ErrorBoundary>
            <Chatbot />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
