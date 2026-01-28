import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemIcon,
  Stack,
  Typography
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import { subscribeToPro } from "../lib/stripe.js";

const proFeatures = [
  "Unlimited location analyses",
  "Export reports (PDF, Excel)",
  "Priority support",
  "Saved locations & comparisons",
  "Nuwara Eliya area insights"
];

export default function SubscribePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";

  useEffect(() => {
    if (success || canceled) {
      // Clear query params from URL without full reload
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [success, canceled]);

  const handlePayClick = async () => {
    setLoading(true);
    try {
      await subscribeToPro();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: "100%", overflowY: "auto", py: 4 }}>
      <Container maxWidth="sm">
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Typography variant="overline" color="primary" fontWeight={600} letterSpacing={1}>
            Upgrade your plan
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            Subscribe to Pro
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Get unlimited analyses and premium features for SmartLoc in Nuwara Eliya.
          </Typography>

          {success && (
            <Alert severity="success" sx={{ width: "100%", borderRadius: 2 }}>
              Payment successful. You now have Pro access. Thank you!
            </Alert>
          )}
          {canceled && (
            <Alert severity="info" sx={{ width: "100%", borderRadius: 2 }}>
              Checkout was canceled. You can try again when you’re ready.
            </Alert>
          )}

          <Card
            elevation={0}
            sx={{
              width: "100%",
              borderRadius: 3,
              border: "2px solid",
              borderColor: "primary.main",
              overflow: "hidden"
            }}
          >
            <Box
              sx={{
                py: 2,
                px: 2,
                bgcolor: "primary.main",
                color: "white",
                textAlign: "center"
              }}
            >
              <Typography variant="h3" fontWeight={800}>
                $9.99
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                per month · cancel anytime
              </Typography>
            </Box>
            <CardContent sx={{ pt: 3, pb: 3 }}>
              <List dense disablePadding>
                {proFeatures.map((text) => (
                  <ListItem key={text} disableGutters sx={{ py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CheckCircleIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2">{text}</Typography>
                  </ListItem>
                ))}
              </List>

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CreditCardIcon />}
                onClick={handlePayClick}
                disabled={loading}
                sx={{
                  mt: 3,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" }
                }}
              >
                {loading ? "Redirecting to Stripe…" : "Pay & Subscribe to Pro"}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                Secure payment. You can switch back to Free tier anytime.
              </Typography>
            </CardContent>
          </Card>

          <Button
            variant="text"
            onClick={() => navigate("/profile")}
            sx={{
              color: "text.secondary",
              "&:hover": { bgcolor: "rgba(13, 148, 136, 0.06)", color: "primary.main" }
            }}
          >
            Back to Profile
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
