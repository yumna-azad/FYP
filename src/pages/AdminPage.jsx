import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import StoreIcon from "@mui/icons-material/Store";
import PlaceIcon from "@mui/icons-material/Place";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import TimelineIcon from "@mui/icons-material/Timeline";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { useSearchParams } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { adminAPI, useMockData } from "../lib/api.js";

// Fallback data for when API is not available
const ADMIN_STORAGE_KEY = "smartloc_admin_locations";
const ADMIN_USERS_KEY = "smartloc_admin_users";
const ADMIN_BUSINESS_TYPES_KEY = "smartloc_admin_business_types";

const defaultUsers = [
  { id: 1, name: "John Smith", email: "john@example.com", subscription_plan_id: null, status: "Active", lastActive: "2 hours ago" },
  { id: 2, name: "Sarah Johnson", email: "sarah@example.com", subscription_plan_id: null, status: "Active", lastActive: "1 day ago" },
];

const defaultBusinessTypes = [
  { id: 1, name: "Cafe", count: 456, growth: "+12%" },
  { id: 2, name: "Restaurant", count: 892, growth: "+8%" },
  { id: 3, name: "Hotel", count: 234, growth: "+15%" },
  { id: 4, name: "Retail Shop", count: 567, growth: "+6%" },
  { id: 5, name: "Wellness Center", count: 189, growth: "+18%" },
];

const defaultLocations = [
  { id: "1", name: "Town Centre - Main Street", address: "Main Street, Nuwara Eliya 22200", type: "Commercial District", score: 92 },
];

function loadData(key, defaultData) {
  try {
    const s = localStorage.getItem(key);
    if (s) return JSON.parse(s);
  } catch {}
  return defaultData;
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Mock transaction history for admin management
const defaultTransactions = [
  { id: "t1", date: "2024-01-15", user: "John Smith", type: "Subscription Pro", amount: "LKR 9,990", status: "Completed" },
  { id: "t2", date: "2024-01-14", user: "Sarah Johnson", type: "Free tier", amount: ".", status: "Active" },
  { id: "t3", date: "2024-01-12", user: "Admin", type: "Location export", amount: ".", status: "Completed" },
  { id: "t4", date: "2024-01-10", user: "System", type: "Plan renewal", amount: "LKR 9,990", status: "Completed" },
];

const OVERVIEW_CHART_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const overviewVisits = [12, 19, 15, 22, 18, 24, 20];
const overviewActivity = [8, 14, 18, 16, 22, 19, 25];
const overviewMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const overviewMonthly = [4, 6, 10, 8, 12, 9];

const overviewAreaData = OVERVIEW_CHART_DAYS.map((day, i) => ({
  day,
  visits: overviewVisits[i],
  activity: overviewActivity[i],
}));
const overviewBarData = overviewMonths.map((m, i) => ({ month: m, count: overviewMonthly[i] }));
const SPARKLINE_COLORS = ["#0d9488", "#059669", "#0891b2", "#f59e0b", "#94a3b8"];

export default function AdminPage() {
  const useMock = useMockData();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  const setTab = (value) => {
    setSearchParams({ tab: value }, { replace: true });
  };
  const [transactions] = useState(() => {
    try {
      const s = localStorage.getItem("smartloc_admin_transactions");
      return s ? JSON.parse(s) : defaultTransactions;
    } catch { return defaultTransactions; }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [users, setUsers] = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [areas, setAreas] = useState([]); // Nuwara Eliya neighbourhood data used by ML service
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [submissions, setSubmissions] = useState([]); // User inputs from Location Finder (MySQL via Laravel)
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (useMock) {
        // Use localStorage fallback (5 business types by default)
        setUsers(loadData(ADMIN_USERS_KEY, defaultUsers));
        const loadedBusiness = loadData(ADMIN_BUSINESS_TYPES_KEY, defaultBusinessTypes);
        setBusinessTypes(Array.isArray(loadedBusiness) && loadedBusiness.length > 0 ? loadedBusiness : defaultBusinessTypes);
        setLocations(loadData(ADMIN_STORAGE_KEY, defaultLocations));
        setPlans([]);
        const currentUsers = loadData(ADMIN_USERS_KEY, defaultUsers);
        const currentBusinessTypes = Array.isArray(loadedBusiness) && loadedBusiness.length > 0 ? loadedBusiness : defaultBusinessTypes;
        const currentLocations = loadData(ADMIN_STORAGE_KEY, defaultLocations);
        setStats({
          totalUsers: String(currentUsers.length),
          businessTypes: String(currentBusinessTypes.length),
          locations: String(currentLocations.length),
          activeSessions: "0",
          usersChange: "+0%",
          businessTypesChange: "+0",
          locationsChange: "+0",
          sessionsChange: "+0%",
        });
        setAnalytics(null);
        setSubmissions([]);
      } else {
        // Fetch from Laravel/MySQL - when user inputs something, admin sees it here
        const [usersData, businessTypesData, locationsData, plansData, statsData, analyticsData, submissionsData, areasData] = await Promise.all([
          adminAPI.getUsers().catch(() => ({ data: [] })),
          adminAPI.getBusinessTypes().catch(() => ({ data: [] })),
          adminAPI.getLocations().catch(() => ({ data: [] })),
          adminAPI.getPlans().catch(() => ({ data: [] })),
          adminAPI.getStats().catch(() => null),
          adminAPI.getAnalytics().catch(() => null),
          adminAPI.getSubmissions().catch(() => ({ data: [] })),
          adminAPI.getAreas().catch(() => ({ data: [] })),
        ]);

        setUsers(usersData.data || usersData || []);
        setBusinessTypes(businessTypesData.data || businessTypesData || []);
        setLocations(locationsData.data || locationsData || []);
        setPlans(plansData.data || plansData || []);
        setSubmissions(submissionsData.data || submissionsData || []);
        setAreas(areasData.data || areasData || []);
        setStats(statsData || {
          totalUsers: String(usersData.data?.length || 0),
          businessTypes: String(businessTypesData.data?.length || 0),
          locations: String(locationsData.data?.length || 0),
          activeSessions: "0",
          usersChange: "+0%",
          businessTypesChange: "+0",
          locationsChange: "+0",
          sessionsChange: "+0%",
        });
        setAnalytics(analyticsData || null);
      }
    } catch (err) {
      setError(err.message || "Failed to load data");
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Save to localStorage if using mock
  useEffect(() => {
    if (useMock) {
      saveData(ADMIN_USERS_KEY, users);
      saveData(ADMIN_BUSINESS_TYPES_KEY, businessTypes);
      saveData(ADMIN_STORAGE_KEY, locations);
    }
  }, [useMock, users, businessTypes, locations]);

  const displayStats = stats ? [
    { label: "Total Users", value: stats.totalUsers, change: stats.usersChange, icon: PeopleIcon },
    { label: "Business Types", value: stats.businessTypes, change: stats.businessTypesChange, icon: StoreIcon },
    { label: "Locations", value: stats.locations, change: stats.locationsChange, icon: PlaceIcon },
    { label: "Active Sessions", value: stats.activeSessions, change: stats.sessionsChange, icon: TimelineIcon },
  ] : [];

  const openCreate = (type) => {
    setDialogType(type);
    setEditingId(null);
    if (type === "user") {
      const defaultPlanId = plans.length > 0 ? plans[0].id : null;
      setForm({ name: "", email: "", subscription_plan_id: defaultPlanId, status: "Active" });
    }
    if (type === "business") setForm({ name: "", count: "", growth: "+0%" });
    if (type === "location") setForm({ name: "", address: "", type: "", score: "" });
    if (type === "area") setForm({
      name: "",
      rent_indicative_lkr: 0,
      price_per_perch_lkr: 0,
      footfall_weight: 0.5,
      competition_weight: 0.5,
      latitude: null,
      longitude: null,
      tags: [],
      customer_types: [],
      best_for: [],
      main_risk: "",
      strategy: "",
      recommended_action: "",
      data_completeness: 3,
    });
    setDialogOpen(true);
  };

  const openEdit = (type, item) => {
    setDialogType(type);
    setEditingId(item.id);
    setForm({ ...item });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (dialogType === "user") {
        const { name, email, subscription_plan_id, status } = form;
        if (!name || !email) return;
        
        if (useMock) {
          if (editingId) {
            setUsers((prev) => prev.map((u) => (u.id === editingId ? { ...u, name, email, subscription_plan_id, status } : u)));
          } else {
            setUsers((prev) => [...prev, { id: Date.now(), name, email, subscription_plan_id, status, lastActive: "Just now" }]);
          }
        } else {
          if (editingId) {
            await adminAPI.updateUser(editingId, { name, email, subscription_plan_id, status });
          } else {
            await adminAPI.createUser({ name, email, subscription_plan_id, status });
          }
          await loadAllData();
        }
      }
      
      if (dialogType === "business") {
        const { name, count, growth } = form;
        if (!name) return;
        
        if (useMock) {
          if (editingId) {
            setBusinessTypes((prev) => prev.map((b) => (b.id === editingId ? { ...b, name, count: parseInt(count) || 0, growth } : b)));
          } else {
            setBusinessTypes((prev) => [...prev, { id: Date.now(), name, count: parseInt(count) || 0, growth }]);
          }
        } else {
          if (editingId) {
            await adminAPI.updateBusinessType(editingId, { name, count: parseInt(count) || 0, growth });
          } else {
            await adminAPI.createBusinessType({ name, count: parseInt(count) || 0, growth });
          }
          await loadAllData();
        }
      }
      
      if (dialogType === "area") {
        const payload = {
          ...form,
          rent_indicative_lkr: Number(form.rent_indicative_lkr) || 0,
          price_per_perch_lkr: Number(form.price_per_perch_lkr) || 0,
          footfall_weight: Number(form.footfall_weight) || 0,
          competition_weight: Number(form.competition_weight) || 0,
          latitude: form.latitude !== "" && form.latitude !== null ? Number(form.latitude) : null,
          longitude: form.longitude !== "" && form.longitude !== null ? Number(form.longitude) : null,
          data_completeness: Number(form.data_completeness) || 3,
          // Normalise comma-separated chip strings → arrays if user typed commas.
          tags: Array.isArray(form.tags) ? form.tags : String(form.tags || "").split(",").map((s) => s.trim()).filter(Boolean),
          customer_types: Array.isArray(form.customer_types) ? form.customer_types : String(form.customer_types || "").split(",").map((s) => s.trim()).filter(Boolean),
          best_for: Array.isArray(form.best_for) ? form.best_for : String(form.best_for || "").split(",").map((s) => s.trim()).filter(Boolean),
        };
        if (!payload.name) return;
        if (editingId) {
          await adminAPI.updateArea(editingId, payload);
        } else {
          await adminAPI.createArea(payload);
        }
        await loadAllData();
      }

      if (dialogType === "location") {
        const { name, address, type, score } = form;
        if (!name) return;
        
        if (useMock) {
          if (editingId) {
            setLocations((prev) => prev.map((l) => (l.id === String(editingId) ? { ...l, name, address, type, score: parseInt(score) || 0 } : l)));
          } else {
            setLocations((prev) => [...prev, { id: String(Date.now()), name, address, type, score: parseInt(score) || 0 }]);
          }
        } else {
          if (editingId) {
            await adminAPI.updateLocation(editingId, { name, address, type, score: parseInt(score) || 0 });
          } else {
            await adminAPI.createLocation({ name, address, type, score: parseInt(score) || 0 });
          }
          await loadAllData();
        }
      }
      
      setDialogOpen(false);
    } catch (err) {
      setError(err.message || "Failed to save");
      console.error("Save failed:", err);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm("Delete this item?")) return;
    
    try {
      if (useMock) {
        if (type === "user") setUsers((prev) => prev.filter((u) => u.id !== id));
        if (type === "business") setBusinessTypes((prev) => prev.filter((b) => b.id !== id));
        if (type === "location") setLocations((prev) => prev.filter((l) => l.id !== String(id)));
      } else {
        if (type === "user") await adminAPI.deleteUser(id);
        if (type === "business") await adminAPI.deleteBusinessType(id);
        if (type === "location") await adminAPI.deleteLocation(id);
        if (type === "area") await adminAPI.deleteArea(id);
        await loadAllData();
      }
    } catch (err) {
      setError(err.message || "Failed to delete");
      console.error("Delete failed:", err);
    }
  };

  const filteredUsers = users.filter((u) => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserPlanName = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user?.subscription_plan_id) return "No plan";
    const plan = plans.find((p) => p.id === user.subscription_plan_id);
    return plan?.name || "Unknown";
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", overflowY: "auto" }}>
      <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Header */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Admin Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Admin management: users, business types, locations, transactions
            </Typography>
          </Box>
          {(tab === "users" || tab === "business" || tab === "locations" || tab === "areas") && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openCreate(
                tab === "users" ? "user" :
                tab === "business" ? "business" :
                tab === "areas" ? "area" :
                "location"
              )}
              sx={{ borderRadius: 2 }}
            >
              {tab === "users" ? "Add User" :
               tab === "business" ? "Add Business Type" :
               tab === "areas" ? "Add Area" :
               "Add Location"}
            </Button>
          )}
        </Box>

        {/* Stats */}
        {displayStats.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {displayStats.map((stat) => (
              <Grid item xs={6} lg={3} key={stat.label}>
                <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, transition: "all 0.3s", "&:hover": { boxShadow: 4 } }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {stat.label}
                        </Typography>
                        <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: "block" }}>
                          {stat.change} from last month
                        </Typography>
                      </Box>
                      <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: "rgba(13, 148, 136, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <stat.icon sx={{ fontSize: 24, color: "primary.main" }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Content (sidebar drives tab via ?tab=) */}
        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          {/* Overview */}
          {tab === "overview" && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                Admin overview
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Key metrics and activity at a glance
              </Typography>

              {/* KPI cards with sparklines */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: "Total Users", value: stats?.totalUsers ?? users.length, change: "+25%", icon: PeopleIcon, color: SPARKLINE_COLORS[0], spark: [2, 4, 5, 6, 8, 7, 9] },
                  { label: "Total Revenue", value: "LKR 19.9K", change: "+18%", icon: AttachMoneyIcon, color: SPARKLINE_COLORS[1], spark: [4, 5, 6, 7, 8, 9, 10] },
                  { label: "Locations", value: stats?.locations ?? locations.length, change: "+0%", icon: PlaceIcon, color: SPARKLINE_COLORS[2], spark: [1, 2, 2, 3, 3, 3, 4] },
                  { label: "Business Types", value: stats?.businessTypes ?? businessTypes.length, change: "+0%", icon: StoreIcon, color: SPARKLINE_COLORS[3], spark: [3, 4, 5, 5, 5, 5, 5] },
                  { label: "User Inputs", value: submissions.length, change: useMock ? "." : ".", icon: TimelineIcon, color: SPARKLINE_COLORS[0], spark: [0, 1, 2, 2, 3, 3, 4] },
                  { label: "Transactions", value: transactions.length, change: ".", icon: ReceiptLongIcon, color: SPARKLINE_COLORS[4], spark: [2, 3, 3, 4, 4, 4, 4] },
                ].map((k, idx) => (
                  <Grid item xs={6} md={4} lg={2} key={k.label}>
                    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, height: "100%" }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                            <Typography variant="h6" fontWeight={700}>{k.value}</Typography>
                            <Typography variant="caption" sx={{ color: k.change.startsWith("+") ? "success.main" : "text.secondary" }}>{k.change}</Typography>
                          </Box>
                          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <k.icon sx={{ fontSize: 22, color: k.color }} />
                          </Box>
                        </Box>
                        <Box sx={{ height: 28, mt: 0.5 }}>
                          <ResponsiveContainer width="100%" height={28}>
                            <LineChart data={k.spark.map((v, i) => ({ v, i }))} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                              <Line type="monotone" dataKey="v" stroke={k.color} strokeWidth={1.5} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Charts row: Area chart + Bar chart + Donut + Quick actions */}
              <Grid container spacing={2}>
                <Grid item xs={12} lg={7}>
                  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, height: "100%" }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Activity overview</Typography>
                      <Box sx={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={overviewAreaData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis domain={[0, 30]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={24} />
                            <Tooltip contentStyle={{ borderRadius: 8 }} />
                            <Area type="monotone" dataKey="visits" stroke="#f59e0b" fill="url(#visitsFill)" strokeWidth={2} name="Visits" />
                            <Area type="monotone" dataKey="activity" stroke="#0d9488" fill="url(#activityFill)" strokeWidth={2} name="Activity" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                      <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                        <Chip size="small" label="Visits" sx={{ bgcolor: "rgba(245, 158, 11, 0.2)", color: "#f59e0b" }} />
                        <Chip size="small" label="Activity" sx={{ bgcolor: "rgba(13, 148, 136, 0.2)", color: "primary.main" }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} lg={5}>
                  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, height: "100%" }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Registrations by month</Typography>
                      <Box sx={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={overviewBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis domain={[0, 14]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={20} />
                            <Tooltip contentStyle={{ borderRadius: 8 }} cursor={{ fill: "rgba(13,148,136,0.06)" }} />
                            <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Registrations" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Business types</Typography>
                      {businessTypes.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No business types yet.</Typography>
                      ) : (
                        <Box sx={{ height: 180, display: "flex", alignItems: "center", gap: 2 }}>
                          <Box sx={{ width: "50%", height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={businessTypes.map((t, i) => ({ name: t.name, value: t.count || 0 }))}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={48}
                                  outerRadius={72}
                                  paddingAngle={2}
                                  dataKey="value"
                                  label={({ name, value }) => `${name} ${value}`}
                                >
                                  {businessTypes.map((_, i) => (
                                    <Cell key={i} fill={["#0d9488", "#059669", "#0891b2", "#f59e0b", "#94a3b8"][i % 5]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v) => [v, "Count"]} contentStyle={{ borderRadius: 8 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            {businessTypes.slice(0, 5).map((t, i) => (
                              <Box key={t.id} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: ["#0d9488", "#059669", "#0891b2", "#f59e0b", "#94a3b8"][i % 5] }} />
                                <Typography variant="body2">{t.name}</Typography>
                                <Chip label={t.count} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Quick admin actions</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Manage users, business types, locations, and view transactions from the sidebar.</Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        <Button size="small" variant="outlined" startIcon={<PeopleIcon />} onClick={() => setTab("users")}>Add User</Button>
                        <Button size="small" variant="outlined" startIcon={<StoreIcon />} onClick={() => setTab("business")}>Add Business Type</Button>
                        <Button size="small" variant="outlined" startIcon={<PlaceIcon />} onClick={() => setTab("locations")}>Add Location</Button>
                        <Button size="small" variant="outlined" startIcon={<TimelineIcon />} onClick={() => setTab("inputs")}>User Inputs</Button>
                        <Button size="small" variant="outlined" startIcon={<ReceiptLongIcon />} onClick={() => setTab("transactions")}>Transaction History</Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Users Tab - Admin: Add User / User Management */}
          {tab === "users" && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    User Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add user, search, edit, or remove users (admin only)
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: { xs: "100%", sm: 256 } }}
                />
              </Box>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Subscription Plan</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Last Active</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "rgba(13, 148, 136, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Typography variant="caption" fontWeight={600} sx={{ color: "primary.main" }}>
                              {user.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("") || "U"}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {user.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getUserPlanName(user.id)} 
                          size="small" 
                          color={user.subscription_plan_id ? "primary" : "default"} 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={user.status} size="small" variant={user.status === "Active" ? "outlined" : "filled"} color={user.status === "Active" ? "success" : "default"} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {user.lastActive || "Never"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit("user", user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete("user", user.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Business Types Tab */}
          {tab === "business" && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Business Type Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add business type, edit, or remove categories (admin only)
                </Typography>
              </Box>

              {/* Current business types */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5, mt: 2 }}>
                Current business types
              </Typography>
              <Table sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Count</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Growth</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {businessTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        No business types yet. Add one below.
                      </TableCell>
                    </TableRow>
                  ) : (
                    businessTypes.map((type) => (
                      <TableRow key={type.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{type.name}</TableCell>
                        <TableCell>{type.count}</TableCell>
                        <TableCell>
                          <Chip label={type.growth || "."} size="small" sx={{ bgcolor: "rgba(5, 150, 105, 0.12)", color: "success.main" }} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openEdit("business", type)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete("business", type.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => openCreate("business")}
                sx={{ borderStyle: "dashed", mt: 1 }}
              >
                Add Business Type
              </Button>
            </Box>
          )}

          {/* Locations Tab */}
          {tab === "locations" && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Location Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add location, edit, or remove location data (admin only)
                </Typography>
              </Box>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Avg Score</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {locations.map((loc) => (
                    <TableRow key={loc.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{loc.name}</TableCell>
                      <TableCell>{loc.type}</TableCell>
                      <TableCell>
                        <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: "rgba(13, 148, 136, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: "primary.main" }}>
                            {loc.score}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {loc.address}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit("location", loc)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete("location", loc.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Areas Tab . Nuwara Eliya neighbourhoods. The ML service fetches this data
              with a 5-minute cache; admin edits trigger an immediate cache invalidation. */}
          {tab === "areas" && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Nuwara Eliya Areas (ML reference data)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This is the area data the ML service uses for per-area predictions.
                  Edits here change the recommendation page within ~5 minutes (or instantly via the cache-refresh hook).
                </Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Area</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Rent / mo</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Footfall</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Competition</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Data</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Best for</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {areas.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{a.name}</TableCell>
                      <TableCell align="right">LKR {Number(a.rent_indicative_lkr || 0).toLocaleString()}</TableCell>
                      <TableCell align="right">{Number(a.footfall_weight || 0).toFixed(2)}</TableCell>
                      <TableCell align="right">{Number(a.competition_weight || 0).toFixed(2)}</TableCell>
                      <TableCell align="right">{a.data_completeness ?? 3} / 5</TableCell>
                      <TableCell sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
                        {Array.isArray(a.best_for) ? a.best_for.slice(0, 3).join(", ") : ""}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit("area", a)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete("area", a.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {areas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: "center", color: "text.secondary", py: 4 }}>
                        No areas yet. Click "Add Area" to add one, or run <code>php artisan db:seed --class=AreaSeeder</code> to load the 12 default Nuwara Eliya neighbourhoods.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* User Inputs Tab - when user inputs something (Laravel + MySQL), admin sees it here */}
          {tab === "inputs" && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  User Inputs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Location Finder submissions from users. Connect Laravel + MySQL so these appear automatically when users submit.
                </Typography>
              </Box>
              {useMock ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Connect Laravel + MySQL and set <strong>VITE_API_URL</strong> so that when a user submits the Location Finder, their input is saved to the database and shown here automatically.
                </Alert>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "action.hover" }}>
                      <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Business Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Proximity</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Traffic</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Competition</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Internet</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Land</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Submitted</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {submissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          No user inputs yet. When users submit the Location Finder (dashboard), they will appear here.
                        </TableCell>
                      </TableRow>
                    ) : (
                      submissions.map((s) => (
                        <TableRow key={s.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{s.user_name || s.user_email || "."}</Typography>
                            {s.user_email && <Typography variant="caption" color="text.secondary">{s.user_email}</Typography>}
                          </TableCell>
                          <TableCell>{s.business_type}</TableCell>
                          <TableCell>{s.proximity}</TableCell>
                          <TableCell>{s.traffic}</TableCell>
                          <TableCell>{s.competition}</TableCell>
                          <TableCell>{s.internet_coverage}</TableCell>
                          <TableCell>{s.land_intent}</TableCell>
                          <TableCell>{s.amount}</TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {s.created_at ? new Date(s.created_at).toLocaleString() : "."}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}

          {/* Transaction History Tab - Admin management */}
          {tab === "transactions" && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Transaction History
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View and manage all transactions (subscriptions, renewals, exports)
                </Typography>
              </Box>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        No transactions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{tx.user}</TableCell>
                        <TableCell>{tx.type}</TableCell>
                        <TableCell>{tx.amount}</TableCell>
                        <TableCell>
                          <Chip label={tx.status} size="small" color={tx.status === "Completed" ? "success" : "default"} variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Analytics Tab */}
          {tab === "analytics" && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* User Growth Chart */}
                <Grid item xs={12} lg={6}>
                  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                        <BarChartIcon sx={{ color: "primary.main" }} />
                        <Typography variant="h6" fontWeight={600}>
                          User Growth (Last 6 Months)
                        </Typography>
                      </Box>
                        {(analytics?.system_performance || [
                          { label: "API Response Time", value: "45ms", status: "Excellent", progress: 95 },
                          { label: "Database Load", value: "23%", status: "Normal", progress: 23 },
                          { label: "Cache Hit Rate", value: "94%", status: "Excellent", progress: 94 },
                          { label: "Error Rate", value: "0.02%", status: "Excellent", progress: 99.98 },
                        ]).map((metric) => {
                          const progress = metric.progress || (metric.value?.includes('%') ? parseFloat(metric.value) : (metric.value?.includes('ms') ? 95 : 50));
                          return (
                            <Box key={metric.label}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {metric.label}
                                </Typography>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {metric.value}
                                  </Typography>
                                  <Chip label={metric.status} size="small" variant="outlined" color={metric.status === "Excellent" ? "success" : "default"} />
                                </Box>
                              </Box>
                              <Box
                                sx={{
                                  height: 8,
                                  borderRadius: 1,
                                  bgcolor: "action.hover",
                                  overflow: "hidden",
                                }}
                              >
                                <Box
                                  sx={{
                                    width: `${progress}%`,
                                    height: "100%",
                                    bgcolor: metric.status === "Excellent" ? "success.main" : "primary.main",
                                    transition: "width 0.5s ease",
                                  }}
                                />
                              </Box>
                            </Box>
                          );
                        })}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Recent Activity */}
                <Grid item xs={12} lg={6}>
                  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                        <BarChartIcon sx={{ color: "primary.main" }} />
                        <Typography variant="h6" fontWeight={600}>
                          Recent Activity
                        </Typography>
                      </Box>
                      <Box>
                        {(analytics?.recent_activity && analytics.recent_activity.length > 0 ? analytics.recent_activity : [
                          ...(users.length > 0 ? [{ action: `New user registered: ${users[users.length - 1]?.name || users[users.length - 1]?.email}`, user: users[users.length - 1]?.name || "User", time: users[users.length - 1]?.lastActive || "Recently" }] : []),
                          ...(locations.length > 0 ? [{ action: "Location data updated", user: "System", time: "Recently" }] : []),
                          ...(businessTypes.length > 0 ? [{ action: `Business type: ${businessTypes[businessTypes.length - 1]?.name}`, user: "Admin", time: "Recently" }] : []),
                          ...(users.length > 1 ? [{ action: "Users active in system", user: `${users.length} users`, time: "Active" }] : []),
                        ].slice(0, 4)).map((activity, i, arr) => (
                          <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, pb: 1.5, borderBottom: i < arr.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main", mt: 1 }} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2">{activity.action || activity.label || "Activity"}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {activity.user || "System"} • {activity.time || "Recently"}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                        {(!analytics?.recent_activity || analytics.recent_activity.length === 0) && users.length === 0 && businessTypes.length === 0 && locations.length === 0 && (
                          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                            No recent activity
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Business Types Chart */}
                <Grid item xs={12} lg={6}>
                  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                        <StoreIcon sx={{ color: "primary.main" }} />
                        <Typography variant="h6" fontWeight={600}>
                          Business Types Distribution
                        </Typography>
                      </Box>
                      <Box sx={{ height: 250, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                        {businessTypes.length > 0 ? (
                          businessTypes.map((bt, i) => {
                            const maxCount = Math.max(...businessTypes.map(b => parseInt(b.count || 0)), 1);
                            const width = ((parseInt(bt.count || 0) / maxCount) * 100);
                            return (
                              <Box key={bt.id}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {bt.name}
                                  </Typography>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      {bt.count || 0}
                                    </Typography>
                                    <Chip label={bt.growth || "+0%"} size="small" color="success" variant="outlined" />
                                  </Box>
                                </Box>
                                <Box
                                  sx={{
                                    height: 32,
                                    borderRadius: 2,
                                    bgcolor: "action.hover",
                                    overflow: "hidden",
                                    position: "relative",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: `${width}%`,
                                      height: "100%",
                                      bgcolor: i % 2 === 0 ? "primary.main" : "secondary.main",
                                      transition: "width 0.5s ease",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "flex-end",
                                      pr: 1.5,
                                    }}
                                  >
                                    {width > 15 && (
                                      <Typography variant="caption" sx={{ color: "#fff", fontWeight: 600 }}>
                                        {bt.count || 0}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            );
                          })
                        ) : (
                          <Typography variant="body2" color="text.secondary" textAlign="center">
                            No business types available
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Location Scores */}
                <Grid item xs={12} lg={6}>
                  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                        <PlaceIcon sx={{ color: "primary.main" }} />
                        <Typography variant="h6" fontWeight={600}>
                          Location Scores Distribution
                        </Typography>
                      </Box>
                      <Box sx={{ height: 250, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                        {locations.length > 0 ? (
                          locations.slice(0, 5).map((loc, i) => {
                            const score = parseInt(loc.score || 0);
                            return (
                              <Box key={loc.id}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                  <Typography variant="body2" fontWeight={600} sx={{ maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {loc.name}
                                  </Typography>
                                  <Chip label={`Score: ${score}`} size="small" color={score >= 90 ? "success" : score >= 70 ? "warning" : "default"} />
                                </Box>
                                <Box
                                  sx={{
                                    height: 24,
                                    borderRadius: 2,
                                    bgcolor: "action.hover",
                                    overflow: "hidden",
                                    position: "relative",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: `${score}%`,
                                      height: "100%",
                                      bgcolor: score >= 90 ? "success.main" : score >= 70 ? "warning.main" : "text.secondary",
                                      transition: "width 0.5s ease",
                                    }}
                                  />
                                </Box>
                              </Box>
                            );
                          })
                        ) : (
                          <Typography variant="body2" color="text.secondary" textAlign="center">
                            No locations available
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* System Performance */}
                <Grid item xs={12} lg={6}>
                  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <TrendingUpIcon sx={{ color: "primary.main" }} />
                        <Typography variant="h6" fontWeight={600}>
                          System Performance
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {[
                          { label: "API Response Time", value: "45ms", status: "Excellent", progress: 95 },
                          { label: "Database Load", value: "23%", status: "Normal", progress: 23 },
                          { label: "Cache Hit Rate", value: "94%", status: "Excellent", progress: 94 },
                          { label: "Error Rate", value: "0.02%", status: "Excellent", progress: 99.98 },
                        ].map((metric) => (
                          <Box key={metric.label}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">
                                {metric.label}
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {metric.value}
                                </Typography>
                                <Chip label={metric.status} size="small" variant="outlined" color="success" />
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                height: 8,
                                borderRadius: 1,
                                bgcolor: "action.hover",
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${metric.progress}%`,
                                  height: "100%",
                                  bgcolor: metric.status === "Excellent" ? "success.main" : "primary.main",
                                  transition: "width 0.5s ease",
                                }}
                              />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Recent Activity */}
                <Grid item xs={12} lg={6}>
                  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <TimelineIcon sx={{ color: "primary.main" }} />
                        <Typography variant="h6" fontWeight={600}>
                          Recent Activity
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {[
                          { action: "New user registered", user: users[users.length - 1]?.name || "New User", time: "5 mins ago" },
                          { action: "Location data updated", user: "System", time: "15 mins ago" },
                          { action: "Recommendation generated", user: users[0]?.name || "User", time: "1 hour ago" },
                          { action: "Business type added", user: "Admin", time: "2 hours ago" },
                        ].map((activity, i) => (
                          <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, pb: 1.5, borderBottom: i < 3 ? "1px solid" : "none", borderColor: "divider" }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main", mt: 1 }} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2">{activity.action}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {activity.user} • {activity.time}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        {/* Dialog for Create/Edit */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
          <DialogTitle>{editingId ? `Edit ${dialogType}` : `Add ${dialogType}`}</DialogTitle>
          <DialogContent>
            {dialogType === "user" && (
              <>
                <TextField fullWidth label="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} margin="dense" required />
                <TextField fullWidth label="Email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} margin="dense" required />
                <FormControl fullWidth margin="dense">
                  <InputLabel>Subscription Plan</InputLabel>
                  <Select
                    value={form.subscription_plan_id || ""}
                    onChange={(e) => setForm({ ...form, subscription_plan_id: e.target.value || null })}
                    label="Subscription Plan"
                  >
                    <MenuItem value="">No plan</MenuItem>
                    {plans.map((plan) => (
                      <MenuItem key={plan.id} value={plan.id}>
                        {plan.name} {plan.price ? `($${plan.price})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField fullWidth select SelectProps={{ native: true }} label="Status" value={form.status || "Active"} onChange={(e) => setForm({ ...form, status: e.target.value })} margin="dense">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </TextField>
              </>
            )}
            {dialogType === "business" && (
              <>
                <TextField fullWidth label="Business Type Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} margin="dense" required />
                <TextField fullWidth label="Count" type="number" value={form.count || ""} onChange={(e) => setForm({ ...form, count: e.target.value })} margin="dense" />
                <TextField fullWidth label="Growth" value={form.growth || "+0%"} onChange={(e) => setForm({ ...form, growth: e.target.value })} margin="dense" placeholder="+0%" />
              </>
            )}
            {dialogType === "location" && (
              <>
                <TextField fullWidth label="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} margin="dense" required />
                <TextField fullWidth label="Address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} margin="dense" />
                <TextField fullWidth label="Type" value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value })} margin="dense" placeholder="e.g. Commercial District" />
                <TextField fullWidth label="Score" type="number" value={form.score || ""} onChange={(e) => setForm({ ...form, score: e.target.value })} margin="dense" inputProps={{ min: 0, max: 100 }} />
              </>
            )}
            {dialogType === "area" && (
              <>
                <TextField fullWidth label="Area name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} margin="dense" required />
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <TextField label="Typical rent / month (LKR)" type="number" value={form.rent_indicative_lkr ?? ""} onChange={(e) => setForm({ ...form, rent_indicative_lkr: e.target.value })} margin="dense" inputProps={{ min: 0 }} />
                  <TextField label="Typical price / perch (LKR)" type="number" value={form.price_per_perch_lkr ?? ""} onChange={(e) => setForm({ ...form, price_per_perch_lkr: e.target.value })} margin="dense" inputProps={{ min: 0 }} />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <TextField label="Footfall weight (0-1)" type="number" value={form.footfall_weight ?? 0.5} onChange={(e) => setForm({ ...form, footfall_weight: e.target.value })} margin="dense" inputProps={{ min: 0, max: 1, step: 0.05 }} helperText="Walk-in customer pool. 1 = busiest tourist area." />
                  <TextField label="Competition weight (0-1)" type="number" value={form.competition_weight ?? 0.5} onChange={(e) => setForm({ ...form, competition_weight: e.target.value })} margin="dense" inputProps={{ min: 0, max: 1, step: 0.05 }} helperText="Density of similar businesses. 1 = highly saturated." />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <TextField label="Latitude" type="number" value={form.latitude ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value })} margin="dense" inputProps={{ step: 0.0001 }} />
                  <TextField label="Longitude" type="number" value={form.longitude ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value })} margin="dense" inputProps={{ step: 0.0001 }} />
                </Box>
                <TextField
                  fullWidth
                  label="Tags (comma-separated)"
                  value={Array.isArray(form.tags) ? form.tags.join(", ") : (form.tags || "")}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  margin="dense"
                  placeholder="e.g. high traffic, near bus stand"
                />
                <TextField
                  fullWidth
                  label="Likely customer types (comma-separated)"
                  value={Array.isArray(form.customer_types) ? form.customer_types.join(", ") : (form.customer_types || "")}
                  onChange={(e) => setForm({ ...form, customer_types: e.target.value })}
                  margin="dense"
                  placeholder="e.g. tourists, local workers, students"
                />
                <TextField
                  fullWidth
                  label="Best for (comma-separated)"
                  value={Array.isArray(form.best_for) ? form.best_for.join(", ") : (form.best_for || "")}
                  onChange={(e) => setForm({ ...form, best_for: e.target.value })}
                  margin="dense"
                  placeholder="e.g. cafe, bakery, retail shop"
                />
                <TextField fullWidth multiline minRows={2} label="Main risk" value={form.main_risk || ""} onChange={(e) => setForm({ ...form, main_risk: e.target.value })} margin="dense" />
                <TextField fullWidth multiline minRows={3} label="Business strategy" value={form.strategy || ""} onChange={(e) => setForm({ ...form, strategy: e.target.value })} margin="dense" />
                <TextField fullWidth multiline minRows={2} label="Recommended action" value={form.recommended_action || ""} onChange={(e) => setForm({ ...form, recommended_action: e.target.value })} margin="dense" />
                <TextField
                  label="Data completeness (1-5)"
                  type="number"
                  value={form.data_completeness ?? 3}
                  onChange={(e) => setForm({ ...form, data_completeness: e.target.value })}
                  margin="dense"
                  inputProps={{ min: 1, max: 5 }}
                  helperText="Drives the per-card Confidence label. 5 = rich data, 1 = limited."
                  sx={{ width: 240 }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={!form.name?.trim()}>
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
