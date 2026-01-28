import React from "react";
import { Box, Paper, Typography } from "@mui/material";

export default function FavoritesPage() {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Saved locations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          When you shortlist locations from the map, they will appear here for comparison later.
        </Typography>
      </Box>

      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          border: "1px dashed rgba(148,163,184,0.7)",
          bgcolor: "rgba(249,250,251,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
          textAlign: "center",
          flex: 1
        }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            No saved locations yet
          </Typography>
          <Typography variant="body2">
            Use the Explore page to mark potential business spots as favorites, then return here to
            compare them side by side.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

