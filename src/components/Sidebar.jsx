import React from "react";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import InsightsIcon from "@mui/icons-material/Insights";
import PersonIcon from "@mui/icons-material/PersonOutline";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import EventIcon from "@mui/icons-material/Event";
import ShareIcon from "@mui/icons-material/Share";
import EmailIcon from "@mui/icons-material/Email";
import PeopleIcon from "@mui/icons-material/People";
import StoreIcon from "@mui/icons-material/Store";
import PlaceIcon from "@mui/icons-material/Place";
import TimelineIcon from "@mui/icons-material/Timeline";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BarChartIcon from "@mui/icons-material/BarChart";
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

  const isAdminPage = location.pathname.startsWith("/admin");
  const onAdminDashboard = location.pathname === "/admin";
  const tabParam = searchParams.get("tab") || "overview";

  const adminNavItems = [
    { label: "Dashboard", icon: <AdminPanelSettingsIcon />, path: "/admin", tab: "overview" },
    { label: "Add User / Users", icon: <PeopleIcon />, path: "/admin", tab: "users" },
    { label: "Add Business Type", icon: <StoreIcon />, path: "/admin", tab: "business" },
    { label: "Add Location", icon: <PlaceIcon />, path: "/admin", tab: "locations" },
    { label: "User Inputs", icon: <TimelineIcon />, path: "/admin", tab: "inputs" },
    { label: "Transaction History", icon: <ReceiptLongIcon />, path: "/admin", tab: "transactions" },
    { label: "Analytics", icon: <BarChartIcon />, path: "/admin", tab: "analytics" },
    { label: "Schedule Meeting", icon: <EventIcon />, path: "/admin/meetings", tab: null },
    { label: "Social Media", icon: <ShareIcon />, path: "/admin/social-media", tab: null },
    { label: "Mail", icon: <EmailIcon />, path: "/admin/mail", tab: null },
  ];

  const userNavItems = [
    { label: "Home", icon: <MapIcon />, path: "/" },
    { label: "Input dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { label: "Recommendations", icon: <InsightsIcon />, path: "/recommendations" },
    { label: "Profile", icon: <PersonIcon />, path: "/profile" },
    { label: "Subscribe to Pro", icon: <CardMembershipIcon />, path: "/subscribe" },
    ...(isAdmin && !isAdminPage ? [{ label: "Admin", icon: <AdminPanelSettingsIcon />, path: "/admin", tab: null }] : []),
  ];

  const navItems = isAdminPage ? adminNavItems : userNavItems;

  const baseItemSx = {
    mx: 1.5,
    mb: 0.25,
    borderRadius: 1.5,
    py: 1,
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    "&:hover": {
      bgcolor: mode === "dark" ? "rgba(13, 148, 136, 0.08)" : "rgba(13, 148, 136, 0.06)",
      "& .MuiListItemIcon-root": { color: "primary.main" },
      "& .MuiListItemText-primary": { color: "primary.main" },
    },
  };

  const selectedItemSx = {
    ...baseItemSx,
    borderLeft: "3px solid",
    borderColor: "primary.main",
    bgcolor: mode === "dark" ? "rgba(13, 148, 136, 0.12)" : "rgba(13, 148, 136, 0.08)",
    "& .MuiListItemIcon-root": { color: "primary.main" },
    "& .MuiListItemText-primary": { fontWeight: 600 },
  };

  return (
    <Box component="nav" sx={{ width: drawerWidth, flexShrink: 0, display: { xs: "none", md: "block" } }}>
      <Drawer
        variant="permanent"
        sx={{
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: "none",
          },
        }}
        open
      >
        <Toolbar sx={{ px: 2.5, py: 2 }}>
          <Typography
            variant="h6"
            fontWeight={700}
            color="primary"
            component="span"
            onClick={() => navigate("/")}
            sx={{ cursor: "pointer", fontSize: "1.1rem" }}
          >
            SmartLoc
          </Typography>
        </Toolbar>
        {isAdminPage && (
          <Typography variant="overline" sx={{ px: 2.5, pt: 0.5, pb: 0.5, display: "block", color: "text.secondary", letterSpacing: 1 }}>
            Admin
          </Typography>
        )}
        <List sx={{ px: 1, py: 0.5 }}>
          {navItems.map((item) => {
            const isSelected =
              item.tab != null
                ? onAdminDashboard && tabParam === item.tab
                : location.pathname === item.path;
            return (
              <ListItemButton
                key={item.path + (item.tab ?? "")}
                selected={false}
                onClick={() => navigate(item.tab != null ? `${item.path}?tab=${item.tab}` : item.path)}
                sx={isSelected ? selectedItemSx : baseItemSx}
              >
                <ListItemIcon sx={{ minWidth: 36, color: isSelected ? "primary.main" : "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ variant: "body2", fontWeight: isSelected ? 600 : 400 }} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>
    </Box>
  );
}
