import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import ShareIcon from "@mui/icons-material/Share";
import FilterListIcon from "@mui/icons-material/FilterList";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PlaceIcon from "@mui/icons-material/Place";
import StarIcon from "@mui/icons-material/Star";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import MapView from "../components/MapView.jsx";
import { CONTACT_PHONE } from "../lib/contact.js";

const DASHBOARD_SUBMITTED_KEY = "smartloc_dashboard_submitted";

// Nuwara Eliya–themed demo data (shape compatible with future API)
const recommendations = [
  {
    id: "1",
    rank: 1,
    name: "Town Centre – Main Street",
    address: "Main Street, Nuwara Eliya 22200",
    type: "Commercial District",
    score: 92,
    lat: 6.9497,
    lng: 80.7891,
    metrics: {
      footTraffic: 95,
      competition: 78,
      accessibility: 90,
      demographics: 88,
      rentIndex: 65,
    },
    highlights: ["High foot traffic", "Near bus stand", "Growing area"],
    nearbyAttractions: ["Victoria Park (0.3km)", "Post Office (0.2km)"],
  },
  {
    id: "2",
    rank: 2,
    name: "Gregory Lake Front",
    address: "Lake Road, Nuwara Eliya 22200",
    type: "Mixed Use",
    score: 87,
    lat: 6.9571,
    lng: 80.7827,
    metrics: {
      footTraffic: 88,
      competition: 82,
      accessibility: 85,
      demographics: 90,
      rentIndex: 70,
    },
    highlights: ["Tourist hub", "High-income visitors", "Premium location"],
    nearbyAttractions: ["Gregory Lake (0.1km)", "Boat House (0.2km)"],
  },
  {
    id: "3",
    rank: 3,
    name: "Hakgala Road – Tea Belt",
    address: "Hakgala Road, Nuwara Eliya 22200",
    type: "Tourist Zone",
    score: 85,
    lat: 6.9405,
    lng: 80.808,
    metrics: {
      footTraffic: 92,
      competition: 68,
      accessibility: 80,
      demographics: 85,
      rentIndex: 75,
    },
    highlights: ["Tourist hotspot", "Tea estate views", "Trendy area"],
    nearbyAttractions: ["Hakgala Garden (2km)", "Tea factories (1km)"],
  },
  {
    id: "4",
    rank: 4,
    name: "Pedro – Hill Club Area",
    address: "Pedro Road, Nuwara Eliya 22200",
    type: "Shopping District",
    score: 78,
    lat: 6.935,
    lng: 80.82,
    metrics: {
      footTraffic: 85,
      competition: 60,
      accessibility: 75,
      demographics: 92,
      rentIndex: 55,
    },
    highlights: ["Shopping & dining", "Heritage area", "Young demographics"],
    nearbyAttractions: ["Hill Club (0.5km)", "Golf Course (0.8km)"],
  },
];

const typeFilterOptions = [
  { value: "all", label: "All Types" },
  { value: "commercial", label: "Commercial" },
  { value: "tourist", label: "Tourist Zone" },
  { value: "mixed", label: "Mixed Use" },
  { value: "shopping", label: "Shopping District" },
];

const sortOptions = [
  { value: "score", label: "Highest Score" },
  { value: "traffic", label: "Foot Traffic" },
  { value: "rent", label: "Lowest Rent" },
];

function getScoreColor(score) {
  if (score >= 90) return "success.main";
  if (score >= 75) return "primary.main";
  if (score >= 60) return "info.main";
  return "text.secondary";
}

function getScoreBg(score) {
  if (score >= 90) return "rgba(5, 150, 105, 0.12)";
  if (score >= 75) return "rgba(13, 148, 136, 0.12)";
  if (score >= 60) return "rgba(14, 165, 233, 0.12)";
  return "rgba(148, 163, 184, 0.2)";
}

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState(recommendations[0]);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(DASHBOARD_SUBMITTED_KEY)) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const filteredAndSorted = useMemo(() => {
    let list = recommendations.filter((loc) => {
      if (filter === "all") return true;
      const typeLower = (loc.type || "").toLowerCase();
      if (filter === "commercial") return typeLower.includes("commercial");
      if (filter === "tourist") return typeLower.includes("tourist");
      if (filter === "mixed") return typeLower.includes("mixed");
      if (filter === "shopping") return typeLower.includes("shopping");
      return true;
    });
    if (sortBy === "score") list = [...list].sort((a, b) => b.score - a.score);
    if (sortBy === "traffic") list = [...list].sort((a, b) => (b.metrics?.footTraffic ?? 0) - (a.metrics?.footTraffic ?? 0));
    if (sortBy === "rent") list = [...list].sort((a, b) => (a.metrics?.rentIndex ?? 0) - (b.metrics?.rentIndex ?? 0));
    return list;
  }, [filter, sortBy]);

  const mapLocations = recommendations.map((r) => ({
    id: r.id,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    description: `${r.type} · Score ${r.score}`,
  }));

  const metricLabels = {
    footTraffic: "Foot Traffic",
    competition: "Competition",
    accessibility: "Accessibility",
    demographics: "Demographics",
    rentIndex: "Rent Index",
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Location Recommendations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredAndSorted.length} locations found based on your preferences
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 160 }} variant="outlined">
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              sx={{ bgcolor: "background.paper" }}
              displayEmpty
              renderValue={(v) => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <FilterListIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  {typeFilterOptions.find((o) => o.value === v)?.label ?? "Filter"}
                </Box>
              )}
            >
              {typeFilterOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }} variant="outlined">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              sx={{ bgcolor: "background.paper" }}
            >
              {sortOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left: Location list */}
        <Grid item xs={12} lg={6}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, overflow: "auto" }}>
            {filteredAndSorted.map((loc) => {
              const isSelected = selectedLocation.id === loc.id;
              return (
                <Paper
                  key={loc.id}
                  elevation={0}
                  variant="outlined"
                  sx={{
                    border: isSelected ? "2px solid" : "1px solid",
                    borderColor: isSelected ? "primary.main" : "divider",
                    borderRadius: 2,
                    "&:hover": { bgcolor: "rgba(13, 148, 136, 0.06)" },
                    cursor: "pointer",
                    py: 1.5,
                    px: 2,
                  }}
                  onClick={() => setSelectedLocation(loc)}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: getScoreBg(loc.score),
                        color: getScoreColor(loc.score),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        flexShrink: 0,
                      }}
                    >
                      {loc.score}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Chip size="small" label={`#${loc.rank}`} variant="outlined" sx={{ fontWeight: 600 }} />
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          {loc.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        {loc.address}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                        <Chip size="small" label={loc.type} variant="outlined" />
                        {loc.highlights.slice(0, 2).map((h) => (
                          <Chip key={h} size="small" label={h} sx={{ bgcolor: "action.hover" }} />
                        ))}
                      </Box>
                    </Box>
                    <ChevronRightIcon
                      sx={{
                        color: isSelected ? "primary.main" : "text.secondary",
                        transform: isSelected ? "rotate(90deg)" : "none",
                        transition: "all 0.2s",
                      }}
                    />
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Grid>

        {/* Right: Map + selected detail */}
        <Grid item xs={12} lg={6}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, position: "sticky", top: 24 }}>
            {/* Map */}
            <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
              <Box sx={{ height: 250 }}>
                <MapView
                  locations={mapLocations}
                  center={[selectedLocation.lat, selectedLocation.lng]}
                  zoom={14}
                />
              </Box>
            </Paper>

            {/* Selected location details */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedLocation.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedLocation.address}
                  </Typography>
                </Box>
                <Box>
                  <IconButton size="small" sx={{ "&:hover": { bgcolor: "rgba(13, 148, 136, 0.08)" } }}>
                    <BookmarkBorderIcon />
                  </IconButton>
                  <IconButton size="small" sx={{ "&:hover": { bgcolor: "rgba(13, 148, 136, 0.08)" } }}>
                    <ShareIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Overall score */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: getScoreBg(selectedLocation.score),
                      color: getScoreColor(selectedLocation.score),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "1.5rem",
                    }}
                  >
                    {selectedLocation.score}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Overall Score
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Excellent match for your criteria
                    </Typography>
                  </Box>
                </Box>
                <StarIcon sx={{ color: "primary.main" }} />
              </Box>

              {/* Key metrics */}
              <Typography variant="subtitle2" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}>
                <TrendingUpIcon fontSize="small" color="primary" />
                Key Metrics
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
                {Object.entries(selectedLocation.metrics || {}).map(([key, value]) => (
                  <Box key={key}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                      <Typography variant="caption" color="text.secondary">
                        {metricLabels[key] || key.replace(/([A-Z])/g, " $1").trim()}
                      </Typography>
                      <Typography variant="caption" fontWeight={600} sx={{ color: getScoreColor(value) }}>
                        {value}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, value)}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: "action.hover",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: value >= 80 ? "success.main" : value >= 60 ? "primary.main" : "info.main",
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>

              {/* Nearby attractions */}
              <Typography variant="subtitle2" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                <PlaceIcon fontSize="small" color="primary" />
                Nearby Attractions
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
                {(selectedLocation.nearbyAttractions || []).map((att) => (
                  <Chip key={att} label={att} size="small" variant="filled" sx={{ bgcolor: "action.hover" }} />
                ))}
              </Box>

              {/* Actions */}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  size="medium"
                  endIcon={<OpenInNewIcon />}
                  onClick={() => setReportOpen(true)}
                  sx={{ flex: 1, borderRadius: "9999px", textTransform: "uppercase", fontWeight: 600 }}
                >
                  View Full Report
                </Button>
                <Button
                  variant="outlined"
                  size="medium"
                  onClick={() => navigate("/#contact")}
                  sx={{ flex: 1, borderRadius: "9999px", textTransform: "uppercase", fontWeight: 600 }}
                >
                  Contact Agent
                </Button>
              </Box>
            </Paper>

            {/* Full Report dialog – summary of all locations */}
            <Dialog
              open={reportOpen}
              onClose={() => setReportOpen(false)}
              maxWidth="md"
              fullWidth
              PaperProps={{ sx: { borderRadius: 2 } }}
            >
              <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Summary of all locations
                </Typography>
                <IconButton size="small" onClick={() => setReportOpen(false)} aria-label="Close">
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ pt: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAndSorted.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell>#{loc.rank}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{loc.name}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={loc.score}
                            sx={{
                              bgcolor: getScoreBg(loc.score),
                              color: getScoreColor(loc.score),
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>{loc.type}</TableCell>
                        <TableCell sx={{ color: "text.secondary", fontSize: "0.875rem" }}>{loc.address}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DialogContent>
            </Dialog>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
