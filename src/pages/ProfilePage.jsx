import React, { useState, useRef } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import EditIcon from "@mui/icons-material/Edit";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profilePic, updateProfile, isAuthenticated, isAdmin, logout, changePassword } = useAuth();
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const displayName = user?.name || user?.email || "User";
  const initial = (displayName || "U").trim().charAt(0).toUpperCase();

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = () => updateProfile({ profilePic: r.result });
      r.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const startEdit = () => {
    setEditName(displayName);
    setEditing(true);
  };

  const saveEdit = () => {
    if (editName.trim()) updateProfile({ name: editName.trim() });
    setEditing(false);
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  const handleManagePassword = () => {
    setPasswordDialogOpen(true);
    setPasswordError("");
    setPasswordSuccess(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleClosePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordError("");
    setPasswordSuccess(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setTimeout(() => {
        handleClosePasswordDialog();
      }, 2000);
    } catch (error) {
      setPasswordError(error.message || "Failed to change password. Please check your current password.");
    } finally {
      setPasswordLoading(false);
    }
  };
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 1,
          background:
            "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(37,99,235,0.08))",
          border: "1px solid rgba(148,163,184,0.3)"
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="overline" color="primary" sx={{ letterSpacing: 1 }}>
              Account overview
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              Profile & subscription
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage your SmartLoc account, usage and saved location insights for Nuwara Eliya.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary">
                Remaining free analyses
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                2 / 3
              </Typography>
            </Box>
            <Button
              variant="contained"
              sx={{ borderRadius: 999 }}
              size="small"
              onClick={() => navigate("/subscribe")}
            >
              Upgrade to Premium
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              boxShadow: "0 18px 45px rgba(15,23,42,0.08)"
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ position: "relative" }}>
                <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }} src={profilePic || undefined}>
                  {!profilePic ? initial : null}
                </Avatar>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
                {isAuthenticated && (
                  <Button
                    size="small"
                    startIcon={<PhotoCameraIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ mt: 1, width: "100%" }}
                  >
                    {profilePic ? "Change photo" : "Add profile photo"}
                  </Button>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                {editing ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      label="Name"
                      sx={{ flex: 1 }}
                    />
                    <Button variant="contained" size="small" onClick={saveEdit}>
                      Save
                    </Button>
                    <Button size="small" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </Stack>
                ) : (
                  <>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {displayName}
                    </Typography>
                    {isAuthenticated && (
                      <Button size="small" startIcon={<EditIcon />} onClick={startEdit} sx={{ mt: 0.5 }}>
                        Edit name
                      </Button>
                    )}
                  </>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {user?.email || "—"}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip size="small" label={user?.role || "Location planner"} variant="outlined" />
                  <Chip size="small" label="Nuwara Eliya" color="primary" variant="outlined" />
                </Stack>
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Subscription plan
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="Free tier" color="default" size="small" />
                <Typography variant="caption" color="text.secondary">
                  3 free analyses included
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Analyses used: <strong>1 / 3</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Next reset: 01 Jul 2026
              </Typography>
            </Box>

            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "primary.main",
                bgcolor: "rgba(13, 148, 136, 0.04)"
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                Pro — $9.99 / month
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Unlimited analyses, exports, priority support.
              </Typography>
              <Button
                variant="contained"
                size="small"
                fullWidth
                sx={{ mt: 1.5, borderRadius: 2, "&:hover": { bgcolor: "primary.dark" } }}
                onClick={() => navigate("/subscribe")}
              >
                Subscribe to Pro
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Account actions
              </Typography>
              <Stack spacing={1}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={startEdit}
                  sx={{ "&:hover": { bgcolor: "rgba(13, 148, 136, 0.06)" } }}
                >
                  Edit profile
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={handleManagePassword}
                  sx={{ "&:hover": { bgcolor: "rgba(13, 148, 136, 0.06)" } }}
                >
                  Manage password
                </Button>
                {isAdmin && (
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<AdminPanelSettingsIcon />}
                    onClick={() => navigate("/admin")}
                    sx={{ 
                      "&:hover": { bgcolor: "rgba(13, 148, 136, 0.06)" },
                      borderColor: "primary.main",
                      color: "primary.main"
                    }}
                  >
                    Admin dashboard
                  </Button>
                )}
                <Button 
                  size="small" 
                  color="error" 
                  onClick={handleSignOut}
                  sx={{ "&:hover": { bgcolor: "rgba(211, 47, 47, 0.08)" } }}
                >
                  Sign out
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={2} sx={{ height: "100%" }}>
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  boxShadow: "0 18px 45px rgba(15,23,42,0.06)"
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Saved locations
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shortlisted spots you want to compare later.
                    </Typography>
                  </Box>
                  <Chip label="2 saved" size="small" color="primary" variant="outlined" />
                </Stack>

                <List dense sx={{ maxHeight: 180, overflow: "auto" }}>
                  <ListItem
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      border: "1px solid rgba(148,163,184,0.4)",
                      "&:hover": { bgcolor: "rgba(13, 148, 136, 0.06)" },
                      cursor: "default"
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            Downtown Plaza
                          </Typography>
                          <Chip label="Score 92" color="primary" size="small" />
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Central Nuwara Eliya · High foot traffic · Tourist zone
                        </Typography>
                      }
                    />
                  </ListItem>
                  <ListItem
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      border: "1px solid rgba(148,163,184,0.2)",
                      "&:hover": { bgcolor: "rgba(13, 148, 136, 0.06)" },
                      cursor: "default"
                    }}
                  >
                    <ListItemText
                      primary="Gregory Lake Front – Café strip"
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Lakeside promenade · Evening peak traffic
                        </Typography>
                      }
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  boxShadow: "0 18px 45px rgba(15,23,42,0.04)"
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Recent analyses
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last runs of your SmartLoc recommendation engine.
                    </Typography>
                  </Box>
                  <Chip label="Last 7 days" size="small" variant="outlined" />
                </Stack>

                <List dense sx={{ maxHeight: 180, overflow: "auto" }}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label="Café" size="small" />
                          <Typography variant="body2">High foot traffic, low competition</Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Run 2 days ago · Budget: Medium · Internet: High-speed fiber
                        </Typography>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label="Hotel" size="small" />
                          <Typography variant="body2">
                            Tourist-focused, near Gregory Lake
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Run 1 week ago · Budget: High · Footfall: High
                        </Typography>
                      }
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {passwordSuccess && (
              <Alert severity="success">Password changed successfully!</Alert>
            )}
            {passwordError && (
              <Alert severity="error">{passwordError}</Alert>
            )}
            <TextField
              fullWidth
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              size="small"
            />
            <TextField
              fullWidth
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              size="small"
              helperText="Must be at least 6 characters long"
            />
            <TextField
              fullWidth
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClosePasswordDialog} disabled={passwordLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={passwordLoading || passwordSuccess}
            sx={{ bgcolor: "#0d9488", "&:hover": { bgcolor: "#0f766e" } }}
          >
            {passwordLoading ? "Changing..." : "Change Password"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

