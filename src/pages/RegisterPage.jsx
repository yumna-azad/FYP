import React, { useState, useMemo } from "react";
import { Box, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function getInputStyles(mode) {
  return {
    mb: 2,
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      bgcolor: mode === "dark" ? "#27272a" : "background.paper",
      color: mode === "dark" ? "#fafafa" : "text.primary",
      "& fieldset": {
        borderColor: mode === "dark" ? "rgba(161, 161, 170, 0.35)" : undefined,
      },
      "&:hover fieldset": {
        borderColor: mode === "dark" ? "rgba(161, 161, 170, 0.5)" : undefined,
      },
      "&.Mui-focused": {
        bgcolor: mode === "dark" ? "#3f3f46" : undefined,
      },
      "&.Mui-focused fieldset": {
        borderColor: mode === "dark" ? "rgba(161, 161, 170, 0.6)" : undefined,
        borderWidth: "1px",
      },
      // Ensure autofill doesn't change background
      "& input:-webkit-autofill": {
        WebkitBoxShadow: mode === "dark" ? "0 0 0 1000px #27272a inset !important" : "0 0 0 1000px #ffffff inset !important",
        borderRadius: "8px",
      },
      "& input:-webkit-autofill:hover": {
        WebkitBoxShadow: mode === "dark" ? "0 0 0 1000px #27272a inset !important" : "0 0 0 1000px #ffffff inset !important",
      },
      "& input:-webkit-autofill:focus": {
        WebkitBoxShadow: mode === "dark" ? "0 0 0 1000px #3f3f46 inset !important" : "0 0 0 1000px #ffffff inset !important",
      },
    },
    "& .MuiInputLabel-root": {
      color: mode === "dark" ? "#a1a1aa" : undefined,
      "&.Mui-focused": {
        color: mode === "dark" ? "#d4d4d8" : undefined,
      },
    },
    "& input": {
      color: mode === "dark" ? "#fafafa" : undefined,
      "&::placeholder": {
        color: mode === "dark" ? "#71717a" : undefined,
        opacity: 1,
      },
      // Remove blue autofill background
      "&:-webkit-autofill": {
        WebkitBoxShadow: mode === "dark" ? "0 0 0 1000px #27272a inset" : "0 0 0 1000px #ffffff inset",
        WebkitTextFillColor: mode === "dark" ? "#fafafa" : undefined,
        caretColor: mode === "dark" ? "#fafafa" : undefined,
        transition: "background-color 5000s ease-in-out 0s",
      },
      "&:-webkit-autofill:hover": {
        WebkitBoxShadow: mode === "dark" ? "0 0 0 1000px #27272a inset" : "0 0 0 1000px #ffffff inset",
        WebkitTextFillColor: mode === "dark" ? "#fafafa" : undefined,
      },
      "&:-webkit-autofill:focus": {
        WebkitBoxShadow: mode === "dark" ? "0 0 0 1000px #3f3f46 inset" : "0 0 0 1000px #ffffff inset",
        WebkitTextFillColor: mode === "dark" ? "#fafafa" : undefined,
      },
    },
  };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const theme = useTheme();
  const mode = theme.palette.mode;
  const inputStyles = useMemo(() => getInputStyles(mode), [mode]);
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(fullName, email, password, contactNumber);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%", p: 3 }}>
      <Card
        elevation={0}
        sx={{
          maxWidth: 400,
          width: "100%",
          borderRadius: 3,
          border: mode === "dark" ? "1px solid rgba(148, 163, 184, 0.12)" : "1px solid",
          borderColor: mode === "dark" ? "rgba(148, 163, 184, 0.12)" : "divider",
          bgcolor: mode === "dark" ? "#1e293b" : "background.paper",
          boxShadow: mode === "dark"
            ? "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)"
            : "0 1px 3px rgba(0, 0, 0, 0.12)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: mode === "dark" ? "#f1f5f9" : "text.primary" }}>
            Register
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: mode === "dark" ? "#cbd5e1" : "text.secondary" }}>
            Create an account to use SmartLoc.
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required size="small" sx={inputStyles} placeholder="e.g. John Doe" />
            <TextField fullWidth label="Contact number" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required size="small" sx={inputStyles} placeholder="e.g. 0701234567" inputProps={{ inputMode: "tel" }} />
            <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required size="small" sx={inputStyles} />
            <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required size="small" sx={inputStyles} />
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ py: 1.5, borderRadius: 2, bgcolor: "#0d9488", "&:hover": { bgcolor: "#0f766e" } }}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <Button
            fullWidth
            sx={{ mt: 2, color: "#0d9488", "&:hover": { bgcolor: mode === "dark" ? "rgba(13, 148, 136, 0.1)" : "rgba(13, 148, 136, 0.06)" } }}
            onClick={() => navigate("/login")}
          >
            Already have an account? Login
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
