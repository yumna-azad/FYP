import React from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Slider,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  Chip
} from "@mui/material";
import MapView from "../components/MapView.jsx";

// Demo locations around Nuwara Eliya (for the list)
const dummyLocations = [
  {
    id: 1,
    name: "Downtown High Street",
    area: "City Center",
    score: 88,
    tags: ["High traffic", "Near metro"],
    rent: "$$$"
  },
  {
    id: 2,
    name: "Riverside Mall",
    area: "Waterfront",
    score: 79,
    tags: ["Family visitors", "Parking"],
    rent: "$$"
  },
  {
    id: 3,
    name: "Tech Park Avenue",
    area: "Business District",
    score: 91,
    tags: ["Office crowd", "Weekday peak"],
    rent: "$$$$"
  }
];

// Demo coordinates to show on the map (Nuwara Eliya area)
const mapLocations = [
  {
    id: "loc1",
    name: "City Center",
    lat: 6.9497,
    lng: 80.7891,
    description: "Central commercial area of Nuwara Eliya."
  },
  {
    id: "loc2",
    name: "Gregory Lake Front",
    lat: 6.9571,
    lng: 80.7827,
    description: "Tourist-heavy lakeside zone, good for cafés and rentals."
  },
  {
    id: "loc3",
    name: "Hakgala Road",
    lat: 6.9405,
    lng: 80.808,
    description: "Mixed residential / tourist traffic towards Hakgala Gardens."
  }
];

export default function ExplorePage() {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Explore locations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Adjust filters to discover the most suitable business locations on the map.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Filters
            </Typography>
            <TextField select label="Business type" fullWidth size="small" defaultValue="cafe">
              <MenuItem value="cafe">Café</MenuItem>
              <MenuItem value="retail">Retail</MenuItem>
              <MenuItem value="clinic">Clinic</MenuItem>
              <MenuItem value="office">Office</MenuItem>
            </TextField>
            <TextField
              select
              label="Preferred walk-in customers"
              fullWidth
              size="small"
              defaultValue="medium"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Max distance from city center (km)
              </Typography>
              <Slider defaultValue={8} min={1} max={20} step={1} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Budget level
              </Typography>
              <Slider defaultValue={3} min={1} max={5} step={1} />
            </Box>
            <Stack direction="row" spacing={1}>
              <Button fullWidth variant="contained">
                Apply
              </Button>
              <Button fullWidth variant="outlined">
                Reset
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2.5,
              height: "100%",
              display: "grid",
              gridTemplateRows: "minmax(200px, 1.2fr) minmax(160px, 0.9fr)",
              gap: 2
            }}
          >
            <Box
              sx={{
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,0.4)",
                overflow: "hidden"
              }}
            >
              <MapView locations={mapLocations} />
            </Box>

            <Box
              sx={{
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,0.3)",
                p: 1,
                overflow: "auto"
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ px: 1, py: 0.5 }}
              >
                Ranked locations (demo data)
              </Typography>
              <List dense>
                {dummyLocations.map((loc) => (
                  <ListItem
                    key={loc.id}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      "&:hover": { bgcolor: "rgba(13, 148, 136, 0.06)" },
                      cursor: "pointer"
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {loc.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {loc.area} · Rent: {loc.rent}
                            </Typography>
                          </Box>
                          <Chip
                            label={`Score ${loc.score}`}
                            color={loc.score > 85 ? "primary" : "default"}
                            size="small"
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} mt={0.5}>
                          {loc.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

