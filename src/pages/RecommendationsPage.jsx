import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import MapView from "../components/MapView.jsx";
import { fetchRecommendations, checkMlHealth, checkShapHealth } from "../lib/ml.js";

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
    { severity: "caution", title: "Traffic congestion", note: "Peak-hour congestion near the bus stand; deliveries may be slower 4-6pm." },
    { severity: "info", title: "Heritage zoning", note: "Some nearby parcels protected under UDA heritage restrictions." },
  ],
  "Gregory Lake Front": [
    { severity: "caution", title: "Premium rent", note: "Lakefront parcels command 3-10× the district average." },
    { severity: "info", title: "Tourism-driven demand", note: "Walk-in customer numbers swing with holiday seasons . revenue will be lumpy." },
  ],
  "Hakgala Road": [
    { severity: "info", title: "Tourist corridor", note: "Plenty of visitors passing near Hakgala Garden; competition clusters to avoid." },
  ],
  "Pedro / Hill Club Area": [
    { severity: "info", title: "Upscale demographic", note: "Heritage / country-club clientele; price points should match." },
  ],
  "Nanu Oya": [
    { severity: "info", title: "Transit hub", note: "Rail passengers pass through but don't always stay . plan walk-in flow accordingly." },
  ],
  "Ambewela": [
    { severity: "caution", title: "Few walk-in customers", note: "Rural dairy area; walk-in customers are sparse without a destination pull." },
    { severity: "caution", title: "Telecom coverage", note: "nPerf shows patchy 4G outside the town strip." },
  ],
  "Kandapola": [
    { severity: "info", title: "Niche tourism", note: "Upscale tea bungalow cluster; works for curated experiences, not mass market." },
  ],
  "Glencairn": [
    { severity: "caution", title: "Rural access", note: "Narrower roads; delivery logistics can be harder in monsoon months." },
  ],
  "Hawa Eliya": [
    { severity: "info", title: "Residential growth", note: "More local walk-in customers from new housing; commercial supply still limited." },
  ],
  "Lover's Leap": [
    { severity: "caution", title: "Landslide risk", note: "Moderate seasonal risk near the fall; verify site before leasing." },
  ],
  "Seetha Eliya": [
    { severity: "info", title: "Religious tourism", note: "Temple visitors bring walk-in customers; consider vegetarian/pilgrim preferences in menu." },
  ],
  "Tea estates belt": [
    { severity: "caution", title: "Remote", note: "Far from town; only works if the business is itself the destination." },
    { severity: "caution", title: "Connectivity", note: "Cellular and fixed-line coverage can be thin." },
  ],
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Translate one SHAP driver into a sentence an SME owner can read at a glance.
// Returns { headline, detail, verb } . headline is what the feature MEANS in
// business terms; detail is the actual value seen for this prediction; verb is
// "lifted" or "lowered" depending on whether SHAP raised or reduced the score.
function describeShapDriver(d) {
  const v = d.feature_value;
  const verb = d.direction === "positive" ? "lifted" : "lowered";
  const arrow = d.direction === "positive" ? "↑" : "↓";

  switch (d.feature) {
    case "is_peak":
      return { headline: v >= 1 ? "Peak tourist month" : "Not a peak tourist month",
               detail: v >= 1 ? "April, August or December . busy season for Nuwara Eliya" : "Tourists are quieter in this month",
               verb, arrow };
    case "is_monsoon":
      return { headline: v >= 1 ? "Monsoon season" : "Outside monsoon season",
               detail: v >= 1 ? "Heavy rain reduces walk-in traffic" : "Drier weather, more walk-ins",
               verb, arrow };
    case "off_peak_severity":
      return { headline: v <= 0 ? "Mild off-season slowdown" : "Steep off-season slowdown",
               detail: "How much demand drops when tourists leave",
               verb, arrow };
    case "month":
      return { headline: `Calendar month: ${MONTH_LONG[Math.max(0, Math.min(11, Math.round(v) - 1))]}`,
               detail: "The model learned different demand for each month",
               verb, arrow };
    case "precip_mm":
      return { headline: `${Math.round(v)} mm of rain`,
               detail: v > 200 ? "Heavy rainfall keeps customers indoors" : "Light to moderate rainfall",
               verb, arrow };
    case "rainy_days":
      return { headline: `${Math.round(v)} rainy days this month`,
               detail: v > 15 ? "More than half the month is wet" : "Mostly dry . good for walk-ins",
               verb, arrow };
    case "avg_temp":
      return { headline: `Average ${v.toFixed(1)}°C`,
               detail: "Nuwara Eliya's cool climate is a tourism draw",
               verb, arrow };
    case "humidity":
      return { headline: `${Math.round(v)}% humidity`,
               detail: "Comfort level affects how long visitors linger",
               verb, arrow };
    case "sun_hours":
      return { headline: `${v.toFixed(1)} sun-hours / day`,
               detail: v >= 6 ? "Bright days . good for outdoor seating" : "Overcast days dominate",
               verb, arrow };
    case "avg_arrivals":
      return { headline: `${Math.round(v).toLocaleString()} tourists / month`,
               detail: "How many visitors Nuwara Eliya gets in a typical year",
               verb, arrow };
    case "std_arrivals":
      return { headline: "Tourist numbers vary a lot",
               detail: "Some months are far busier than others",
               verb, arrow };
    case "events_count":
      return { headline: `${Math.round(v)} local event${Math.round(v) === 1 ? "" : "s"} this month`,
               detail: v > 0 ? "Festivals and events bring extra footfall" : "No major events scheduled",
               verb, arrow };
    case "event_impact":
      return { headline: v > 10 ? "High event-tourism impact" : "Moderate event impact",
               detail: "How much local events boost demand",
               verb, arrow };
    case "est_daily_visitors":
      return { headline: `~${Math.round(v).toLocaleString()} daily visitors`,
               detail: "Estimated walk-in customer pool",
               verb, arrow };
    case "seasonality_index":
      return { headline: `Seasonality strength ${v.toFixed(2)}`,
               detail: "How peaky the busy/quiet cycle is for this business",
               verb, arrow };
    case "rating":
      return { headline: `Typical rating ${v.toFixed(1)} / 5`,
               detail: "Average customer rating across this business type",
               verb, arrow };
    case "competition_density":
      return { headline: v > 100 ? "High competition nearby" : "Low competition nearby",
               detail: v > 100
                 ? `${Math.round(v)} similar businesses nearby . you'll need clear branding to stand out`
                 : `Only ~${Math.round(v)} similar businesses nearby . easier to stand out, but demand is less proven`,
               verb, arrow };
    case "review_log":
    case "review_popularity":
      return { headline: "Online review activity",
               detail: "How often customers leave reviews for this category",
               verb, arrow };
    case "is_above_median_rating":
      return { headline: v >= 1 ? "Above-average customer ratings" : "Below-average customer ratings",
               detail: "Compared to other business types in the area",
               verb, arrow };
    case "rating_vs_type":
      return { headline: "Reputation vs. similar businesses",
               detail: "How this category rates relative to its peers",
               verb, arrow };
    case "confidence_score":
      return { headline: "Reputation strength",
               detail: "How established this business type is",
               verb, arrow };
    case "digital_presence":
      return { headline: v >= 1 ? "Strong online presence in category" : "Limited online presence",
               detail: "How visible similar businesses are online",
               verb, arrow };
    case "category_encoded":
      return { headline: "Business category baseline",
               detail: "Each category has its own demand baseline",
               verb, arrow };
    default:
      return { headline: d.label, detail: `value: ${v}`, verb, arrow };
  }
}

const ease = [0.22, 1, 0.36, 1];

// Map 0-100 score to a plain-English band + colour.
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
    label: m.budgetFit >= 75 ? "Within your budget" : m.budgetFit >= 50 ? "Within budget with room to spare" : "Budget is below usual rent",
    value: budgetPts,
  });
  const footfallPts = Math.round((m.footfall - 50) * 0.20);
  bars.push({
    label: m.footfall >= 70 ? "Strong walk-in customer flow" : m.footfall >= 45 ? "Moderate walk-in flow" : "Fewer walk-in customers",
    value: footfallPts,
  });
  const compPts = Math.round((m.lowCompetition - 50) * 0.15);
  bars.push({
    label: m.lowCompetition >= 70 ? "Low competition nearby" : m.lowCompetition >= 45 ? "Moderate competition" : "High competition nearby",
    value: compPts,
  });
  const mlPts = Math.round((m.mlOverall - 50) * 0.40);
  bars.push({
    label: m.mlOverall >= 55 ? "Demand pattern suits this business" : "Customer demand may be lower here",
    value: mlPts,
  });
  const peakPts = Math.round((m.peakSeason - 50) * 0.20);
  bars.push({
    label: m.peakSeason >= 65 ? "Strong lift during tourist peaks" : "Modest tourist-season lift",
    value: peakPts,
  });
  return bars.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

// "Best for" label . pick the user archetype this area suits most.
function bestForArchetype(loc) {
  const m = loc.metrics;
  if (m.lowCompetition >= 70 && m.budgetFit >= 60) return "Owners wanting a quiet, low-competition start";
  if (m.footfall >= 75) return "Businesses that live on walk-in customers";
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
    { k: "walk-in customers", v: m.footfall },
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
  // Per-card "Technical details" toggles (expert/professional layer).
  // Set holds card ids that are currently expanded.
  const [techExpanded, setTechExpanded] = useState(() => new Set());
  // Page-level "Methodology" panel toggle (above the cards).
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const toggleTech = (id) => setTechExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Live ML model status . proves the page is talking to the real FastAPI service.
  const [mlHealth, setMlHealth] = useState(null);
  // Live SHAP service status . confirms the explainer is loaded.
  const [shapHealth, setShapHealth] = useState(null);
  // Timing of the last predict call so we can display "predicted in X ms".
  const [predictMs, setPredictMs] = useState(null);

  // ───── What-if simulator state ─────
  // Baseline captured from the dashboard submission. Never mutated after first
  // load . used to compute rank deltas and to drive the Reset button.
  const baselineInputsRef = useRef(null);
  const baselineRecommendationsRef = useRef(null);
  // Current inputs being simulated. When this differs from baselineInputsRef,
  // the page is showing what-if results and the banner + reset button appear.
  const [whatIfInputs, setWhatIfInputs] = useState(null);
  // Re-fetching state for what-if requests (separate from the initial loading).
  const [whatIfBusy, setWhatIfBusy] = useState(false);
  // Whether the what-if controls panel is expanded.
  const [whatIfOpen, setWhatIfOpen] = useState(false);

  const isWhatIfActive =
    whatIfInputs && baselineInputsRef.current
      ? JSON.stringify(whatIfInputs) !== JSON.stringify(baselineInputsRef.current)
      : false;

  // Fire a what-if prediction with the given input overrides. Merges over
  // the current `whatIfInputs` so chips can update one field at a time.
  const runWhatIf = async (overrides) => {
    if (!baselineInputsRef.current) return;
    const next = { ...(whatIfInputs || baselineInputsRef.current), ...overrides };
    setWhatIfInputs(next);
    setWhatIfBusy(true);
    try {
      const t0 = performance.now();
      const result = await fetchRecommendations(next);
      const elapsed = Math.round(performance.now() - t0);
      setData(result);
      setPredictMs(elapsed);
      setSelectedIdx(0);
    } catch (e) {
      setError(e.message || "What-if prediction failed.");
    } finally {
      setWhatIfBusy(false);
    }
  };

  // Restore the original inputs and re-fetch the baseline recommendation set.
  const resetWhatIf = async () => {
    if (!baselineInputsRef.current) return;
    setWhatIfBusy(true);
    try {
      const result = await fetchRecommendations(baselineInputsRef.current);
      setData(result);
      setWhatIfInputs(baselineInputsRef.current);
      setSelectedIdx(0);
    } catch (e) {
      setError(e.message || "Failed to restore baseline.");
    } finally {
      setWhatIfBusy(false);
    }
  };

  // Compute rank changes between current recommendations and baseline. Returns
  // top 3 by absolute rank shift so the delta strip stays readable.
  const rankDeltas = useMemo(() => {
    if (!isWhatIfActive || !baselineRecommendationsRef.current || !data?.recommendations) return [];
    const baseRanks = new Map(
      baselineRecommendationsRef.current.map((r) => [r.area, r.rank])
    );
    const deltas = data.recommendations
      .map((r) => {
        const oldRank = baseRanks.get(r.area);
        if (oldRank == null) return null;
        return { area: r.area, oldRank, newRank: r.rank, shift: oldRank - r.rank };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
    return deltas.slice(0, 3);
  }, [data, isWhatIfActive]);

  useEffect(() => {
    let cancelled = false;
    checkMlHealth().then((h) => { if (!cancelled) setMlHealth(h); });
    checkShapHealth().then((h) => { if (!cancelled) setShapHealth(h); });
    return () => { cancelled = true; };
  }, []);

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
        const t0 = performance.now();
        const result = await fetchRecommendations(payload);
        const elapsed = Math.round(performance.now() - t0);
        if (!cancelled) {
          setData(result);
          setPredictMs(elapsed);
          // Capture baseline so what-if can diff against it later.
          if (!baselineInputsRef.current) {
            baselineInputsRef.current = payload;
            baselineRecommendationsRef.current = result.recommendations;
            setWhatIfInputs(payload);
          }
        }
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
      // 4-line SME-friendly reasoning (Budget , Customers , Competition , Advice)
      reasoningStructured: r.reasoning_structured || null,
      typicalRentLkr: r.typical_rent_lkr,
      typicalPurchaseLkr: r.typical_purchase_lkr,
      budgetDeltaPct: r.budget_delta_pct,
      // Per-area SHAP . explains why XGBoost gave THIS area its score.
      shapTopDrivers: r.shap_top_drivers || [],
      modelScore: r.model_score,
      // Phase 1 honesty + SME advisory layer fields.
      modelRank: r.model_rank,                     // pure XGBoost rank (ignores preferred-area pin)
      isPreferredPin: r.is_preferred_pin === true, // true only when pin actually moved this card up
      economics: r.economics || null,              // typical_rent + budget_fit object
      advisory: r.advisory || null,                // customer_types, best_for, main_risk, strategy, action, startup_risk, break_even, confidence
      scores: r.scores || null,                    // overall_match + breakdown
      // Phase 3 + 4 + technical layer
      main_differences: r.main_differences || [],
      main_differences_top1_area: r.main_differences_top1_area || "",
      similar_to: r.similar_to || [],
      shapMath: r.shap_math || null,               // base + Σshap == model_output (per-card identity)
      shapFull: r.shap_full || {},                 // full 24-feature SHAP map (for technical drilldown)
      notes: AREA_NOTES[r.area] || [],
    }));
  }, [data]);

  const selectedLocation = recommendations[selectedIdx];
  const visible = showAll ? recommendations : recommendations.slice(0, 3);
  // Internal ML keys are lowercase ASCII (e.g. "cafe"); the display label uses
  // proper spelling/diacritics (e.g. "Cafe"). Anything not in the table falls
  // back to a Title-cased version of the underscored key.
  const BUSINESS_DISPLAY_NAMES = {
    cafe: "Cafe",
    restaurant: "Restaurant",
    retail_shop: "Retail Shop",
    wellness_center: "Wellness Center",
    hotel: "Hotel",
  };
  const rawType = data?.business_type || "";
  const businessLabel =
    BUSINESS_DISPLAY_NAMES[rawType] ||
    rawType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const firstBestMonth = data?.best_months?.[0];
  const bestArea = recommendations[0]?.name;
  // The "Top strength" tile uses the #1-ranked area's SHAP top positive driver .
  // i.e. what XGBoost rewarded most about THAT specific area. Falls back to the
  // rule-of-thumb describeTopStrength() if SHAP is unavailable.
  const top1AreaDrivers = recommendations[0]?.shapTopDrivers || [];
  const topShapDriver = top1AreaDrivers.find((d) => d.direction === "positive");
  const topShapDescription = topShapDriver ? describeShapDriver(topShapDriver) : null;
  const topStrengthLabel = topShapDescription
    ? topShapDescription.headline
    : recommendations[0]
      ? describeTopStrength(recommendations[0]).charAt(0).toUpperCase() + describeTopStrength(recommendations[0]).slice(1)
      : "Balanced fit";
  const topStrengthSub = topShapDescription
    ? `Why ${bestArea} ranked #1 , +${Math.round(Math.abs(topShapDriver.shap_value))} pts`
    : `Strongest driver for ${bestArea}`;

  // Top summary tiles. Derive helpful "best X" picks from the recommendation set.
  // Each tile shows a plain-English headline.
  //
  // bestOverallByModel = the area the model itself ranked #1, ignoring any
  // preferred-area pin. This is what the user should see as the system's
  // honest recommendation, even when they pinned a different area first.
  const bestOverallByModel = useMemo(() => {
    if (!recommendations.length) return null;
    return recommendations.find((r) => r.modelRank === 1) || recommendations[0];
  }, [recommendations]);
  const bestBudgetFit = useMemo(() => {
    if (!recommendations.length) return null;
    return [...recommendations].sort(
      (a, b) => (b.scores?.budget_fit_score || 0) - (a.scores?.budget_fit_score || 0)
    )[0];
  }, [recommendations]);
  const lowestRiskArea = useMemo(() => {
    if (!recommendations.length) return null;
    const RISK_RANK = { Low: 0, Medium: 1, High: 2 };
    return [...recommendations].sort((a, b) => {
      const ra = RISK_RANK[a.advisory?.startup_risk?.level] ?? 1;
      const rb = RISK_RANK[b.advisory?.startup_risk?.level] ?? 1;
      if (ra !== rb) return ra - rb;
      return (b.score || 0) - (a.score || 0);
    })[0];
  }, [recommendations]);
  const preferredAreaCard = useMemo(
    () => recommendations.find((r) => r.isPreferredPin),
    [recommendations]
  );

  const mapLocations = recommendations.map((r) => {
    const band = getScoreBand(r.score);
    return {
      id: r.id,
      rank: r.rank,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      description: `${r.type} , ${r.score}/100 , ${band.label}`,
      scoreColor: band.dot,
      renderPopup: () => {
        // Map popup is intentionally short . the card carries the detail.
        // Pull the one-line summary from the structured reasoning's advice field
        // when available, otherwise compose a compact fallback from budget+competition+footfall.
        const adviceLine =
          r.reasoningStructured?.advice?.replace(/^Advice:\s*/, "") || "Open the card for full details.";
        return (
          <div style={{ minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ background: band.bg, color: band.color, fontWeight: 600, padding: "2px 8px", borderRadius: 999, fontSize: 12 }}>
                #{r.rank} , {r.score}/100
              </span>
              <span style={{ fontSize: 12, color: band.color, fontWeight: 500 }}>{band.label}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, lineHeight: 1.4 }}>
              Typical rent: <strong>LKR {r.typicalRentLkr.toLocaleString()}/mo</strong>
            </div>
            <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
              {adviceLine.charAt(0).toUpperCase() + adviceLine.slice(1)}
            </div>
          </div>
        );
      },
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
  const monthlyInsight = `Try to open close to ${bestMonthNames} for a stronger launch . demand is softer during ${weakMonthNames}.`;

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
          Based on your budget, customer flow, competition, and seasonality, these are the best areas to consider.
        </Typography>

        {/* Top summary tiles . Best Overall , Best Budget Fit , Lowest Risk , (Preferred area, only if pinned) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: preferredAreaCard ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
            },
            gap: 2,
            mt: 3,
          }}
        >
          {[
            // Top tile is always the model's actual top pick, ignoring any
            // preferred-area pin. So the user sees what the model thinks is best
            // even when they pinned a different area for personal reasons.
            bestOverallByModel && {
              label: "Best Overall Match",
              value: bestOverallByModel.name,
              metric: `${bestOverallByModel.scores?.overall_match ?? bestOverallByModel.score}/100`,
              sub: preferredAreaCard
                ? "The strongest match across budget, customers, and competition"
                : "Combines budget, customer flow, and competition",
              color: "#15803d",
            },
            bestBudgetFit && {
              label: "Best Budget Fit",
              value: bestBudgetFit.name,
              metric: `${bestBudgetFit.scores?.budget_fit_score ?? "."}/100`,
              sub: bestBudgetFit.economics?.budget_fit?.status || "Affordability score",
              color: "#0d9488",
            },
            lowestRiskArea && {
              label: "Lowest Startup Risk",
              value: lowestRiskArea.name,
              metric: lowestRiskArea.advisory?.startup_risk?.level || ".",
              sub: "Demand, budget, and competition combined",
              color: "#2563eb",
            },
            preferredAreaCard && {
              label: "Your Preferred Area",
              value: preferredAreaCard.name,
              metric: `${preferredAreaCard.scores?.overall_match ?? preferredAreaCard.score}/100`,
              sub: "Shown first because you selected this area",
              color: "#b45309",
            },
          ]
            .filter(Boolean)
            .map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease }}
              >
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "text.secondary", fontWeight: 500 }}>
                      {c.label}
                    </Typography>
                  </Stack>
                  <Typography className="font-display" sx={{ fontSize: "1.35rem", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                    {c.value}
                  </Typography>
                  <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: c.color, mt: 0.25 }}>
                    {c.metric}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, lineHeight: 1.4 }}>
                    {c.sub}
                  </Typography>
                </Paper>
              </motion.div>
            ))}
        </Box>
      </motion.div>


      {/* ────────── 1d. What-if simulator ──────────
          Lets the user explore "what changes if I shift my budget / land intent /
          business type / opening month?" Each chip click re-fires /predict and
          re-renders the cards in place. A delta strip shows rank shifts vs the
          original inputs the user submitted on the dashboard. */}
      {baselineInputsRef.current && (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", borderColor: isWhatIfActive ? "#b45309" : "divider", borderWidth: isWhatIfActive ? 1.5 : 1 }}>
          <Box
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, cursor: "pointer", "&:hover": { bgcolor: "rgba(0,0,0,0.03)" }, bgcolor: isWhatIfActive ? "rgba(245,158,11,0.06)" : "transparent" }}
            onClick={() => setWhatIfOpen((v) => !v)}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box sx={{ fontSize: 18 }}>🔀</Box>
              <Box>
                <Typography sx={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "text.secondary", fontWeight: 600 }}>
                  What-if simulator
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {whatIfOpen
                    ? "Adjust inputs to see how the ranking changes"
                    : isWhatIfActive
                      ? "Showing what-if results , click to expand controls"
                      : "Click to explore alternate budgets, business types, months"}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              {isWhatIfActive && (
                <Chip
                  size="small"
                  label="What-if active"
                  sx={{ bgcolor: "rgba(245,158,11,0.16)", color: "#b45309", fontWeight: 700, height: 22, fontSize: 11 }}
                />
              )}
              {whatIfOpen ? <ExpandLessIcon sx={{ color: "text.secondary" }} /> : <ExpandMoreIcon sx={{ color: "text.secondary" }} />}
            </Stack>
          </Box>
          <Collapse in={whatIfOpen}>
            <Box sx={{ p: 2, pt: 0 }}>
              {(() => {
                const base = baselineInputsRef.current;
                const cur = whatIfInputs || base;
                // Helper to render a row of chips for one input dimension.
                const ChipRow = ({ label, options, currentValue, onPick }) => (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ display: "block", fontWeight: 600, color: "text.secondary", mb: 0.5, letterSpacing: "0.05em" }}>
                      {label}
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
                      {options.map((opt) => {
                        const isCurrent = String(opt.value) === String(currentValue);
                        const isBaseline = String(opt.value) === String(opt.baselineValue);
                        return (
                          <Chip
                            key={opt.label}
                            size="small"
                            label={opt.label + (isBaseline ? " , original" : "")}
                            onClick={() => !whatIfBusy && !isCurrent && onPick(opt.value)}
                            disabled={whatIfBusy}
                            sx={{
                              height: 26,
                              fontSize: 12,
                              fontWeight: isCurrent ? 700 : 500,
                              cursor: isCurrent ? "default" : "pointer",
                              mb: 0.5,
                              bgcolor: isCurrent ? "primary.main" : isBaseline ? "rgba(0,0,0,0.05)" : "transparent",
                              color: isCurrent ? "white" : "text.primary",
                              border: "1px solid",
                              borderColor: isCurrent ? "primary.main" : "divider",
                              "&:hover": isCurrent ? {} : { bgcolor: "rgba(37,99,235,0.08)", borderColor: "primary.main" },
                            }}
                          />
                        );
                      })}
                    </Stack>
                  </Box>
                );

                const baseAmount = Number(base.amount) || 0;
                const budgetOptions = [
                  { label: "−50%", value: Math.round(baseAmount * 0.5) },
                  { label: "Original", value: baseAmount, baselineValue: baseAmount },
                  { label: "+50%", value: Math.round(baseAmount * 1.5) },
                  { label: "+100%", value: Math.round(baseAmount * 2) },
                ];

                const businessOptions = [
                  { label: "Cafe", value: "Cafe" },
                  { label: "Restaurant", value: "Restaurant" },
                  { label: "Hotel", value: "Hotel" },
                  { label: "Retail Shop", value: "retail_shop" },
                  { label: "Wellness Centre", value: "wellness_center" },
                ].map((o) => ({ ...o, baselineValue: base.businessType }));

                const monthOptions = MONTH_LONG.map((name, idx) => ({
                  label: name.slice(0, 3),
                  value: idx + 1,
                  baselineValue: base.month || null,
                }));

                return (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5, lineHeight: 1.5 }}>
                      Original: {base.businessType} , LKR {Number(base.amount || 0).toLocaleString()} , {base.landIntent}
                      {base.preferredArea ? ` , prefers ${base.preferredArea}` : ""}
                    </Typography>

                    <ChipRow
                      label={`Budget (current: LKR ${Number(cur.amount || 0).toLocaleString()})`}
                      options={budgetOptions}
                      currentValue={cur.amount}
                      onPick={(v) => runWhatIf({ amount: v })}
                    />

                    <ChipRow
                      label={`Land intent (current: ${cur.landIntent})`}
                      options={[
                        { label: "Rent", value: "rent", baselineValue: base.landIntent },
                        { label: "Purchase", value: "purchase", baselineValue: base.landIntent },
                      ]}
                      currentValue={cur.landIntent}
                      onPick={(v) => runWhatIf({ landIntent: v })}
                    />

                    <ChipRow
                      label={`Business type (current: ${cur.businessType})`}
                      options={businessOptions}
                      currentValue={cur.businessType}
                      onPick={(v) => runWhatIf({ businessType: v })}
                    />

                    <ChipRow
                      label={`Opening month (current: ${cur.month ? MONTH_LONG[cur.month - 1] : "auto-detected peak"})`}
                      options={[
                        { label: "Auto (peak)", value: null, baselineValue: base.month || null },
                        ...monthOptions,
                      ]}
                      currentValue={cur.month ?? null}
                      onPick={(v) => runWhatIf({ month: v })}
                    />

                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={resetWhatIf}
                        disabled={!isWhatIfActive || whatIfBusy}
                        startIcon={<ReplayIcon />}
                        sx={{ borderRadius: 999, textTransform: "none" }}
                      >
                        Reset to original inputs
                      </Button>
                      {whatIfBusy && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={14} />
                          <Typography variant="caption" color="text.secondary">Re-running prediction…</Typography>
                        </Stack>
                      )}
                    </Stack>

                    {/* Rank delta strip . top 3 areas by absolute rank shift vs baseline */}
                    {isWhatIfActive && rankDeltas.length > 0 && (
                      <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#b45309", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                          Biggest changes vs your original inputs
                        </Typography>
                        <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                          {rankDeltas.map((d) => {
                            const arrow = d.shift > 0 ? "↑" : d.shift < 0 ? "↓" : "•";
                            const color = d.shift > 0 ? "#15803d" : d.shift < 0 ? "#b91c1c" : "text.disabled";
                            return (
                              <Typography key={d.area} variant="caption" sx={{ display: "block", color: "text.primary" }}>
                                <Box component="span" sx={{ color, fontWeight: 700, mr: 0.75 }}>{arrow}</Box>
                                <Box component="strong">{d.area}</Box>
                                {": #"}{d.oldRank} → #{d.newRank}
                                {d.shift !== 0 && (
                                  <Box component="span" sx={{ color, ml: 0.5, fontSize: 11 }}>
                                    ({d.shift > 0 ? `up ${d.shift}` : `down ${Math.abs(d.shift)}`})
                                  </Box>
                                )}
                              </Typography>
                            );
                          })}
                        </Stack>
                      </Box>
                    )}
                  </>
                );
              })()}
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* What-if active banner . visible across the page when user is exploring alternates */}
      {isWhatIfActive && !whatIfOpen && (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            bgcolor: "rgba(245,158,11,0.08)",
            borderColor: "rgba(245,158,11,0.35)",
            p: 1.25,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box sx={{ fontSize: 18 }}>⚠️</Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#b45309", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Showing what-if results
            </Typography>
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
              These cards reflect modified inputs, not your original submission.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={resetWhatIf}
            disabled={whatIfBusy}
            startIcon={<ReplayIcon />}
            sx={{ borderRadius: 999, textTransform: "none" }}
          >
            Reset
          </Button>
        </Paper>
      )}

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
                      {/* Score block . shows the Overall Match score the user cares about. */}
                      <Box sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: band.bg, color: band.color, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, opacity: 0.85 }}>
                          Match
                        </Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: "1.35rem", lineHeight: 1 }}>
                          {loc.scores?.overall_match ?? loc.score}
                        </Typography>
                        <Typography sx={{ fontSize: 9, letterSpacing: "0.08em", mt: 0.25, opacity: 0.85 }}>/100</Typography>
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {/* === Header: rank , name , band chip === */}
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                          <Chip size="small" label={`#${loc.rank}`} variant="outlined" sx={{ fontWeight: 600, height: 20 }} />
                          <Typography variant="subtitle2" fontWeight={600} noWrap>{loc.name}</Typography>
                          <Chip size="small" label={band.label} sx={{ ml: "auto !important", bgcolor: band.bg, color: band.color, height: 20, fontSize: 11, fontWeight: 500 }} />
                        </Stack>

                        {/* === Preferred-area pin badge . shown when the user picked this area === */}
                        {loc.isPreferredPin && (
                          <Box sx={{ mt: 0.75, mb: 0.5, p: 1, borderRadius: 1.5, bgcolor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#b45309", letterSpacing: "0.02em" }}>
                              ★ Your preferred area
                            </Typography>
                            <Typography variant="caption" sx={{ display: "block", color: "#78350f", mt: 0.25, fontStyle: "italic", fontSize: 10 }}>
                              Shown first because it matches your selected preference.
                            </Typography>
                          </Box>
                        )}

                        {/* === Structured reasoning . 4 short labelled lines that read like advice ===
                            Falls back to the legacy `reasoning` paragraph if the backend hasn't
                            sent the structured object yet. */}
                        {loc.reasoningStructured ? (
                          <Box sx={{ mt: 1.25, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1, rowGap: 0.5 }}>
                            {[
                              { label: "Budget", text: loc.reasoningStructured.budget },
                              { label: "Customers", text: loc.reasoningStructured.customers },
                              { label: "Competition", text: loc.reasoningStructured.competition },
                              { label: "Advice", text: loc.reasoningStructured.advice?.replace(/^Advice:\s*/, "") },
                            ].map((row) => (
                              <React.Fragment key={row.label}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.6 }}>
                                  {row.label}:
                                </Typography>
                                <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                                  {row.text}
                                </Typography>
                              </React.Fragment>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.55 }}>
                            {loc.reasoning.charAt(0).toUpperCase() + loc.reasoning.slice(1)}
                          </Typography>
                        )}

                        {/* === Best for , Likely customers === */}
                        {(loc.advisory?.best_for?.length || loc.advisory?.customer_types?.length) && (
                          <Box sx={{ mt: 1.25 }}>
                            {loc.advisory?.best_for?.length > 0 && (
                              <Box sx={{ mb: 0.5 }}>
                                <Typography component="span" variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>Best for:</Typography>{" "}
                                <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                                  {loc.advisory.best_for.join(" , ")}
                                </Typography>
                              </Box>
                            )}
                            {loc.advisory?.customer_types?.length > 0 && (
                              <Box>
                                <Typography component="span" variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>Likely customers:</Typography>{" "}
                                <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                                  {loc.advisory.customer_types.join(" , ")}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        )}

                        {/* === Budget status panel === */}
                        <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 1.5, bgcolor: "rgba(0,0,0,0.02)", border: "1px solid", borderColor: "divider" }}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, flexWrap: "wrap" }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>Budget status</Typography>
                            {loc.economics?.budget_fit?.status && (
                              <Chip
                                size="small"
                                label={loc.economics.budget_fit.status}
                                sx={{
                                  ml: "auto !important",
                                  height: 20,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  bgcolor:
                                    loc.economics.budget_fit.status === "Within budget" ? "rgba(21,128,61,0.10)" :
                                    loc.economics.budget_fit.status === "Slightly above budget" ? "rgba(245,158,11,0.12)" :
                                    loc.economics.budget_fit.status === "Stretch option" ? "rgba(234,88,12,0.12)" :
                                    "rgba(185,28,28,0.10)",
                                  color:
                                    loc.economics.budget_fit.status === "Within budget" ? "#15803d" :
                                    loc.economics.budget_fit.status === "Slightly above budget" ? "#b45309" :
                                    loc.economics.budget_fit.status === "Stretch option" ? "#c2410c" :
                                    "#b91c1c",
                                }}
                              />
                            )}
                          </Stack>
                          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>Typical rent:</Box>{" "}
                              LKR {loc.typicalRentLkr.toLocaleString()}/mo
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>Purchase:</Box>{" "}
                              LKR {(loc.typicalPurchaseLkr / 1_000_000).toFixed(1)}M
                            </Typography>
                          </Stack>
                          {loc.economics?.budget_fit?.message && (
                            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5, lineHeight: 1.5 }}>
                              {loc.economics.budget_fit.message}
                            </Typography>
                          )}
                        </Box>

                        {/* === Risk + Confidence row === */}
                        {(loc.advisory?.startup_risk || loc.advisory?.confidence) && (
                          <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap" }} alignItems="center">
                            {loc.advisory?.startup_risk && (() => {
                              const lvl = loc.advisory.startup_risk.level;
                              const c = lvl === "Low" ? { bg: "rgba(21,128,61,0.10)", fg: "#15803d" }
                                       : lvl === "Medium" ? { bg: "rgba(245,158,11,0.12)", fg: "#b45309" }
                                       : { bg: "rgba(185,28,28,0.10)", fg: "#b91c1c" };
                              return (
                                <Chip
                                  size="small"
                                  label={`Startup risk: ${lvl}`}
                                  sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: c.bg, color: c.fg }}
                                />
                              );
                            })()}
                            {loc.advisory?.confidence && (() => {
                              const lvl = loc.advisory.confidence.level;
                              const c = lvl === "High" ? { bg: "rgba(13,148,136,0.10)", fg: "#0d9488" }
                                       : lvl === "Medium" ? { bg: "rgba(245,158,11,0.10)", fg: "#b45309" }
                                       : { bg: "rgba(0,0,0,0.06)", fg: "text.secondary" };
                              return (
                                <Chip
                                  size="small"
                                  label={`Confidence: ${lvl}`}
                                  title={loc.advisory.confidence.reason}
                                  sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: c.bg, color: c.fg }}
                                />
                              );
                            })()}
                          </Stack>
                        )}
                        {loc.advisory?.startup_risk?.message && (
                          <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5, lineHeight: 1.5 }}>
                            {loc.advisory.startup_risk.message}
                          </Typography>
                        )}

                        {/* === Strategy + break-even + recommended action === */}
                        {loc.advisory?.strategy && (
                          <Box sx={{ mt: 1.25 }}>
                            <Typography component="span" variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>Business strategy:</Typography>{" "}
                            <Typography component="span" variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                              {loc.advisory.strategy}
                            </Typography>
                          </Box>
                        )}
                        {loc.advisory?.break_even?.message && (
                          <Box sx={{ mt: 0.75 }}>
                            <Typography component="span" variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>Break-even:</Typography>{" "}
                            <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                              {loc.advisory.break_even.message}
                            </Typography>
                          </Box>
                        )}
                        {loc.advisory?.recommended_action && (
                          <Box sx={{ mt: 1, p: 1, borderLeft: "3px solid", borderColor: "primary.main", bgcolor: "rgba(37,99,235,0.04)", borderRadius: "0 6px 6px 0" }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 10 }}>
                              Recommended action
                            </Typography>
                            <Typography variant="caption" sx={{ display: "block", color: "text.primary", mt: 0.25, lineHeight: 1.55 }}>
                              {loc.advisory.recommended_action}
                            </Typography>
                          </Box>
                        )}

                        {/* === Similar areas === */}
                        {loc.similar_to && loc.similar_to.length > 0 && (
                          <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 1.25 }}>
                            <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>Similar to:</Box>{" "}
                            {loc.similar_to.map((s) => `${s.area_name} (${s.similarity_pct}%)`).join(" , ")}
                          </Typography>
                        )}

                        {/* === Action buttons === */}
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
              because {selectedLocation.reasoning} Overall match is{" "}
              <Box component="span" sx={{ color: selBand.color, fontWeight: 600 }}>
                {(selectedLocation.scores?.overall_match ?? selectedLocation.score)}/100
              </Box>
              , a {selBand.label.toLowerCase()}, based on how well your budget, the local walk in customer flow, and existing competition balance out for this business.
            </Typography>

            {/* Factor contribution bars */}
            <Box sx={{ mt: 4 }}>
              <Typography sx={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "text.secondary", fontWeight: 500, mb: 2 }}>
                Why it may suit you , Things to watch
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
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 1 }}>
          <Box>
            <Typography className="font-display" sx={{ fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
              Side-by-side comparison
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Compare budget, customers, competition, and risk across selected areas.
            </Typography>
          </Box>
          <IconButton onClick={() => setCompareOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {(() => {
            const selected = recommendations.filter((r) => compareSet.has(r.id));

            // Helpers used inside row renderers below.
            const riskColor = (lvl) =>
              lvl === "Low" ? { bg: "rgba(21,128,61,0.10)", fg: "#15803d" }
              : lvl === "Medium" ? { bg: "rgba(245,158,11,0.12)", fg: "#b45309" }
              : lvl === "High" ? { bg: "rgba(185,28,28,0.10)", fg: "#b91c1c" }
              : { bg: "rgba(0,0,0,0.05)", fg: "text.secondary" };
            const budgetStatusColor = (status) =>
              status === "Within budget" ? { bg: "rgba(21,128,61,0.10)", fg: "#15803d" }
              : status === "Slightly above budget" ? { bg: "rgba(245,158,11,0.12)", fg: "#b45309" }
              : status === "Stretch option" ? { bg: "rgba(234,88,12,0.12)", fg: "#c2410c" }
              : status === "Unaffordable" ? { bg: "rgba(185,28,28,0.10)", fg: "#b91c1c" }
              : { bg: "rgba(0,0,0,0.05)", fg: "text.secondary" };

            // Section-headed rows. `section` rows render as a colored separator
            // spanning all columns; `data` rows render normally.
            const rows = [
              { kind: "section", label: "Match" },
              { kind: "data", k: "Overall match", v: (l) => <Chip size="small" label={`${l.scores?.overall_match ?? l.score}/100 , ${getScoreBand(l.scores?.overall_match ?? l.score).label}`} sx={{ bgcolor: getScoreBand(l.scores?.overall_match ?? l.score).bg, color: getScoreBand(l.scores?.overall_match ?? l.score).color, fontWeight: 600 }} /> },

              { kind: "section", label: "Budget" },
              { kind: "data", k: "Typical rent / month", v: (l) => `LKR ${l.typicalRentLkr.toLocaleString()}` },
              { kind: "data", k: "Typical purchase", v: (l) => `LKR ${(l.typicalPurchaseLkr / 1_000_000).toFixed(1)}M` },
              { kind: "data", k: "Budget status", v: (l) => {
                  const status = l.economics?.budget_fit?.status;
                  const c = budgetStatusColor(status);
                  return status ? <Chip size="small" label={status} sx={{ height: 18, fontSize: 10, fontWeight: 500, bgcolor: c.bg, color: c.fg }} /> : ".";
                } },

              { kind: "section", label: "Customers & competition" },
              { kind: "data", k: "Likely customers", v: (l) => l.advisory?.customer_types?.join(", ") || "." },
              { kind: "data", k: "Walk-in flow", v: (l) =>
                  l.metrics.footfall >= 70 ? "Strong walk-in flow"
                  : l.metrics.footfall >= 45 ? "Moderate walk-in flow"
                  : "Low walk-in flow" },
              { kind: "data", k: "Competition", v: (l) =>
                  l.metrics.lowCompetition >= 70 ? "Low . fewer similar businesses nearby"
                  : l.metrics.lowCompetition >= 45 ? "Moderate"
                  : "High . many similar businesses already operate here" },
              { kind: "data", k: "Best for", v: (l) => l.advisory?.best_for?.join(", ") || "." },

              { kind: "section", label: "Risk & strategy" },
              { kind: "data", k: "Startup risk", v: (l) => {
                  const lvl = l.advisory?.startup_risk?.level;
                  if (!lvl) return ".";
                  const c = riskColor(lvl);
                  return <Chip size="small" label={lvl} sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: c.bg, color: c.fg }} />;
                } },
              { kind: "data", k: "Main risk to watch", v: (l) => l.advisory?.main_risk || "." },
              { kind: "data", k: "Best strategy", v: (l) => l.advisory?.strategy || "." },
              { kind: "data", k: "Break-even guidance", v: (l) =>
                  l.advisory?.break_even?.daily_customers
                    ? `~${l.advisory.break_even.daily_customers} customers / day to cover rent`
                    : "." },
              { kind: "data", k: "Recommended next step", v: (l) => l.advisory?.recommended_action || "." },
            ];

            return (
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 220, bgcolor: "background.paper" }}>Factor</TableCell>
                    {selected.map((l) => (
                      <TableCell key={l.id} sx={{ fontWeight: 600, bgcolor: "background.paper" }}>
                        <Box>
                          #{l.rank} {l.name}
                          {l.isPreferredPin && (
                            <Typography variant="caption" sx={{ display: "block", color: "#b45309", fontStyle: "italic", fontWeight: 500, fontSize: 10 }}>
                              ★ pinned , model #{l.modelRank}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, idx) =>
                    r.kind === "section" ? (
                      <TableRow key={`section-${idx}`}>
                        <TableCell
                          colSpan={1 + selected.length}
                          sx={{
                            bgcolor: "rgba(0,0,0,0.04)",
                            fontWeight: 700,
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "text.secondary",
                            py: 0.75,
                          }}
                        >
                          {r.label}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={`${r.k}-${idx}`}>
                        <TableCell sx={{ color: "text.secondary", verticalAlign: "top" }}>
                          {r.k}
                        </TableCell>
                        {selected.map((l) => (
                          <TableCell key={l.id} sx={{ verticalAlign: "top", fontSize: "0.8125rem", lineHeight: 1.5 }}>
                            {r.v(l)}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  )}
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
                <TableCell sx={{ fontWeight: 600 }}>Model</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Budget</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customers</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Competition</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Advice</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recommendations.map((loc) => {
                const band = getScoreBand(loc.score);
                // Compact labels derived from the same metrics the structured reasoning uses.
                const m = loc.metrics;
                const budgetLabel = loc.economics?.budget_fit?.status || (m.budgetFit >= 75 ? "Within budget" : m.budgetFit >= 50 ? "Within with room" : "Below usual rent");
                const customersLabel = m.footfall >= 70 ? "Strong walk-in flow" : m.footfall >= 45 ? "Moderate walk-in" : "Low walk-in flow";
                const competitionLabel = m.lowCompetition >= 70 ? "Low" : m.lowCompetition >= 45 ? "Moderate" : "High";
                const adviceShort = (loc.reasoningStructured?.advice || "").replace(/^Advice:\s*/, "") || ".";
                return (
                  <TableRow key={loc.id}>
                    <TableCell sx={{ fontWeight: 600 }}>#{loc.rank}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {loc.name}
                      {loc.isPreferredPin && (
                        <Typography variant="caption" sx={{ display: "block", color: "#b45309", fontStyle: "italic", fontSize: 10 }}>
                          ★ pinned , model #{loc.modelRank}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={`${loc.score}`} sx={{ bgcolor: band.bg, color: band.color, fontWeight: 500 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>{budgetLabel}</TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>{customersLabel}</TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>{competitionLabel}</TableCell>
                    <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem", maxWidth: 280 }}>{adviceShort}</TableCell>
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
