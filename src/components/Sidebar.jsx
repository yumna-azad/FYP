import React from "react";
import { Box, Drawer, Stack, Typography } from "@mui/material";
import {
  Home,
  LayoutDashboard,
  Compass,
  User,
  Shield,
  Users,
  Store,
  MapPin,
  LineChart,
  Receipt,
  BarChart3,
  CalendarDays,
  Share2,
  Mail,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const drawerWidth = 240;

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const isAdminPage = location.pathname.startsWith("/admin");
  const onAdminDashboard = location.pathname === "/admin";
  const tabParam = searchParams.get("tab") || "overview";

  const iconProps = { size: 16, strokeWidth: 1.5 };

  const adminNavItems = [
    { label: "Dashboard", path: "/admin", tab: "overview", icon: <Shield {...iconProps} /> },
    { label: "Users", path: "/admin", tab: "users", icon: <Users {...iconProps} /> },
    { label: "Business types", path: "/admin", tab: "business", icon: <Store {...iconProps} /> },
    { label: "Locations", path: "/admin", tab: "locations", icon: <MapPin {...iconProps} /> },
    { label: "User inputs", path: "/admin", tab: "inputs", icon: <LineChart {...iconProps} /> },
    { label: "Transactions", path: "/admin", tab: "transactions", icon: <Receipt {...iconProps} /> },
    { label: "Analytics", path: "/admin", tab: "analytics", icon: <BarChart3 {...iconProps} /> },
    { label: "Meetings", path: "/admin/meetings", tab: null, icon: <CalendarDays {...iconProps} /> },
    { label: "Social", path: "/admin/social-media", tab: null, icon: <Share2 {...iconProps} /> },
    { label: "Mail", path: "/admin/mail", tab: null, icon: <Mail {...iconProps} /> },
  ];

  const userNavItems = [
    { label: "Home", path: "/", icon: <Home {...iconProps} /> },
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard {...iconProps} /> },
    { label: "Recommendations", path: "/recommendations", icon: <Compass {...iconProps} /> },
    { label: "Profile", path: "/profile", icon: <User {...iconProps} /> },
    ...(isAdmin && !isAdminPage
      ? [{ label: "Admin", path: "/admin", tab: null, icon: <Shield {...iconProps} /> }]
      : []),
  ];

  const navItems = isAdminPage ? adminNavItems : userNavItems;

  const ink = isDark ? "#f5f3ee" : "#0a0a0a";
  const inkSoft = isDark ? "rgba(245,243,238,0.5)" : "rgba(10,10,10,0.5)";
  const hair = isDark ? "rgba(245,243,238,0.08)" : "rgba(10,10,10,0.08)";
  const bg = isDark ? "#0b0f0e" : "#faf8f3";

  return (
    <Box component="nav" sx={{ width: drawerWidth, flexShrink: 0, display: { xs: "none", md: "block" } }}>
      <Drawer
        variant="permanent"
        sx={{
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: `1px solid ${hair}`,
            bgcolor: bg,
            boxShadow: "none",
            display: "flex",
            flexDirection: "column",
          },
        }}
        open
      >
        {/* Wordmark */}
        <Box sx={{ px: 3, pt: 4, pb: 6 }}>
          <Typography
            className="font-display"
            onClick={() => navigate("/")}
            sx={{
              cursor: "pointer",
              fontSize: "1.625rem",
              letterSpacing: "-0.03em",
              color: ink,
              lineHeight: 1,
            }}
          >
            Smart<Box component="em" sx={{ fontStyle: "italic", color: inkSoft, fontWeight: 400 }}>Loc</Box>
          </Typography>
          <Typography
            sx={{
              mt: 1,
              fontSize: 10,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: inkSoft,
              fontWeight: 500,
            }}
          >
            {isAdminPage ? "Admin" : "Nuwara Eliya"}
          </Typography>
        </Box>

        {/* Section label */}
        <Box sx={{ px: 3, pb: 2 }}>
          <Typography
            sx={{
              fontSize: 10,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: inkSoft,
              fontWeight: 500,
            }}
          >
            {isAdminPage ? "Manage" : "Navigate"}
          </Typography>
        </Box>

        {/* Nav */}
        <Stack component="ul" sx={{ px: 3, m: 0, listStyle: "none", gap: 0 }}>
          {navItems.map((item) => {
            const isSelected =
              item.tab != null
                ? onAdminDashboard && tabParam === item.tab
                : location.pathname === item.path;
            return (
              <Box
                component="li"
                key={item.path + (item.tab ?? "")}
                onClick={() =>
                  navigate(item.tab != null ? `${item.path}?tab=${item.tab}` : item.path)
                }
                sx={{
                  cursor: "pointer",
                  py: 1.15,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  color: isSelected ? ink : inkSoft,
                  fontSize: "0.9375rem",
                  fontWeight: isSelected ? 500 : 400,
                  position: "relative",
                  transition: "color 0.2s ease",
                  "&:hover": { color: ink },
                  "&:hover .marker": { opacity: isSelected ? 1 : 0.35 },
                }}
              >
                <Box
                  className="marker"
                  sx={{
                    position: "absolute",
                    left: -12,
                    width: 6,
                    height: 1,
                    bgcolor: ink,
                    opacity: isSelected ? 1 : 0,
                    transition: "opacity 0.2s ease",
                  }}
                />
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    color: "inherit",
                    opacity: isSelected ? 0.9 : 0.6,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {item.icon}
                </Box>
                <Box component="span">{item.label}</Box>
              </Box>
            );
          })}
        </Stack>

        {/* Footer */}
        <Box sx={{ flex: 1 }} />
        <Box sx={{ px: 3, py: 3, borderTop: `1px solid ${hair}` }}>
          <Typography sx={{ fontSize: 11, color: inkSoft, lineHeight: 1.6 }}>
            Location intelligence<br />for the hill country.
          </Typography>
        </Box>
      </Drawer>
    </Box>
  );
}
