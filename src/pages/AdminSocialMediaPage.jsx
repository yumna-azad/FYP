import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  Alert,
  Paper,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import { getSocialMediaLinks } from "../lib/socialMedia.js";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function AdminSocialMediaPage() {
  const [socialMedia, setSocialMedia] = useState({
    instagram: "",
    twitter: "",
    facebook: "",
    whatsapp: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadSocialMedia();
  }, []);

  const loadSocialMedia = async () => {
    try {
      const data = await getSocialMediaLinks();
      setSocialMedia(data);
    } catch (err) {
      console.error("Failed to load social media:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("smartloc_token");
      if (!API_BASE) {
        // Mock mode: save to localStorage
        localStorage.setItem("smartloc_social_media", JSON.stringify(socialMedia));
        setMessage({ type: "success", text: "Social media links saved (mock mode)" });
      } else {
        const response = await fetch(`${API_BASE}/api/admin/social-media`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(socialMedia),
        });
        if (response.ok) {
          setMessage({ type: "success", text: "Social media links updated successfully" });
        } else {
          throw new Error("Failed to update");
        }
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save social media links" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", overflowY: "auto" }}>
      <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            Social Media Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Update social media links and contact information
          </Typography>
        </Box>

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Instagram URL"
                value={socialMedia.instagram || ""}
                onChange={(e) => setSocialMedia({ ...socialMedia, instagram: e.target.value })}
                placeholder="https://instagram.com/smartloc"
                margin="dense"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Twitter URL"
                value={socialMedia.twitter || ""}
                onChange={(e) => setSocialMedia({ ...socialMedia, twitter: e.target.value })}
                placeholder="https://twitter.com/smartloc"
                margin="dense"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Facebook URL"
                value={socialMedia.facebook || ""}
                onChange={(e) => setSocialMedia({ ...socialMedia, facebook: e.target.value })}
                placeholder="https://facebook.com/smartloc"
                margin="dense"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="WhatsApp Number"
                value={socialMedia.whatsapp || ""}
                onChange={(e) => setSocialMedia({ ...socialMedia, whatsapp: e.target.value })}
                placeholder="0705292183"
                margin="dense"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
