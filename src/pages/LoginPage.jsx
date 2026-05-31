import React, { useState } from "react";
import { Box, Button, TextField, Typography, Stack, CircularProgress } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const HERO_IMAGE = "/images/hero/real-gregory-lake.jpg";

const ease = [0.22, 1, 0.36, 1];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const from = location.state?.from || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const ink = isDark ? "#f5f3ee" : "#0a0a0a";
  const inkSoft = isDark ? "rgba(245,243,238,0.6)" : "rgba(10,10,10,0.58)";
  const hair = isDark ? "rgba(245,243,238,0.15)" : "rgba(10,10,10,0.15)";
  const bg = isDark ? "#0b0f0e" : "#faf8f3";

  const fieldSx = {
    "& .MuiInputBase-root": {
      borderRadius: 0,
      bgcolor: "transparent",
      color: ink,
      fontSize: "1rem",
      px: 0,
      "&::before": { borderBottomColor: hair },
      "&:hover:not(.Mui-disabled)::before": { borderBottomColor: ink + " !important" },
      "&.Mui-focused::after": { borderBottomColor: ink, borderBottomWidth: 1 },
    },
    "& .MuiInputLabel-root": {
      color: inkSoft,
      fontSize: "0.75rem",
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      fontWeight: 500,
      transform: "translate(0, 20px) scale(1)",
      "&.Mui-focused, &.MuiFormLabel-filled": {
        color: inkSoft,
        transform: "translate(0, -4px) scale(1)",
      },
    },
    "& .MuiInput-input": {
      py: 1.5,
      color: `${ink} !important`,
      WebkitTextFillColor: `${ink} !important`,
      caretColor: ink,
      "&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active": {
        WebkitBoxShadow: `0 0 0 1000px ${bg} inset !important`,
        WebkitTextFillColor: `${ink} !important`,
        caretColor: ink,
        transition: "background-color 9999s ease-in-out 0s",
      },
    },
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" },
        bgcolor: bg,
        color: ink,
        zIndex: 1200,
      }}
    >
      {/* LEFT — imagery */}
      <Box
        sx={{
          position: "relative",
          display: { xs: "none", md: "block" },
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${HERO_IMAGE})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "saturate(0.9) contrast(1.02)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(8,12,14,0.35) 0%, rgba(8,12,14,0.6) 100%)",
          }}
        />
        <Box className="hero-grain" />

        <Stack
          sx={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            p: { md: 5, lg: 7 },
            color: "#f5f3ee",
          }}
          justifyContent="space-between"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <Typography
              onClick={() => navigate("/")}
              className="font-display"
              sx={{
                cursor: "pointer",
                fontSize: "1.625rem",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              Smart<Box component="em" sx={{ fontStyle: "italic", opacity: 0.6 }}>Loc</Box>
            </Typography>
          </motion.div>

          <Stack spacing={3} sx={{ maxWidth: 520 }}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease, delay: 0.15 }}
            >
              <Typography variant="overline" sx={{ letterSpacing: "0.3em", fontSize: 10, opacity: 0.85 }}>
                Nuwara Eliya — Hill Country
              </Typography>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease, delay: 0.25 }}
            >
              <Typography
                className="font-display"
                sx={{
                  fontSize: { md: "2.75rem", lg: "3.5rem" },
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  fontWeight: 400,
                }}
              >
                Where you place a business{" "}
                <Box component="em" sx={{ fontStyle: "italic", opacity: 0.85 }}>
                  matters
                </Box>{" "}
                more than what you build in it.
              </Typography>
            </motion.div>
          </Stack>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            <Typography sx={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.75 }}>
              Photograph · tea estates near Nuwara Eliya
            </Typography>
          </motion.div>
        </Stack>
      </Box>

      {/* RIGHT — form */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 3, sm: 6, md: 7, lg: 10 },
          py: 6,
          overflowY: "auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          <Stack spacing={5}>
            <Box>
              <Typography
                sx={{
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: inkSoft,
                  fontWeight: 500,
                  mb: 2,
                }}
              >
                Sign in
              </Typography>
              <Typography
                className="font-display"
                sx={{
                  fontSize: { xs: "2.25rem", md: "2.75rem" },
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  fontWeight: 400,
                  mb: 1.5,
                }}
              >
                Welcome back.
              </Typography>
              <Typography sx={{ fontSize: "0.9375rem", color: inkSoft, lineHeight: 1.55 }}>
                Continue to your SmartLoc workspace. No account yet?{" "}
                <Box
                  component="span"
                  onClick={() => navigate("/register")}
                  sx={{
                    cursor: "pointer",
                    color: ink,
                    borderBottom: `1px solid ${hair}`,
                    "&:hover": { borderBottomColor: ink },
                  }}
                >
                  Register
                </Box>
                .
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={4}>
                <TextField
                  fullWidth
                  variant="standard"
                  label="Email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  sx={fieldSx}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  variant="standard"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  sx={fieldSx}
                  InputLabelProps={{ shrink: true }}
                />

                {error && (
                  <Typography sx={{ fontSize: "0.875rem", color: isDark ? "#fca5a5" : "#b91c1c" }}>{error}</Typography>
                )}

                <Stack direction="row" spacing={3} alignItems="center" sx={{ pt: 2 }}>
                  <Button
                    type="submit"
                    disableElevation
                    disabled={loading}
                    endIcon={
                      loading ? (
                        <CircularProgress size={14} sx={{ color: "inherit" }} />
                      ) : (
                        <ArrowForwardIcon sx={{ fontSize: 16 }} />
                      )
                    }
                    sx={{
                      bgcolor: ink,
                      color: bg,
                      borderRadius: 999,
                      px: 3.5,
                      py: 1.5,
                      fontSize: "0.9375rem",
                      fontWeight: 500,
                      textTransform: "none",
                      "&:hover": { bgcolor: ink, opacity: 0.9 },
                      "&.Mui-disabled": { bgcolor: ink, color: bg, opacity: 0.5 },
                    }}
                  >
                    {loading ? "Signing in" : "Sign in"}
                  </Button>
                  <Box
                    component="span"
                    sx={{
                      fontSize: "0.8125rem",
                      color: inkSoft,
                      cursor: "pointer",
                      "&:hover": { color: ink },
                    }}
                  >
                    Forgot password?
                  </Box>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </motion.div>
      </Box>
    </Box>
  );
}
