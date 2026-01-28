import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import BoltIcon from "@mui/icons-material/Bolt";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import EventIcon from "@mui/icons-material/Event";
import InstagramIcon from "@mui/icons-material/Instagram";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { CONTACT_PHONE, CONTACT_EMAIL, GOOGLE_CALENDAR_MEETING_URL, getPhoneLink, getEmailLink, getContactPhone } from "../lib/contact.js";
import { getSocialMediaLinks, getWhatsAppLink } from "../lib/socialMedia.js";


export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { mode } = useTheme();
  const userName = user?.name || user?.email;
  const [socialMedia, setSocialMedia] = useState({
    instagram: "https://instagram.com/smartloc",
    twitter: "https://twitter.com/smartloc",
    facebook: "https://facebook.com/smartloc",
    whatsapp: "0705292183",
    phone: CONTACT_PHONE,
  });
  const [contactPhone, setContactPhone] = useState(CONTACT_PHONE);

  useEffect(() => {
    getSocialMediaLinks().then((links) => {
      setSocialMedia(links);
      if (links.phone) {
        setContactPhone(links.phone);
      }
    }).catch((err) => {
      console.warn("Failed to load social media links:", err);
      // Keep default values
    });
    
    // Also fetch phone separately for contact section
    getContactPhone().then(setContactPhone).catch(() => {
      // Keep default
    });
  }, []);

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden"
      }}
    >
      {/* Hero */}
      <Box
        sx={{
          position: "relative",
          py: { xs: 6, md: 10 },
          px: 2,
          minHeight: { xs: "70vh", md: "75vh" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: mode === "dark" 
            ? `
                linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.98) 100%),
                radial-gradient(ellipse 80% 50% at 70% 80%, rgba(13, 148, 136, 0.15), transparent),
                radial-gradient(ellipse 60% 40% at 90% 20%, rgba(13, 148, 136, 0.1), transparent)
              `
            : `
                linear-gradient(135deg, rgba(224, 242, 254, 0.6) 0%, rgba(240, 253, 250, 0.4) 50%, rgba(255,255,255,0.9) 100%),
                radial-gradient(ellipse 80% 50% at 70% 80%, rgba(6, 182, 212, 0.08), transparent),
                radial-gradient(ellipse 60% 40% at 90% 20%, rgba(13, 148, 136, 0.06), transparent)
              `,
          borderRadius: 3,
          border: mode === "dark" ? "1px solid rgba(148, 163, 184, 0.1)" : "none",
        }}
      >
        <Container maxWidth="md">
          <Stack alignItems="center" textAlign="center" spacing={3}>
            {isAuthenticated && userName && (
              <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ animation: "fadeInUp 0.7s ease-out both" }}>
                Hi, {userName}
              </Typography>
            )}
            <Chip
              icon={<BoltIcon sx={{ fontSize: 18, color: "primary.main" }} />}
              label="For Businesses · Nuwara Eliya"
              sx={{
                bgcolor: "rgba(13, 148, 136, 0.1)",
                color: "text.primary",
                fontWeight: 600,
                border: "1px solid",
                borderColor: "primary.main",
                "& .MuiChip-icon": { ml: 0.5 }
              }}
              className="home-animate-in"
            />
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                fontSize: { xs: "1.75rem", sm: "2.25rem", md: "2.75rem" },
                lineHeight: 1.2,
                color: "text.primary",
                animation: "fadeInUp 0.7s ease-out both",
                animationDelay: "0.1s"
              }}
            >
              Find the{" "}
              <Box
                component="span"
                sx={{
                  background: (t) =>
                    `linear-gradient(90deg, ${t.palette.primary.main}, ${t.palette.primary.light})`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  fontWeight: 800
                }}
              >
                Right Location in Nuwara Eliya
              </Box>{" "}
              for Your Business Type
            </Typography>
            <Typography
              variant="body1"
              maxWidth="560px"
              sx={{
                fontSize: { xs: "0.95rem", md: "1rem" },
                color: mode === "dark" ? "#e2e8f0" : "text.secondary",
                animation: "fadeInUp 0.7s ease-out both",
                animationDelay: "0.2s"
              }}
            >
              This site is for businesses to find the correct location in Nuwara Eliya according to their business type. Choose café, hotel, restaurant, retail, wellness, or more—then get data-driven recommendations for the best spot.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{
                animation: "fadeInUp 0.7s ease-out both",
                animationDelay: "0.3s"
              }}
            >
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate("/dashboard")}
                sx={{
                  background: (t) =>
                    `linear-gradient(90deg, ${t.palette.primary.main}, ${t.palette.primary.light})`,
                  color: "#fff",
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  fontWeight: 700,
                  boxShadow: (t) => `0 4px 14px ${t.palette.primary.main}66`,
                  "&:hover": {
                    background: (t) =>
                      `linear-gradient(90deg, ${t.palette.primary.dark}, ${t.palette.primary.main})`,
                    boxShadow: (t) => `0 6px 20px ${t.palette.primary.main}77`
                  }
                }}
              >
                Free tier
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate("/subscribe")}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  borderColor: mode === "dark" ? "primary.light" : "secondary.main",
                  color: mode === "dark" ? "primary.light" : "secondary.dark",
                  fontWeight: 600,
                  borderWidth: 2,
                  "&:hover": {
                    borderColor: "primary.main",
                    color: "primary.main",
                    backgroundColor: mode === "dark" ? "rgba(13, 148, 136, 0.12)" : "rgba(13, 148, 136, 0.06)",
                    borderWidth: 2,
                  }
                }}
              >
                Upgrade to Pro
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Features */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={1} textAlign="center" alignItems="center" mb={4}>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ color: "text.primary", fontSize: { xs: "1.5rem", md: "1.75rem" } }}
          >
            Everything You Need to Make Smart Decisions
          </Typography>
          <Typography variant="body1" maxWidth="600px" sx={{ color: mode === "dark" ? "#e2e8f0" : "text.secondary" }}>
            Our platform combines multiple data sources to give you comprehensive
            insights about any location in Nuwara Eliya.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {[
            {
              title: "Business Analysis",
              desc: "Analyze foot traffic, demographics, and market potential with AI-driven reports.",
              icon: <AssessmentOutlinedIcon sx={{ fontSize: 32, color: "primary.main" }} />,
              bg: "rgba(13, 148, 136, 0.12)"
            },
            {
              title: "Competition Mapping",
              desc: "See where competitors are concentrated and identify gaps and opportunities.",
              icon: <TrendingUpOutlinedIcon sx={{ fontSize: 32, color: "warning.main" }} />,
              bg: "rgba(234, 88, 12, 0.12)"
            },
            {
              title: "Interactive Maps",
              desc: "Visualize recommendations and scores on live maps for Nuwara Eliya.",
              icon: <MapOutlinedIcon sx={{ fontSize: 32, color: "success.main" }} />,
              bg: "rgba(5, 150, 105, 0.12)"
            }
          ].map((item) => (
            <Grid item xs={12} md={4} key={item.title}>
              <Paper
                elevation={0}
                className="home-card-hover"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  border: mode === "dark" ? "1px solid rgba(13, 148, 136, 0.3)" : "1px solid rgba(148,163,184,0.2)",
                  bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.6)" : "background.paper",
                  boxShadow: mode === "dark" ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(15,23,42,0.06)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.8)" : undefined,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: item.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2
                  }}
                >
                  {item.icon}
                </Box>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ color: mode === "dark" ? "#cbd5e1" : "text.secondary" }}>
                  {item.desc}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Nuwara Eliya */}
      <Box
        sx={{
          py: { xs: 6, md: 8 },
          px: 2,
          bgcolor: mode === "dark" 
            ? "rgba(15, 23, 42, 0.5)" 
            : "rgba(240, 253, 250, 0.5)",
          borderTop: mode === "dark" 
            ? "1px solid rgba(148,163,184,0.1)" 
            : "1px solid rgba(148,163,184,0.15)",
          borderBottom: mode === "dark" 
            ? "1px solid rgba(148,163,184,0.1)" 
            : "1px solid rgba(148,163,184,0.15)"
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={2} alignItems="center" textAlign="center" mb={4}>
            <Chip
              icon={<PlaceOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />}
              label="SmartLoc focuses on"
              sx={{
                bgcolor: "rgba(13, 148, 136, 0.12)",
                color: "text.primary",
                fontWeight: 600,
                "& .MuiChip-icon": { ml: 0.5 }
              }}
            />
            <Typography variant="h4" fontWeight={700} sx={{ color: "text.primary" }}>
              Why Nuwara Eliya?
            </Typography>
          </Stack>
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  height: "100%",
                  border: mode === "dark" ? "1px solid rgba(13, 148, 136, 0.3)" : "1px solid rgba(13, 148, 136, 0.2)",
                  bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.6)" : "rgba(255,255,255,0.8)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.8)" : undefined,
                  },
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  Queen of the Hills
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: mode === "dark" ? "#cbd5e1" : "text.secondary" }}>
                  Nuwara Eliya is the heart of Sri Lanka’s hill country, with a
                  cool climate and year-round tourism—ideal for cafés, hotels,
                  and retail.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  height: "100%",
                  border: mode === "dark" ? "1px solid rgba(13, 148, 136, 0.3)" : "1px solid rgba(13, 148, 136, 0.2)",
                  bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.6)" : "rgba(255,255,255,0.8)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.8)" : undefined,
                  },
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  Tea & Tourism Hub
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: mode === "dark" ? "#cbd5e1" : "text.secondary" }}>
                  Tea estates, Gregory Lake, and heritage sites draw visitors
                  constantly. SmartLoc helps you place your business where
                  footfall and spend are strongest.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  height: "100%",
                  border: mode === "dark" ? "1px solid rgba(13, 148, 136, 0.3)" : "1px solid rgba(13, 148, 136, 0.2)",
                  bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.6)" : "rgba(255,255,255,0.8)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.8)" : undefined,
                  },
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  Data You Can Use
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: mode === "dark" ? "#cbd5e1" : "text.secondary" }}>
                  We combine traffic, rent, and competition data for Nuwara Eliya
                  so you can compare areas and pick the best spot with confidence.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Contact */}
      <Box
        id="contact"
        sx={{
          py: { xs: 6, md: 8 },
          px: 2,
          background: mode === "dark"
            ? `
                linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.98) 100%),
                radial-gradient(ellipse 70% 50% at 50% 50%, rgba(13, 148, 136, 0.15), transparent)
              `
            : `
                linear-gradient(135deg, rgba(13, 148, 136, 0.06) 0%, rgba(240, 253, 250, 0.5) 50%, rgba(255,255,255,0.95) 100%),
                radial-gradient(ellipse 70% 50% at 50% 50%, rgba(13, 148, 136, 0.08), transparent)
              `,
          borderTop: mode === "dark" ? "1px solid rgba(148,163,184,0.1)" : "1px solid rgba(148,163,184,0.15)",
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={3} alignItems="center" textAlign="center" mb={4}>
            <Chip
              icon={<PhoneIcon sx={{ fontSize: 18, color: "primary.main" }} />}
              label="Get in touch"
              sx={{
                bgcolor: "rgba(13, 148, 136, 0.12)",
                color: "text.primary",
                fontWeight: 600,
                border: "1px solid rgba(13, 148, 136, 0.3)",
                "& .MuiChip-icon": { ml: 0.5 },
              }}
            />
            <Typography variant="h4" fontWeight={700} sx={{ color: "text.primary" }}>
              Contact us
            </Typography>
            <Typography variant="body1" maxWidth="600px" sx={{ color: mode === "dark" ? "#e2e8f0" : "text.secondary" }}>
              SmartLoc helps businesses find the correct location in Nuwara Eliya according to their business type. We use foot traffic, competition, and market data to recommend the best spot for your café, hotel, restaurant, retail, or other business. Need help? Use the chatbot or contact our team.
            </Typography>
          </Stack>
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={0}
                component="a"
                href={GOOGLE_CALENDAR_MEETING_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  border: mode === "dark" ? "2px solid rgba(13, 148, 136, 0.3)" : "2px solid rgba(13, 148, 136, 0.25)",
                  bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.7)" : "rgba(255,255,255,0.9)",
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.9)" : "rgba(13, 148, 136, 0.06)",
                    boxShadow: mode === "dark" ? "0 8px 24px rgba(13, 148, 136, 0.3)" : "0 8px 24px rgba(13, 148, 136, 0.15)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: "primary.main",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <EventIcon sx={{ fontSize: 26 }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  Schedule a meeting
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: mode === "dark" ? "#cbd5e1" : "text.secondary" }}>
                  Open Google Calendar to book a consultation with our team.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={0}
                component="a"
                href={getPhoneLink(contactPhone)}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  border: mode === "dark" ? "2px solid rgba(13, 148, 136, 0.3)" : "2px solid rgba(13, 148, 136, 0.25)",
                  bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.7)" : "rgba(255,255,255,0.9)",
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.9)" : "rgba(13, 148, 136, 0.06)",
                    boxShadow: mode === "dark" ? "0 8px 24px rgba(13, 148, 136, 0.3)" : "0 8px 24px rgba(13, 148, 136, 0.15)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: "primary.main",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <PhoneIcon sx={{ fontSize: 26 }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  Call agent
                </Typography>
                <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>
                  {contactPhone}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: mode === "dark" ? "#cbd5e1" : "text.secondary" }}>
                  Mon–Sat, 9am–6pm
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={0}
                component="div"
                onClick={() => {
                  if (isAuthenticated) {
                    // Open Gmail compose in new tab for registered users
                    window.open(getEmailLink(CONTACT_EMAIL, true), "_blank");
                  } else {
                    // Redirect to register page if not registered
                    navigate("/register");
                  }
                }}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  border: mode === "dark" ? "2px solid rgba(13, 148, 136, 0.3)" : "2px solid rgba(13, 148, 136, 0.25)",
                  bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.7)" : "rgba(255,255,255,0.9)",
                  cursor: "pointer",
                  color: "inherit",
                  display: "block",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: mode === "dark" ? "rgba(30, 41, 59, 0.9)" : "rgba(13, 148, 136, 0.06)",
                    boxShadow: mode === "dark" ? "0 8px 24px rgba(13, 148, 136, 0.3)" : "0 8px 24px rgba(13, 148, 136, 0.15)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: "primary.main",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <EmailIcon sx={{ fontSize: 26 }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  Email us
                </Typography>
                <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5, wordBreak: "break-all" }}>
                  {CONTACT_EMAIL}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: mode === "dark" ? "#cbd5e1" : "text.secondary" }}>
                  {isAuthenticated 
                    ? "Click to open Gmail" 
                    : "Register to open Gmail"}
                </Typography>
                {!isAuthenticated && (
                  <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: mode === "dark" ? "#fbbf24" : "warning.main", fontWeight: 600 }}>
                    Please register first
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 4,
          px: 2,
          mt: 2,
          bgcolor: mode === "dark" ? "#0f172a" : "#1e293b",
          color: mode === "dark" ? "#cbd5e1" : "#94a3b8",
          borderTop: mode === "dark" ? "1px solid rgba(148, 163, 184, 0.12)" : "none",
          background: mode === "dark" 
            ? "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 14, 26, 0.95) 100%)"
            : undefined,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ color: mode === "dark" ? "#f1f5f9" : "#fff", mb: 1 }}
              >
                SmartLoc
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: mode === "dark" ? "#cbd5e1" : "inherit" }}>
                Find the right business location in Nuwara Eliya according to your business type.
              </Typography>
              {/* Social Media Links */}
              <Stack direction="row" spacing={1.5}>
                <IconButton
                  component="a"
                  href={socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: mode === "dark" ? "#cbd5e1" : "#94a3b8",
                    "&:hover": { color: "#E4405F", bgcolor: "rgba(228, 64, 95, 0.1)" },
                  }}
                  size="small"
                >
                  <InstagramIcon fontSize="small" />
                </IconButton>
                <IconButton
                  component="a"
                  href={socialMedia.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: mode === "dark" ? "#cbd5e1" : "#94a3b8",
                    "&:hover": { color: "#1DA1F2", bgcolor: "rgba(29, 161, 242, 0.1)" },
                  }}
                  size="small"
                >
                  <TwitterIcon fontSize="small" />
                </IconButton>
                <IconButton
                  component="a"
                  href={socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: mode === "dark" ? "#cbd5e1" : "#94a3b8",
                    "&:hover": { color: "#1877F2", bgcolor: "rgba(24, 119, 242, 0.1)" },
                  }}
                  size="small"
                >
                  <FacebookIcon fontSize="small" />
                </IconButton>
                <IconButton
                  component="a"
                  href={getWhatsAppLink(socialMedia.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: mode === "dark" ? "#cbd5e1" : "#94a3b8",
                    "&:hover": { color: "#25D366", bgcolor: "rgba(37, 211, 102, 0.1)" },
                  }}
                  size="small"
                >
                  <WhatsAppIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: mode === "dark" ? "#e2e8f0" : "#e2e8f0", mb: 1 }}>
                Product
              </Typography>
              <Stack spacing={0.5}>
                <Button
                  size="small"
                  sx={{ color: mode === "dark" ? "#cbd5e1" : "#94a3b8", justifyContent: "flex-start" }}
                  onClick={() => navigate("/dashboard")}
                >
                  Dashboard
                </Button>
                <Button
                  size="small"
                  sx={{ color: mode === "dark" ? "#cbd5e1" : "#94a3b8", justifyContent: "flex-start" }}
                  onClick={() => navigate("/recommendations")}
                >
                  Recommendations
                </Button>
                <Button
                  size="small"
                  sx={{ color: mode === "dark" ? "#cbd5e1" : "#94a3b8", justifyContent: "flex-start" }}
                  onClick={() => navigate("/profile")}
                >
                  Profile
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: mode === "dark" ? "#e2e8f0" : "#e2e8f0", mb: 1 }}>
                Resources
              </Typography>
              <Stack spacing={0.5}>
                <Button size="small" href="#contact" component="a" sx={{ color: mode === "dark" ? "#cbd5e1" : "#94a3b8", justifyContent: "flex-start", textTransform: "none" }}>
                  Contact (call / email)
                </Button>
                <Typography variant="body2" sx={{ color: mode === "dark" ? "#cbd5e1" : "inherit" }}>Nuwara Eliya area guide</Typography>
                <Typography variant="body2" sx={{ color: mode === "dark" ? "#cbd5e1" : "inherit" }}>Pricing & plans</Typography>
                <Typography variant="body2" sx={{ color: mode === "dark" ? "#cbd5e1" : "inherit" }}>Support</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: mode === "dark" ? "#e2e8f0" : "#e2e8f0", mb: 1 }}>
                Legal
              </Typography>
              <Typography variant="body2" sx={{ color: mode === "dark" ? "#cbd5e1" : "inherit" }}>Privacy policy</Typography>
              <Typography variant="body2" sx={{ color: mode === "dark" ? "#cbd5e1" : "inherit" }}>Terms of use</Typography>
            </Grid>
          </Grid>
          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: "1px solid rgba(148,163,184,0.2)",
              textAlign: "center"
            }}
          >
            <Typography variant="caption">
              © {new Date().getFullYear()} SmartLoc. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
