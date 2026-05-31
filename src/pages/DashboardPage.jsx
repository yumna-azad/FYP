import { useState, useEffect } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
  Chip,
  Stack
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MapView from "../components/MapView.jsx";
import { adminAPI, useMockData, submitLocationFinder } from "../lib/api.js";

// Fallback when no API or API returns empty (admin "Add Business Type" feeds the list when API is connected)
const defaultBusinessTypeOptions = [
  { value: "cafe", label: "Cafe" },
  { value: "retail_shop", label: "Retail Shop" },
  { value: "wellness_center", label: "Wellness Center" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
];

const nuwaraEliyaAreas = [
  "Town Centre / Main Street",
  "Gregory Lake Front",
  "Hakgala Road",
  "Pedro / Hill Club Area",
  "Nanu Oya",
  "Ambewela",
  "Kandapola",
  "Glencairn",
  "Hawa Eliya",
  "Lover's Leap",
  "Seetha Eliya",
  "Tea estates belt",
];

// Budget ranges derived from smartloc_raw_data_VERIFIED.xlsx → Property_Listings sheet
// (n=713, covers LankaPropertyWeb, ikman.lk, House.lk 2025-2026 listings for Nuwara Eliya)
// Rent = monthly_price_lkr grouped by property_type; Purchase = total_price_lkr.
// Ranges rounded to the nearest realistic figure, slightly below observed min and above observed max.
const BUDGET_RANGES_BY_TYPE = {
  cafe:             { rent: { min: 45_000,  max: 400_000 },   buy: { min: 60_000_000,  max: 275_000_000 } },
  restaurant:       { rent: { min: 45_000,  max: 400_000 },   buy: { min: 60_000_000,  max: 275_000_000 } },
  retail_shop:      { rent: { min: 90_000,  max: 260_000 },   buy: { min: 34_000_000,  max: 250_000_000 } },
  wellness_center:  { rent: { min: 30_000,  max: 270_000 },   buy: { min: 22_000_000,  max: 300_000_000 } },
  hotel:            { rent: { min: 280_000, max: 500_000 },   buy: { min: 38_000_000,  max: 265_000_000 } },
};

// Fallback when no business type selected — spans the entire commercial data range
const DEFAULT_BUDGET_RANGE = {
  rent: { min: 10_000,    max: 500_000 },
  buy:  { min: 2_000_000, max: 300_000_000 },
};

function getBudgetLimits(businessType, landIntent) {
  const range =
    BUDGET_RANGES_BY_TYPE[businessType] || DEFAULT_BUDGET_RANGE;
  const bucket = landIntent === "rent" ? range.rent : range.buy;
  return {
    min: bucket.min,
    max: bucket.max,
    label: landIntent === "rent" ? "rent / month" : "purchase",
  };
}

// Fallback locations (renamed from sampleLocations)
const defaultLocationsForMap = [
  {
    id: "1",
    name: "City Center",
    lat: 6.9497,
    lng: 80.7891,
    description: "Commercial District , Score 92"
  },
  {
    id: "2",
    name: "Gregory Lake Front",
    lat: 6.9571,
    lng: 80.7827,
    description: "Mixed Use , Score 87"
  },
  {
    id: "3",
    name: "Hakgala Road",
    lat: 6.9405,
    lng: 80.808,
    description: "Tourist Zone , Score 85"
  },
  {
    id: "4",
    name: "Pedro Tea Estate Area",
    lat: 6.935,
    lng: 80.82,
    description: "Shopping / Tourist , Score 78"
  }
];

const DASHBOARD_SUBMITTED_KEY = "smartloc_dashboard_submitted";

export default function DashboardPage() {
  const navigate = useNavigate();
  const useMock = useMockData();
  const [businessType, setBusinessType] = useState("");
  const [preferredArea, setPreferredArea] = useState("");
  const [landIntent, setLandIntent] = useState("rent"); // "rent" | "purchase"
  const [amount, setAmount] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [businessTypeOptions, setBusinessTypeOptions] = useState(defaultBusinessTypeOptions);

  // Load business types from API when connected - admin "Add Business Type" drives user dropdown
  useEffect(() => {
    if (useMock) {
      setBusinessTypeOptions(defaultBusinessTypeOptions);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await adminAPI.getBusinessTypes().catch(() => ({ data: [] }));
        const list = res?.data ?? res ?? [];
        if (cancelled) return;
        const opts = Array.isArray(list) && list.length > 0
          ? list.map((t) => ({
              value: (t.name || "").toLowerCase().replace(/\s+/g, "_"),
              label: t.name || String(t.id),
            }))
          : defaultBusinessTypeOptions;
        setBusinessTypeOptions(opts);
      } catch {
        if (!cancelled) setBusinessTypeOptions(defaultBusinessTypeOptions);
      }
    })();
    return () => { cancelled = true; };
  }, [useMock]);

  // Load locations from API
  useEffect(() => {
    const loadLocations = async () => {
      if (useMock) {
        setLocations(defaultLocationsForMap);
      } else {
        try {
          const locationsData = await adminAPI.getLocations().catch(() => ({ data: [] }));
          const locs = locationsData.data || locationsData || [];
          const mapLocations = locs.map((loc) => ({
            id: String(loc.id),
            name: loc.name,
            lat: parseFloat(loc.latitude) || 6.9497,
            lng: parseFloat(loc.longitude) || 80.7891,
            description: `${loc.type || "Location"} , Score ${loc.score || 0}`
          }));
          setLocations(mapLocations.length > 0 ? mapLocations : defaultLocationsForMap);
        } catch (err) {
          console.error("Failed to load locations:", err);
          setLocations(defaultLocationsForMap);
        }
      }
    };
    loadLocations();
  }, [useMock]);

  useEffect(() => {
    // Check if user has already submitted
    const submitted = sessionStorage.getItem(DASHBOARD_SUBMITTED_KEY);
    if (submitted) {
      try {
        const data = JSON.parse(submitted);
        setSubmittedData(data);
        setHasSubmitted(true);
        // Pre-fill form with submitted data
        setBusinessType(data.businessType || "");
        setPreferredArea(data.preferredArea || "");
        setLandIntent(data.landIntent || "rent");
        setAmount(data.amount || "");
      } catch (e) {
        console.error("Failed to parse submitted data:", e);
      }
    }
  }, []);

  // Data-driven: pulls from Property_Listings (n=713) per business type × land intent
  const budgetLimits = getBudgetLimits(businessType, landIntent);

  const amountNum = Number(amount);
  const amountTouched = String(amount).trim() !== "";
  const amountInvalid = amountTouched && (Number.isNaN(amountNum) || amountNum < budgetLimits.min || amountNum > budgetLimits.max);
  const amountErrorMsg = !amountTouched
    ? ""
    : Number.isNaN(amountNum)
      ? "Budget must be a number."
      : amountNum < budgetLimits.min
        ? `Too low — ${budgetLimits.label} in Nuwara Eliya starts around LKR ${budgetLimits.min.toLocaleString()}.`
        : amountNum > budgetLimits.max
          ? `Too high — the maximum ${budgetLimits.label} observed in Nuwara Eliya is LKR ${budgetLimits.max.toLocaleString()}.`
          : "";

  const businessTypeInvalid = showErrors && !businessType;

  const allFilled =
    !!businessType &&
    !!landIntent &&
    amountTouched &&
    !amountInvalid;

  const handleGenerateRecommendations = async () => {
    if (!allFilled) {
      setShowErrors(true);
      return;
    }
    setIsAnalyzing(true);
    const payload = { businessType, preferredArea, landIntent, amount };
    sessionStorage.setItem(DASHBOARD_SUBMITTED_KEY, JSON.stringify(payload));

    // When Laravel + MySQL are connected: save to DB so admin sees it automatically
    const useMock = useMockData();
    if (!useMock) {
      try {
        await submitLocationFinder(payload);
      } catch (err) {
        console.warn("Could not save to backend (admin will not see this submission):", err);
      }
    }

    setTimeout(() => {
      setIsAnalyzing(false);
      setHasSubmitted(true);
      setSubmittedData(payload);
      navigate("/recommendations");
    }, 2000);
  };

  const handleEditInput = () => {
    setHasSubmitted(false);
    sessionStorage.removeItem(DASHBOARD_SUBMITTED_KEY);
  };

  const isRent = landIntent === "rent";

  // Show dashboard view if user has submitted
  if (hasSubmitted && submittedData) {
    return (
      <Box sx={{ height: "100%", overflowY: "auto" }}>
        <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
          <Stack spacing={3}>
            {/* Success Header */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                background: "linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(13, 148, 136, 0.05))",
                border: "1px solid rgba(13, 148, 136, 0.2)",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <CheckCircleIcon sx={{ fontSize: 40, color: "success.main" }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={700} gutterBottom>
                    Dashboard Ready
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your preferences have been saved. View your recommendations or edit your inputs below.
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={handleEditInput} sx={{ borderRadius: 2 }}>
                  Edit Input
                </Button>
              </Stack>
            </Paper>

            <Grid container spacing={3}>
              {/* Submitted Data Summary */}
              <Grid item xs={12} md={4}>
                <Card elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Your Preferences
                    </Typography>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Business Type</Typography>
                        <Chip label={businessTypeOptions.find(b => b.value === submittedData.businessType)?.label || submittedData.businessType} size="small" sx={{ mt: 0.5 }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Land</Typography>
                        <Chip label={submittedData.landIntent === "rent" ? "Rent" : "Purchase"} size="small" sx={{ mt: 0.5 }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {submittedData.landIntent === "rent" ? "Monthly Rent Budget" : "Purchase Budget"}
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                          LKR {Number(submittedData.amount).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Preferred Area</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {submittedData.preferredArea || "Any area"}
                        </Typography>
                      </Box>
                    </Stack>
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{ mt: 3, py: 1.5, borderRadius: 2 }}
                      onClick={() => navigate("/recommendations")}
                      endIcon={<ArrowForwardIcon />}
                    >
                      View Recommendations
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Map View */}
              <Grid item xs={12} md={8}>
                <Card elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
                  <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
                    <Typography variant="h6" fontWeight={700}>
                      Recommended Locations
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Based on your preferences for Nuwara Eliya
                    </Typography>
                  </Box>
                  <CardContent sx={{ pt: 1, "&:last-child": { pb: 2, pt: 0 } }}>
                    <Box
                      sx={{
                        height: 500,
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "divider"
                      }}
                    >
                      <MapView locations={locations.length > 0 ? locations : defaultLocationsForMap} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", overflowY: "auto" }}>
      <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <Grid container spacing={3}>
          {/* Location Finder */}
          <Grid item xs={12} lg={4}>
            <Card
              elevation={0}
              sx={{
                height: "fit-content",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider"
              }}
            >
              <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
                <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AutoAwesomeIcon color="primary" sx={{ fontSize: 22 }} />
                  Location Finder
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Find the right location in Nuwara Eliya for your business type. Set your business type, preferences, and budget (LKR) to get recommendations.
                </Typography>
              </Box>
              <CardContent sx={{ pt: 1, "&:last-child": { pb: 2.5 } }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <FormControl fullWidth size="small" error={businessTypeInvalid}>
                    <InputLabel>Business Type *</InputLabel>
                    <Select
                      value={businessType}
                      label="Business Type *"
                      onChange={(e) => setBusinessType(e.target.value)}
                    >
                      {businessTypeOptions.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {businessTypeInvalid && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                        Please choose a business type.
                      </Typography>
                    )}
                  </FormControl>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Land *
                    </Typography>
                    <RadioGroup
                      row
                      value={landIntent}
                      onChange={(e) => {
                        setLandIntent(e.target.value);
                        setAmount("");
                      }}
                      sx={{ gap: 1 }}
                    >
                      <FormControlLabel value="rent" control={<Radio size="small" />} label="Rent" />
                      <FormControlLabel value="purchase" control={<Radio size="small" />} label="Purchase" />
                    </RadioGroup>
                  </Box>

                  <TextField
                    fullWidth
                    size="small"
                    type="text"
                    name="smartloc-budget"
                    autoComplete="off"
                    label={landIntent === "rent" ? "Budget · Rent / month *" : "Budget · Purchase *"}
                    placeholder={landIntent === "rent" ? "e.g. 50000" : "e.g. 5000000"}
                    value={amount}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, "");
                      setAmount(digits);
                    }}
                    error={amountInvalid || (showErrors && !amountTouched)}
                    helperText={
                      amountErrorMsg ||
                      (showErrors && !amountTouched
                        ? "Please enter a budget."
                        : `Typical ${budgetLimits.label} range in Nuwara Eliya${businessType ? " for this business" : ""}: LKR ${budgetLimits.min.toLocaleString()} – ${budgetLimits.max.toLocaleString()}`)
                    }
                    InputProps={{
                      startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
                      inputProps: {
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                        autoComplete: "off",
                        "data-1p-ignore": "true",
                        "data-lpignore": "true",
                        "data-form-type": "other",
                      },
                    }}
                  />

                  <Autocomplete
                    freeSolo
                    size="small"
                    options={nuwaraEliyaAreas}
                    value={preferredArea}
                    onChange={(_, v) => setPreferredArea(v || "")}
                    onInputChange={(_, v) => setPreferredArea(v || "")}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Preferred Area (optional)"
                        placeholder="Type to search Nuwara Eliya areas…"
                        helperText="Leave blank to consider all areas"
                      />
                    )}
                  />

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    endIcon={!isAnalyzing && <ArrowForwardIcon />}
                    onClick={handleGenerateRecommendations}
                    disabled={isAnalyzing}
                    sx={{ mt: 1, py: 1.5, borderRadius: 2, fontWeight: 600 }}
                  >
                    {isAnalyzing ? (
                      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          component="span"
                          sx={{
                            width: 18,
                            height: 18,
                            border: "2px solid currentColor",
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite"
                          }}
                        />
                        Analyzing...
                      </Box>
                    ) : (
                      "Generate Recommendations"
                    )}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Interactive Map */}
          <Grid item xs={12} lg={8}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden"
              }}
            >
              <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Interactive Map
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {isRent
                    ? "Explore rental locations in your target area (Nuwara Eliya)"
                    : "Explore properties for sale in your target area (Nuwara Eliya)"}
                </Typography>
              </Box>
              <CardContent sx={{ pt: 1, "&:last-child": { pb: 2, pt: 0 } }}>
                <Box
                  sx={{
                    height: 500,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider"
                  }}
                >
                  <MapView locations={locations.length > 0 ? locations : defaultLocationsForMap} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
