import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
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
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import ReplayIcon from "@mui/icons-material/Replay";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
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

// Area-specific "things to consider" notes. Sourced from UDA Plan 2022-2032,
// Cyclone Ditwah impact analysis (ReliefWeb), nPerf telecom coverage, Auditor General 2023.
const AREA_NOTES = {
  "Town Centre / Main Street": [
    { severity: "caution", title: "Traffic congestion", note: "Peak-hour congestion near the bus stand; deliveries may be slower 4–6pm." },
    { severity: "info", title: "Heritage zoning", note: "Some nearby parcels protected under UDA heritage restrictions." },
  ],
  "Gregory Lake Front": [
    { severity: "caution", title: "Premium rent", note: "Lakefront parcels command 3–10× the district average." },
    { severity: "info", title: "Tourism-driven demand", note: "Footfall swings with holiday seasons — revenue will be lumpy." },
  ],
  "Hakgala Road": [
    { severity: "info", title: "Tourist corridor", note: "Good foot traffic near Hakgala Garden; competition clusters to avoid." },
  ],
  "Pedro / Hill Club Area": [
    { severity: "info", title: "Upscale demographic", note: "Heritage / country-club clientele; price points should match." },
  ],
  "Nanu Oya": [
    { severity: "info", title: "Transit hub", note: "Rail passengers pass through but don't always stay — plan footfall accordingly." },
  ],
  "Ambewela": [
    { severity: "caution", title: "Limited foot traffic", note: "Rural dairy area; walk-in customers are sparse without a destination pull." },
    { severity: "caution", title: "Telecom coverage", note: "nPerf shows patchy 4G outside the town strip." },
  ],
  "Kandapola": [
    { severity: "info", title: "Niche tourism", note: "Upscale tea bungalow cluster; works for curated experiences, not mass market." },
  ],
  "Glencairn": [
    { severity: "caution", title: "Rural access", note: "Narrower roads; delivery logistics can be harder in monsoon months." },
  ],
  "Hawa Eliya": [
    { severity: "info", title: "Residential growth", note: "Increasing local footfall from new housing; commercial supply still limited." },
  ],
  "Lover's Leap": [
    { severity: "caution", title: "Landslide risk", note: "Moderate seasonal risk near the fall; verify site before leasing." },
  ],
  "Seetha Eliya": [
    { severity: "info", title: "Religious tourism", note: "Temple-driven footfall; consider vegetarian/pilgrim preferences in menu." },
  ],
  "Tea estates belt": [
    { severity: "caution", title: "Remote", note: "Far from town; only works if the business is itself the destination." },
    { severity: "caution", title: "Connectivity", note: "Cellular and fixed-line coverage can be thin." },
  ],
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ease = [0.22, 1, 0.36, 1];

// Map 0–100 score to a plain-English band + colour.
function getScoreBand(score) {
  if (score >= 75) return { label: "Strong match", color: "#15803d", bg: "rgba(21,128,61,0.10)", dot: "#15803d" };
  if (score >= 55) return { label: "Moderate match", color: "#0d9488", bg: "rgba(13,148,136,0.10)", dot: "#0d9488" };
  if (score >= 40) return { label: "Fair match", color: "#c2410c", bg: "rgba(194,65,12,0.10)", dot: "#c2410c" };
  return { label: "Needs caution", color: "#b91c1c", bg: "rgba(185,28,28,0.10)", dot: "#b91c1c" };
}

// Break down the composite score into business-friendly positives & things-to-watch.
function buildFactorBars(loc) {
  const bars = [];
  const m = loc.metrics;
  const budgetPts = Math.round((m.budgetFit - 50) * 0.25);
  bars.push({
    label: m.budgetFit >= 75 ? "Matches your budget well" : m.budgetFit >= 50 ? "Budget fits — with room to spare" : "Budget may be a stretch here",
    value: budgetPts,
  });
  const footfallPts = Math.round((m.footfall - 50) * 0.20);
  bars.push({
    label: m.footfall >= 70 ? "Good customer visibility" : m.footfall >= 45 ? "Moderate walk-in flow" : "Quieter — needs marketing",
    value: footfallPts,
  });
  const compPts = Math.round((m.lowCompetition - 50) * 0.15);
  bars.push({
    label: m.lowCompetition >= 70 ? "Few similar businesses nearby" : m.lowCompetition >= 45 ? "Some competition in the area" : "Crowded with similar businesses",
    value: compPts,
  });
  const mlPts = Math.round((m.mlOverall - 50) * 0.40);
  bars.push({
    label: m.mlOverall >= 55 ? "Demand pattern suits this business" : "Demand is softer for this business",
    value: mlPts,
  });
  const peakPts = Math.round((m.peakSeason - 50) * 0.20);
  bars.push({
    label: m.peakSeason >= 65 ? "Strong lift during tourist peaks" : "Modest tourist-season lift",
    value: peakPts,
  });
  return bars.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

// "Best for" label — pick the user archetype this area suits most.
function bestForArchetype(loc) {
  const m = loc.metrics;
  if (m.lowCompetition >= 70 && m.budgetFit >= 60) return "Owners wanting a quiet, low-competition start";
  if (m.footfall >= 75) return "Businesses that live on walk-in traffic";
  if (m.peakSeason >= 70) return "Owners happy to ride seasonal tourist peaks";
  if (m.budgetFit >= 75) return "Budget-conscious first-time investors";
  if (m.lowCompetition < 40) return "Confident operators willing to out-compete locals";
  return "Owners wanting a balanced, moderate-risk location";
}

function describeTopStrength(loc) {
  const m = loc.metrics;
  const scored = [
    { k: "low competition", v: m.lowCompetition },
    { k: "budget fit", v: m.budgetFit },
    { k: "footfall", v: m.footfall },
    { k: "seasonal demand", v: m.peakSeason },
  ];
  scored.sort((a, b) => b.v - a.v);
  return scored[0].k;
}

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [compareSet, setCompareSet] = useState(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
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
        if (!cancelled) setError(e.message || "Failed to reach the recommendation service.");
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
      typicalRentLkr: r.typical_rent_lkr,
      typicalPurchaseLkr: r.typical_purchase_lkr,
      budgetDeltaPct: r.budget_delta_pct,
      notes: AREA_NOTES[r.area] || [],
    }));
  }, [data]);

  const selectedLocation = recommendations[selectedIdx];
  const visible = showAll ? recommendations : recommendations.slice(0, 3);
  const businessLabel = (data?.business_type || "").replace(/_/g, " ");
  const firstBestMonth = data?.best_months?.[0];
  const bestArea = recommendations[0]?.name;
  const topStrength = recommendations[0] ? describeTopStrength(recommendations[0]) : "balanced fit";

  const mapLocations = recommendations.map((r) => {
    const band = getScoreBand(r.score);
    return {
      id: r.id,
      rank: r.rank,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      description: `${r.type} · ${r.score}/100 · ${band.label}`,
      scoreColor: band.dot,
      renderPopup: () => (
        <div style={{ minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ background: band.bg, color: band.color, fontWeight: 600, padding: "2px 8px", borderRadius: 999, fontSize: 12 }}>
              #{r.rank} · {r.score}/100
            </span>
            <span style={{ fontSize: 12, color: band.color, fontWeight: 500 }}>{band.label}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.name}</div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 8, lineHeight: 1.4 }}>
            Typical rent here: <strong>LKR {r.typicalRentLkr.toLocaleString()}/mo</strong>
            {" · "}
            Typical purchase: <strong>LKR {r.typicalPurchaseLkr.toLocaleString()}</strong>
          </div>
          <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
            {r.reasoning.charAt(0).toUpperCase() + r.reasoning.slice(1)}
          </div>
        </div>
      ),
    };
  });

  const scrollToDetail = (i) => {
    setSelectedIdx(i);
    setTimeout(() => {
      document.getElementById("location-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const toggleCompare = (id) => {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3 }}>
        <CircularProgress />
        <Stack alignItems="center" spacing={0.5}>
          <Typography className="font-display" sx={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
            Finding the best places for you…
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analysing 12 areas across 12 months against your inputs
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
            Recommendation service unreachable
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Stack direction="row" spacing={1.5}>
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

  const selBand = getScoreBand(selectedLocation.score);
  const selFactors = buildFactorBars(selectedLocation);

  // Build a human sentence for monthly trend on the selected business
  const bestMonthNames = data.best_months.map((m) => MONTH_LONG[m - 1]).join(", ");
  const weakMonthNames = data.worst_months.map((m) => MONTH_LONG[m - 1]).join(", ");
  const monthlyInsight = `Try to open close to ${bestMonthNames} for a stronger launch — demand is softer during ${weakMonthNames}.`;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto", overflowX: "hidden", pb: 10, width: "100%", maxWidth: "100%" }}>
      {/* ────────── 1. Header + 3 summary cards ────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        <Typography variant="overline" sx={{ letterSpacing: "0.28em", fontSize: 11, color: "text.secondary", fontWeight: 500 }}>
          Recommendations
        </Typography>
        <Typography
          className="font-display"
          sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" }, letterSpacing: "-0.025em", lineHeight: 1.1, mt: 0.5, textTransform: "capitalize" }}
        >
          Best places for your <Box component="span" sx={{ color: "primary.main" }}>{businessLabel}</Box> in Nuwara Eliya
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Based on your inputs, we ranked {recommendations.length} areas on budget fit, footfall, competition and seasonal demand.
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2, mt: 3 }}>
          {[
            { label: "Best overall area", value: bestArea, sub: `#1 match · ${recommendations[0]?.score}/100` },
            { label: "Best month to open", value: firstBestMonth ? MONTH_LONG[firstBestMonth - 1] : "—", sub: `All peaks: ${data.best_months.map((m) => MONTH_SHORT[m - 1]).join(", ")}` },
            { label: "Top strength", value: topStrength.charAt(0).toUpperCase() + topStrength.slice(1), sub: `Strongest driver for ${bestArea}` },
          ].map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
                <Typography sx={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "text.secondary", fontWeight: 500 }}>
                  {c.label}
                </Typography>
                <Typography className="font-display" sx={{ fontSize: "1.5rem", letterSpacing: "-0.02em", lineHeight: 1.2, mt: 0.75 }}>
                  {c.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  {c.sub}
                </Typography>
              </Paper>
            </motion.div>
          ))}
        </Box>
      </motion.div>

      {/* ────────── 2. Ranked list (left) + Map (right) ────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, alignItems: "start" }}>
        {/* Ranked list */}
        <Box>
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
            {visible.map((loc, i) => {
              const isSelected = i === selectedIdx;
              const inCompare = compareSet.has(loc.id);
              const band = getScoreBand(loc.score);
              return (
                <motion.div
                  key={loc.id}
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }}
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
                      p: 2,
                      mb: 1.5,
                      transition: "border-color 0.2s",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                    onClick={() => setSelectedIdx(i)}
                  >
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      {/* Score block */}
                      <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: band.bg, color: band.color, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", lineHeight: 1 }}>{loc.score}</Typography>
                        <Typography sx={{ fontSize: 9, letterSpacing: "0.08em", mt: 0.25 }}>/100</Typography>
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                          <Chip size="small" label={`#${loc.rank}`} variant="outlined" sx={{ fontWeight: 600, height: 20 }} />
                          <Typography variant="subtitle2" fontWeight={600} noWrap>{loc.name}</Typography>
                          <Chip size="small" label={band.label} sx={{ ml: "auto !important", bgcolor: band.bg, color: band.color, height: 20, fontSize: 11, fontWeight: 500 }} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.55 }}>
                          {loc.reasoning.charAt(0).toUpperCase() + loc.reasoning.slice(1)}
                        </Typography>
                        {/* Concrete budget line for this area */}
                        <Stack direction="row" spacing={1.5} sx={{ mt: 1, flexWrap: "wrap", alignItems: "center" }}>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>Typical rent:</Box>{" "}
                            LKR {loc.typicalRentLkr.toLocaleString()}/mo
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>Purchase:</Box>{" "}
                            LKR {(loc.typicalPurchaseLkr / 1_000_000).toFixed(1)}M
                          </Typography>
                          {Math.abs(loc.budgetDeltaPct) < 100 && (
                            <Chip
                              size="small"
                              label={
                                loc.budgetDeltaPct >= 15 ? `You're +${Math.round(loc.budgetDeltaPct)}% vs typical` :
                                loc.budgetDeltaPct <= -15 ? `You're ${Math.round(loc.budgetDeltaPct)}% vs typical` :
                                "Budget matches this area"
                              }
                              sx={{
                                height: 20,
                                fontSize: 11,
                                fontWeight: 500,
                                bgcolor: loc.budgetDeltaPct <= -15 ? "rgba(185,28,28,0.08)" : loc.budgetDeltaPct >= 15 ? "rgba(13,148,136,0.08)" : "rgba(21,128,61,0.08)",
                                color: loc.budgetDeltaPct <= -15 ? "#b91c1c" : loc.budgetDeltaPct >= 15 ? "#0d9488" : "#15803d",
                              }}
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary" }}>
                          <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>Best for:</Box>{" "}
                          {bestForArchetype(loc)}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: "wrap" }}>
                          {loc.highlights.slice(0, 4).map((h) => (
                            <Chip key={h} size="small" label={h} sx={{ bgcolor: "action.hover", height: 20, fontSize: 11, mb: 0.5 }} />
                          ))}
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
                          <Button
                            size="small"
                            variant={isSelected ? "contained" : "outlined"}
                            onClick={(e) => { e.stopPropagation(); scrollToDetail(i); }}
                            sx={{ borderRadius: 999, textTransform: "none", fontSize: "0.8125rem", py: 0.25, px: 1.5 }}
                          >
                            Why this place ↓
                          </Button>
                          <Button
                            size="small"
                            variant={inCompare ? "contained" : "outlined"}
                            color={inCompare ? "primary" : "inherit"}
                            onClick={(e) => { e.stopPropagation(); toggleCompare(loc.id); }}
                            sx={{
                              borderRadius: 999,
                              textTransform: "none",
                              fontSize: "0.8125rem",
                              py: 0.25,
                              px: 1.5,
                              borderColor: inCompare ? undefined : "divider",
                              color: inCompare ? "white" : "text.primary",
                            }}
                          >
                            {inCompare ? "✓ Added to compare" : "+ Compare"}
                          </Button>
                        </Stack>
                      </Box>
                      {isSelected && (
                        <Chip
                          size="small"
                          label="Open on map"
                          sx={{
                            alignSelf: "flex-start",
                            bgcolor: "primary.main",
                            color: "white",
                            height: 22,
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        />
                      )}
                    </Stack>
                  </Paper>
                </motion.div>
              );
            })}
          </motion.div>

          {!showAll && recommendations.length > 3 && (
            <Button
              fullWidth
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setShowAll(true)}
              sx={{ borderRadius: 2, textTransform: "none", mt: 1 }}
            >
              View {recommendations.length - 3} more locations
            </Button>
          )}
        </Box>

        {/* Map */}
        <Box sx={{ position: { lg: "sticky" }, top: 24 }}>
          <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
            <Box sx={{ height: 380 }}>
              <MapView
                locations={mapLocations}
                center={[selectedLocation.lat, selectedLocation.lng]}
                zoom={14}
                selectedId={selectedLocation.id}
              />
            </Box>
          </Paper>
          <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, px: 0.5 }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#15803d" }} />
              <Typography variant="caption" color="text.secondary">Strong</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#0d9488" }} />
              <Typography variant="caption" color="text.secondary">Moderate</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#c2410c" }} />
              <Typography variant="caption" color="text.secondary">Fair</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#b91c1c" }} />
              <Typography variant="caption" color="text.secondary">Caution</Typography>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* ────────── 3. Selected location detail ────────── */}
      <AnimatePresence mode="wait">
        <motion.div id="location-detail" key={selectedLocation.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4, ease }} style={{ scrollMarginTop: 24 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-start" }} spacing={2}>
              <Box>
                <Typography variant="overline" sx={{ letterSpacing: "0.28em", fontSize: 11, color: "text.secondary", fontWeight: 500 }}>
                  Why this location was recommended
                </Typography>
                <Typography className="font-display" sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, letterSpacing: "-0.025em", lineHeight: 1.1, mt: 0.5 }}>
                  Why {selectedLocation.name} is a{" "}
                  <Box component="em" sx={{ fontStyle: "italic", color: selBand.color }}>{selBand.label.toLowerCase()}</Box>
                </Typography>
                <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary" }}>
                  <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>Best for:</Box>{" "}
                  {bestForArchetype(selectedLocation)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small"><BookmarkBorderIcon fontSize="small" /></IconButton>
                <IconButton size="small"><ShareIcon fontSize="small" /></IconButton>
              </Stack>
            </Stack>

            {/* Plain-English paragraph */}
            <Typography sx={{ mt: 2, fontSize: "1rem", lineHeight: 1.6, color: "text.secondary", maxWidth: 760 }}>
              {selectedLocation.name} suits your{" "}
              <Box component="span" sx={{ color: "text.primary" }}>{businessLabel}</Box>{" "}
              because {selectedLocation.reasoning}. The composite score is{" "}
              <Box component="span" sx={{ color: selBand.color, fontWeight: 600 }}>{selectedLocation.score}/100</Box>{" "}
              — a {selBand.label.toLowerCase()} — reflecting how well your budget, the local footfall, and existing competition balance out for this business.
            </Typography>

            {/* Factor contribution bars */}
            <Box sx={{ mt: 4 }}>
              <Typography sx={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "text.secondary", fontWeight: 500, mb: 2 }}>
                Why it may suit you · Things to watch
              </Typography>
              <Stack spacing={1.75}>
                {selFactors.map((f) => {
                  const positive = f.value >= 0;
                  const mag = Math.min(40, Math.abs(f.value));
                  const widthPct = (mag / 40) * 50;
                  return (
                    <Box key={f.label} sx={{ display: "grid", gridTemplateColumns: "1fr 240px 48px", gap: 2, alignItems: "center" }}>
                      <Typography variant="body2" sx={{ color: "text.primary" }}>{f.label}</Typography>
                      <Box sx={{ position: "relative", height: 8, bgcolor: "action.hover", borderRadius: 99 }}>
                        <Box sx={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, bgcolor: "divider" }} />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ duration: 0.7, ease }}
                          style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            [positive ? "left" : "right"]: "50%",
                            background: positive ? "#15803d" : "#b91c1c",
                            borderRadius: 99,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: positive ? "#15803d" : "#b91c1c", textAlign: "right" }}>
                        {positive ? "+" : ""}{f.value}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            {/* Monthly trend */}
            <Box sx={{ mt: 4 }}>
              <Typography sx={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "text.secondary", fontWeight: 500, mb: 1 }}>
                Best time to open in this area
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, maxWidth: 760 }}>
                {monthlyInsight}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 0.75, alignItems: "end", height: 84 }}>
                {data.monthly_scores.map((m, i) => {
                  const isBest = data.best_months.includes(m.month);
                  const isWeak = data.worst_months.includes(m.month);
                  return (
                    <motion.div
                      key={m.month}
                      initial={{ height: 0 }}
                      animate={{ height: `${m.score}%` }}
                      transition={{ duration: 0.7, delay: 0.1 + i * 0.03, ease }}
                      style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}
                    >
                      <Box sx={{
                        width: "100%",
                        height: `${m.score}%`,
                        bgcolor: isBest ? "#15803d" : isWeak ? "#fca5a5" : "#cbd5e1",
                        borderRadius: "3px 3px 0 0",
                      }} />
                    </motion.div>
                  );
                })}
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 0.75, mt: 0.5 }}>
                {MONTH_SHORT.map((n) => (
                  <Typography key={n} variant="caption" sx={{ textAlign: "center", fontSize: 10, color: "text.secondary" }}>{n}</Typography>
                ))}
              </Box>
              <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Box sx={{ width: 10, height: 10, bgcolor: "#15803d", borderRadius: "2px 2px 0 0" }} />
                  <Typography variant="caption" color="text.secondary">Peak months</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Box sx={{ width: 10, height: 10, bgcolor: "#fca5a5", borderRadius: "2px 2px 0 0" }} />
                  <Typography variant="caption" color="text.secondary">Weakest months</Typography>
                </Stack>
              </Stack>
            </Box>

            {/* Warnings */}
            {selectedLocation.notes.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography sx={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "text.secondary", fontWeight: 500, mb: 2 }}>
                  Business risks to consider
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.5 }}>
                  {selectedLocation.notes.map((n) => {
                    const palette = n.severity === "caution"
                      ? { bg: "rgba(194,65,12,0.06)", border: "rgba(194,65,12,0.25)", dot: "#c2410c", label: "Caution" }
                      : { bg: "rgba(14,165,233,0.06)", border: "rgba(14,165,233,0.25)", dot: "#0284c7", label: "Note" };
                    return (
                      <Paper key={n.title} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: palette.bg, borderColor: palette.border }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: palette.dot, mt: 0.75, flexShrink: 0 }} />
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ color: palette.dot }}>
                              {n.title}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: "text.primary" }}>
                              {n.note}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Actions */}
            <Stack direction="row" spacing={1.5} sx={{ mt: 4 }}>
              <Button variant="contained" endIcon={<OpenInNewIcon />} onClick={() => setReportOpen(true)} sx={{ borderRadius: 999, textTransform: "none" }}>
                View full ranking
              </Button>
              <Button variant="outlined" onClick={() => navigate("/dashboard")} sx={{ borderRadius: 999, textTransform: "none" }}>
                Edit input
              </Button>
            </Stack>
          </Paper>
        </motion.div>
      </AnimatePresence>

      {/* ────────── Sticky compare bar ────────── */}
      <AnimatePresence>
        {compareSet.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1100, padding: "16px 24px", pointerEvents: "none" }}
          >
            <Paper elevation={8} sx={{ maxWidth: 640, mx: "auto", p: 1.5, borderRadius: 999, display: "flex", alignItems: "center", gap: 2, pointerEvents: "auto" }}>
              <Typography variant="body2" sx={{ ml: 2, fontWeight: 500 }}>
                {compareSet.size} location{compareSet.size > 1 ? "s" : ""} selected to compare
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button size="small" onClick={() => setCompareSet(new Set())} sx={{ borderRadius: 999, textTransform: "none" }}>
                Clear
              </Button>
              <Button
                variant="contained"
                size="small"
                disabled={compareSet.size < 2}
                onClick={() => setCompareOpen(true)}
                sx={{ borderRadius: 999, textTransform: "none", px: 3 }}
              >
                Compare {compareSet.size < 2 ? `(pick ${2 - compareSet.size} more)` : "now"}
              </Button>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare dialog */}
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 1 }}>
          <Typography className="font-display" sx={{ fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
            Side-by-side comparison
          </Typography>
          <IconButton onClick={() => setCompareOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {(() => {
            const selected = recommendations.filter((r) => compareSet.has(r.id));
            const rows = [
              { k: "Suitability score", v: (l) => <Chip size="small" label={`${l.score}/100 · ${getScoreBand(l.score).label}`} sx={{ bgcolor: getScoreBand(l.score).bg, color: getScoreBand(l.score).color, fontWeight: 500 }} /> },
              { k: "Budget fit", v: (l) => `${l.metrics.budgetFit}%` },
              { k: "Footfall", v: (l) => `${l.metrics.footfall}%` },
              { k: "Low competition", v: (l) => `${l.metrics.lowCompetition}%` },
              { k: "Character", v: (l) => l.highlights.join(", ") },
              { k: "Things to consider", v: (l) => l.notes.length ? l.notes.map((n) => n.title).join("; ") : "No major flags" },
            ];
            return (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 180 }}>Factor</TableCell>
                    {selected.map((l) => (
                      <TableCell key={l.id} sx={{ fontWeight: 600 }}>
                        #{l.rank} {l.name}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.k}>
                      <TableCell sx={{ color: "text.secondary" }}>{r.k}</TableCell>
                      {selected.map((l) => <TableCell key={l.id}>{r.v(l)}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Full ranking dialog (existing) */}
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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
              {recommendations.map((loc) => {
                const band = getScoreBand(loc.score);
                return (
                  <TableRow key={loc.id}>
                    <TableCell>#{loc.rank}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{loc.name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={`${loc.score} · ${band.label}`} sx={{ bgcolor: band.bg, color: band.color, fontWeight: 500 }} />
                    </TableCell>
                    <TableCell>{loc.metrics.budgetFit}%</TableCell>
                    <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>{loc.reasoning}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
