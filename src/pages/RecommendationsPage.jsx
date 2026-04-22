import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import ShareIcon from "@mui/icons-material/Share";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PlaceIcon from "@mui/icons-material/Place";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import ReplayIcon from "@mui/icons-material/Replay";
import MapView from "../components/MapView.jsx";
import { fetchRecommendations } from "../lib/ml.js";

const DASHBOARD_SUBMITTED_KEY = "smartloc_dashboard_submitted";

// Approximate lat/lng for each Nuwara Eliya area (matches backend/ml/features.py names).
const AREA_COORDS = {
  "Town Centre / Main Street": { lat: 6.9497, lng: 80.7891 },
  "Gregory Lake Front": { lat: 6.9571, lng: 80.7827 },
  "Hakgala Road": { lat: 6.9405, lng: 80.8080 },
  "Pedro / Hill Club Area": { lat: 6.9350, lng: 80.8200 },
  "Nanu Oya": { lat: 6.9360, lng: 80.7530 },
  "Ambewela": { lat: 6.8680, lng: 80.7910 },
  "Kandapola": { lat: 6.9680, lng: 80.8120 },
  "Glencairn": { lat: 6.9180, lng: 80.8000 },
  "Hawa Eliya": { lat: 6.9620, lng: 80.7830 },
  "Lover's Leap": { lat: 6.9730, lng: 80.7925 },
  "Seetha Eliya": { lat: 6.9170, lng: 80.8090 },
  "Tea estates belt": { lat: 6.9000, lng: 80.8200 },
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ease = [0.22, 1, 0.36, 1];

function getScoreColor(score) {
  if (score >= 80) return "#15803d";
  if (score >= 65) return "#0d9488";
  if (score >= 45) return "#0ea5e9";
  return "#64748b";
}

function getScoreBg(score) {
  if (score >= 80) return "rgba(21, 128, 61, 0.12)";
  if (score >= 65) return "rgba(13, 148, 136, 0.12)";
  if (score >= 45) return "rgba(14, 165, 233, 0.12)";
  return "rgba(148, 163, 184, 0.18)";
}

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    const submitted = sessionStorage.getItem(DASHBOARD_SUBMITTED_KEY);
    if (!submitted) {
      navigate("/dashboard", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const payload = JSON.parse(submitted);
        const result = await fetchRecommendations(payload);
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to reach ML service. Make sure the FastAPI server is running on port 8001.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const recommendations = useMemo(() => {
    if (!data) return [];
    return data.recommendations.map((r) => ({
      id: `rec-${r.rank}`,
      rank: r.rank,
      name: r.area,
      address: `${r.area}, Nuwara Eliya`,
      type: r.tags[0] || "Area",
      score: r.score,
      lat: AREA_COORDS[r.area]?.lat ?? 6.9497,
      lng: AREA_COORDS[r.area]?.lng ?? 80.7891,
      metrics: {
        budgetFit: Math.round(r.budget_fit * 100),
        footfall: Math.round(r.footfall_score * 100),
        lowCompetition: Math.round(r.competition_score * 100),
        mlOverall: data.overall_score,
        peakSeason: data.peak_score,
      },
      highlights: r.tags,
      reasoning: r.reasoning,
    }));
  }, [data]);

  const selectedLocation = recommendations[selectedIdx];
  const mapLocations = recommendations.map((r) => ({
    id: r.id,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    description: `${r.type} · Score ${r.score}`,
  }));

  const metricLabels = {
    budgetFit: "Budget Fit",
    footfall: "Foot Traffic",
    lowCompetition: "Room to Grow (low competition)",
    mlOverall: "ML Suitability",
    peakSeason: "Peak-season Score",
  };

  if (loading) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3 }}>
        <CircularProgress />
        <Stack alignItems="center" spacing={0.5}>
          <Typography className="font-display" sx={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
            Running XGBoost inference…
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Scoring 12 months × 12 areas against your inputs
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
        <Paper variant="outlined" sx={{ p: 4, maxWidth: 560, borderRadius: 3 }}>
          <Typography className="font-display" sx={{ fontSize: "1.75rem", letterSpacing: "-0.02em", mb: 1 }}>
            ML service unreachable
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Box component="pre" sx={{ bgcolor: "action.hover", p: 2, borderRadius: 2, fontSize: 13, overflow: "auto" }}>
{`cd backend/ml
pip install -r requirements.txt
uvicorn server:app --port 8001 --reload`}
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <Button variant="contained" startIcon={<ReplayIcon />} onClick={() => window.location.reload()} sx={{ borderRadius: 999 }}>
              Try again
            </Button>
            <Button onClick={() => navigate("/dashboard")} sx={{ borderRadius: 999 }}>
              Back to input
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  if (!data || recommendations.length === 0) return null;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
      {/* Header + summary */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: "0.28em", fontSize: 11, color: "text.secondary", fontWeight: 500 }}>
              XGBoost · R² = 0.8447
            </Typography>
            <Typography className="font-display" sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" }, letterSpacing: "-0.025em", lineHeight: 1.1, mt: 0.5 }}>
              {data.recommendations.length} areas ranked for your{" "}
              <Box component="em" sx={{ fontStyle: "italic" }}>{data.business_type}</Box>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Overall suitability {data.overall_score}/100 · Peak season {data.peak_score} · Monsoon {data.low_season_score}
            </Typography>
          </Box>
        </Stack>
      </motion.div>

      {/* 12-month seasonality strip */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Seasonality — 12-month XGBoost scores
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Best: {data.best_months.map((m) => MONTH_SHORT[m - 1]).join(", ")} · Avoid: {data.worst_months.map((m) => MONTH_SHORT[m - 1]).join(", ")}
            </Typography>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 0.75, alignItems: "end", height: 96 }}>
            {data.monthly_scores.map((m, i) => (
              <motion.div
                key={m.month}
                initial={{ height: 0 }}
                animate={{ height: `${m.score}%` }}
                transition={{ duration: 0.7, delay: 0.2 + i * 0.03, ease }}
                style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}
              >
                <Box sx={{
                  width: "100%",
                  height: `${m.score}%`,
                  bgcolor: m.is_peak ? "#0d9488" : m.is_monsoon ? "#cbd5e1" : "#94a3b8",
                  borderRadius: "3px 3px 0 0",
                }} />
              </motion.div>
            ))}
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 0.75, mt: 0.5 }}>
            {MONTH_SHORT.map((n, i) => (
              <Typography key={n} variant="caption" sx={{ textAlign: "center", fontSize: 10, color: "text.secondary" }}>{n}</Typography>
            ))}
          </Box>
        </Paper>
      </motion.div>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, flex: 1, minHeight: 0 }}>
        {/* Left: ranked list */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, overflow: "auto" }}>
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
            {recommendations.map((loc, i) => {
              const isSelected = i === selectedIdx;
              return (
                <motion.div
                  key={loc.id}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
                  }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      border: isSelected ? "2px solid" : "1px solid",
                      borderColor: isSelected ? "primary.main" : "divider",
                      borderRadius: 2,
                      cursor: "pointer",
                      py: 1.5,
                      px: 2,
                      mb: 1,
                      transition: "border-color 0.2s",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                    onClick={() => setSelectedIdx(i)}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: getScoreBg(loc.score), color: getScoreColor(loc.score), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem", flexShrink: 0 }}>
                        {loc.score}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip size="small" label={`#${loc.rank}`} variant="outlined" sx={{ fontWeight: 600 }} />
                          <Typography variant="subtitle2" fontWeight={600} noWrap>{loc.name}</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {loc.reasoning}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: "wrap" }}>
                          {loc.highlights.slice(0, 3).map((h) => (
                            <Chip key={h} size="small" label={h} sx={{ bgcolor: "action.hover", height: 20, fontSize: 11 }} />
                          ))}
                        </Stack>
                      </Box>
                      <ChevronRightIcon sx={{ color: isSelected ? "primary.main" : "text.secondary", transform: isSelected ? "rotate(90deg)" : "none", transition: "all 0.2s" }} />
                    </Stack>
                  </Paper>
                </motion.div>
              );
            })}
          </motion.div>
        </Box>

        {/* Right: selected detail + map */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, position: { lg: "sticky" }, top: 24 }}>
          <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
            <Box sx={{ height: 240 }}>
              <MapView
                locations={mapLocations}
                center={[selectedLocation.lat, selectedLocation.lng]}
                zoom={14}
              />
            </Box>
          </Paper>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedLocation.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease }}
            >
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box>
                    <Typography className="font-display" sx={{ fontSize: "1.5rem", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                      {selectedLocation.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedLocation.address}
                    </Typography>
                  </Box>
                  <Stack direction="row">
                    <IconButton size="small"><BookmarkBorderIcon fontSize="small" /></IconButton>
                    <IconButton size="small"><ShareIcon fontSize="small" /></IconButton>
                  </Stack>
                </Stack>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5, borderRadius: 2, bgcolor: "action.hover", mb: 2 }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: getScoreBg(selectedLocation.score), color: getScoreColor(selectedLocation.score), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.5rem" }}>
                    {selectedLocation.score}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>Composite score</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedLocation.reasoning}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="subtitle2" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}>
                  <TrendingUpIcon fontSize="small" color="primary" />
                  Factor breakdown
                </Typography>
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  {Object.entries(selectedLocation.metrics).map(([key, value]) => (
                    <Box key={key}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                        <Typography variant="caption" color="text.secondary">{metricLabels[key] || key}</Typography>
                        <Typography variant="caption" fontWeight={600} sx={{ color: getScoreColor(value) }}>{value}%</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, value)}
                        sx={{
                          height: 6,
                          borderRadius: 1,
                          bgcolor: "action.hover",
                          "& .MuiLinearProgress-bar": { bgcolor: getScoreColor(value) },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>

                <Typography variant="subtitle2" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <PlaceIcon fontSize="small" color="primary" />
                  Area character
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: "wrap" }}>
                  {selectedLocation.highlights.map((h) => (
                    <Chip key={h} label={h} size="small" sx={{ bgcolor: "action.hover", mb: 0.5 }} />
                  ))}
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Button variant="contained" endIcon={<OpenInNewIcon />} onClick={() => setReportOpen(true)} sx={{ flex: 1, borderRadius: 999, textTransform: "none" }}>
                    View full ranking
                  </Button>
                  <Button variant="outlined" onClick={() => navigate("/dashboard")} sx={{ flex: 1, borderRadius: 999, textTransform: "none" }}>
                    Edit input
                  </Button>
                </Stack>
              </Paper>
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>

      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          <Typography className="font-display" sx={{ fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
            Full ranking
          </Typography>
          <IconButton size="small" onClick={() => setReportOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Area</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Budget fit</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Reasoning</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recommendations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell>#{loc.rank}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{loc.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={loc.score} sx={{ bgcolor: getScoreBg(loc.score), color: getScoreColor(loc.score), fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>{loc.metrics.budgetFit}%</TableCell>
                  <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>{loc.reasoning}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
