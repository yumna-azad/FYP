import { useState, useEffect } from "react";
import {
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

const proximityOptions = [
  { value: "high", label: "High (< 500m)" },
  { value: "medium", label: "Medium (500m - 1km)" },
  { value: "low", label: "Low (1km+)" }
];

const trafficOptions = [
  { value: "very-high", label: "Very High (10,000+ daily)" },
  { value: "high", label: "High (5,000-10,000 daily)" },
  { value: "moderate", label: "Moderate (1,000-5,000 daily)" },
  { value: "low", label: "Low (< 1,000 daily)" }
];

const competitionOptions = [
  { value: "minimal", label: "Minimal (0-2 competitors)" },
  { value: "low", label: "Low (3-5 competitors)" },
  { value: "moderate", label: "Moderate (6-10 competitors)" },
  { value: "any", label: "Any level" }
];

const internetCoverageOptions = [
  { value: "high", label: "High (Fiber/High-Speed)" },
  { value: "medium", label: "Medium (Standard Broadband)" },
  { value: "low", label: "Low (Basic Internet)" },
  { value: "any", label: "Any coverage" }
];

// Fallback locations (renamed from sampleLocations)
const defaultLocationsForMap = [
  {
    id: "1",
    name: "City Center",
    lat: 6.9497,
    lng: 80.7891,
    description: "Commercial District · Score 92"
  },
  {
    id: "2",
    name: "Gregory Lake Front",
    lat: 6.9571,
    lng: 80.7827,
    description: "Mixed Use · Score 87"
  },
  {
    id: "3",
    name: "Hakgala Road",
    lat: 6.9405,
    lng: 80.808,
    description: "Tourist Zone · Score 85"
  },
  {
    id: "4",
    name: "Pedro Tea Estate Area",
    lat: 6.935,
    lng: 80.82,
    description: "Shopping / Tourist · Score 78"
  }
];

const DASHBOARD_SUBMITTED_KEY = "smartloc_dashboard_submitted";

export default function DashboardPage() {
  const navigate = useNavigate();
  const useMock = useMockData();
  const [businessType, setBusinessType] = useState("");
  const [proximity, setProximity] = useState("");
  const [traffic, setTraffic] = useState("");
  const [competition, setCompetition] = useState("");
  const [internetCoverage, setInternetCoverage] = useState("");
  const [landIntent, setLandIntent] = useState("rent"); // "rent" | "purchase"
  const [amount, setAmount] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [businessTypeOptions, setBusinessTypeOptions] = useState(defaultBusinessTypeOptions);

  // Load business types from API when connected – admin "Add Business Type" drives user dropdown
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
            description: `${loc.type || "Location"} · Score ${loc.score || 0}`
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
        setProximity(data.proximity || "");
        setTraffic(data.traffic || "");
        setCompetition(data.competition || "");
        setInternetCoverage(data.internetCoverage || "");
        setLandIntent(data.landIntent || "rent");
        setAmount(data.amount || "");
      } catch (e) {
        console.error("Failed to parse submitted data:", e);
      }
    }
  }, []);

  const allFilled =
    !!businessType && !!proximity && !!traffic && !!competition && !!internetCoverage && !!String(amount).trim() && Number(amount) > 0;

  const handleGenerateRecommendations = async () => {
    if (!allFilled) return;
    setIsAnalyzing(true);
    const payload = { businessType, proximity, traffic, competition, internetCoverage, landIntent, amount };
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
                        <Typography variant="caption" color="text.secondary">Tourist Area Proximity</Typography>
                        <Chip label={proximityOptions.find(p => p.value === submittedData.proximity)?.label || submittedData.proximity} size="small" sx={{ mt: 0.5 }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Foot Traffic</Typography>
                        <Chip label={trafficOptions.find(t => t.value === submittedData.traffic)?.label || submittedData.traffic} size="small" sx={{ mt: 0.5 }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Competition Level</Typography>
                        <Chip label={competitionOptions.find(c => c.value === submittedData.competition)?.label || submittedData.competition} size="small" sx={{ mt: 0.5 }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {submittedData.landIntent === "rent" ? "Monthly Rent Budget" : "Purchase Budget"}
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
                          LKR {Number(submittedData.amount).toLocaleString()}
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
                  <FormControl fullWidth size="small">
                    <InputLabel>Business Type</InputLabel>
                    <Select
                      value={businessType}
                      label="Business Type"
                      onChange={(e) => setBusinessType(e.target.value)}
                    >
                      {businessTypeOptions.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Tourist Area Proximity</InputLabel>
                    <Select
                      value={proximity}
                      label="Tourist Area Proximity"
                      onChange={(e) => setProximity(e.target.value)}
                    >
                      {proximityOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Foot Traffic Preference</InputLabel>
                    <Select
                      value={traffic}
                      label="Foot Traffic Preference"
                      onChange={(e) => setTraffic(e.target.value)}
                    >
                      {trafficOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Competition Level</InputLabel>
                    <Select
                      value={competition}
                      label="Competition Level"
                      onChange={(e) => setCompetition(e.target.value)}
                    >
                      {competitionOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Internet Coverage</InputLabel>
                    <Select
                      value={internetCoverage}
                      label="Internet Coverage"
                      onChange={(e) => setInternetCoverage(e.target.value)}
                    >
                      {internetCoverageOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Land
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
                    type="number"
                    label={landIntent === "rent" ? "Rent amount (per month)" : "Purchase amount"}
                    placeholder={landIntent === "rent" ? "e.g. 50000" : "e.g. 5000000"}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">LKR</InputAdornment>
                      ),
                      inputProps: { min: 0, step: landIntent === "rent" ? 1000 : 100000 },
                    }}
                  />

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    endIcon={!isAnalyzing && <ArrowForwardIcon />}
                    onClick={handleGenerateRecommendations}
                    disabled={isAnalyzing || !allFilled}
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
