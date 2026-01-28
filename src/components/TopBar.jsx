import React from "react";
import { AppBar, Box, Button, Toolbar, Avatar, Typography, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function TopBar() {
  const navigate = useNavigate();
  const { isAuthenticated, user, profilePic, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();

  const displayName = user?.name || user?.email || "Guest";
  const role = user?.role || "Location planner";
  const initial = (displayName || "U").trim().charAt(0).toUpperCase();

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ borderBottom: "1px solid rgba(148,163,184,0.2)" }}
    >
      <Toolbar sx={{ justifyContent: "flex-end", gap: 2 }}>
        {/* Theme Toggle */}
        <IconButton onClick={toggleTheme} color="inherit" size="small">
          {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        {isAuthenticated ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="body2" fontWeight={600}>
                  {displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {role}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: "primary.main" }} src={profilePic || undefined}>
                {!profilePic ? initial : null}
              </Avatar>
            </Box>
            <Button variant="outlined" size="small" onClick={() => logout()} sx={{ borderRadius: 2 }}>
              Logout
            </Button>
          </>
        ) : (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="text" size="small" onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button variant="contained" size="small" onClick={() => navigate("/register")} sx={{ borderRadius: 2 }}>
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
