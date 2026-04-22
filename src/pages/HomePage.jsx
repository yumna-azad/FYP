import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import EventIcon from "@mui/icons-material/Event";
import InstagramIcon from "@mui/icons-material/Instagram";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  CONTACT_PHONE,
  CONTACT_EMAIL,
  GOOGLE_CALENDAR_MEETING_URL,
  getPhoneLink,
  getEmailLink,
  getContactPhone,
} from "../lib/contact.js";
import { getSocialMediaLinks, getWhatsAppLink } from "../lib/socialMedia.js";

const MotionBox = motion(Box);

const HERO_IMAGE = "/images/hero/ne-tea.jpg";

const ease = [0.22, 1, 0.36, 1];

const reveal = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease, delay: 0.1 + i * 0.08 },
  }),
};

const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const staggerChild = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const userName = user?.name || user?.email;

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  const [socialMedia, setSocialMedia] = useState({
    instagram: "https://instagram.com/smartloc",
    twitter: "https://twitter.com/smartloc",
    facebook: "https://facebook.com/smartloc",
    whatsapp: "0705292183",
    phone: CONTACT_PHONE,
  });
  const [contactPhone, setContactPhone] = useState(CONTACT_PHONE);

  useEffect(() => {
    getSocialMediaLinks()
      .then((links) => {
        setSocialMedia(links);
        if (links.phone) setContactPhone(links.phone);
      })
      .catch(() => {});
    getContactPhone().then(setContactPhone).catch(() => {});
  }, []);

  const ink = isDark ? "#f5f3ee" : "#0a0a0a";
  const inkSoft = isDark ? "rgba(245,243,238,0.64)" : "rgba(10,10,10,0.62)";
  const hair = isDark ? "rgba(245,243,238,0.12)" : "rgba(10,10,10,0.12)";
  const surface = isDark ? "#0b0f0e" : "#faf8f3";

  return (
    <Box sx={{ height: "100%", overflowY: "auto", overflowX: "hidden", bgcolor: surface }}>
      {/* ------------------------------ HERO ------------------------------ */}
      <Box
        ref={heroRef}
        sx={{
          position: "relative",
          minHeight: { xs: "92vh", md: "100vh" },
          display: "flex",
          alignItems: "flex-end",
          overflow: "hidden",
          color: "#f5f3ee",
        }}
      >
        <MotionBox
          style={{ y: heroY, opacity: heroOpacity }}
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${HERO_IMAGE})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "scale(1.08)",
            filter: "saturate(0.9) contrast(1.02)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(8,12,14,0.35) 0%, rgba(8,12,14,0.55) 55%, rgba(8,12,14,0.88) 100%)",
          }}
        />
        <Box className="hero-grain" />

        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 2, pb: { xs: 8, md: 12 }, pt: { xs: 14, md: 18 } }}>
          <motion.div initial="hidden" animate="show" variants={staggerParent}>
            <motion.div variants={staggerChild}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3, opacity: 0.85 }}>
                <Box sx={{ width: 28, height: 1, bgcolor: "rgba(245,243,238,0.6)" }} />
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: "0.28em", fontSize: 11, color: "rgba(245,243,238,0.85)", fontWeight: 500 }}
                >
                  SmartLoc · Nuwara Eliya
                </Typography>
              </Stack>
            </motion.div>

            {isAuthenticated && userName && (
              <motion.div variants={staggerChild}>
                <Typography sx={{ fontSize: 14, color: "rgba(245,243,238,0.75)", mb: 2, letterSpacing: "0.02em" }}>
                  Welcome back, {userName.split("@")[0]}.
                </Typography>
              </motion.div>
            )}

            <motion.div variants={staggerChild}>
              <Typography
                className="font-display"
                sx={{
                  fontSize: { xs: "2.75rem", sm: "3.75rem", md: "5.25rem", lg: "6rem" },
                  lineHeight: 0.98,
                  fontWeight: 400,
                  color: "#f5f3ee",
                  maxWidth: 1000,
                  letterSpacing: "-0.035em",
                }}
              >
                The right place{" "}
                <Box component="em" sx={{ fontStyle: "italic", fontWeight: 400, opacity: 0.95 }}>
                  for every
                </Box>{" "}
                business,<br />decided by data.
              </Typography>
            </motion.div>

            <motion.div variants={staggerChild}>
              <Typography
                sx={{
                  mt: 4,
                  maxWidth: 560,
                  fontSize: { xs: "1rem", md: "1.0625rem" },
                  lineHeight: 1.55,
                  color: "rgba(245,243,238,0.78)",
                  fontWeight: 300,
                }}
              >
                A location intelligence platform built for Nuwara Eliya. We combine foot traffic,
                competition density and market data so cafés, hotels, retail and wellness operators
                choose with conviction.
              </Typography>
            </motion.div>

            <motion.div variants={staggerChild}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} sx={{ mt: 5 }}>
                <Button
                  disableElevation
                  size="large"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
                  onClick={() => navigate("/dashboard")}
                  sx={{
                    bgcolor: "#f5f3ee",
                    color: "#0a0a0a",
                    borderRadius: 999,
                    px: 3.5,
                    py: 1.5,
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    textTransform: "none",
                    letterSpacing: "-0.005em",
                    "&:hover": { bgcolor: "#ffffff" },
                  }}
                >
                  Open dashboard
                </Button>
                <Button
                  size="large"
                  onClick={() => {
                    const el = document.getElementById("contact");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  endIcon={<ArrowOutwardIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    color: "rgba(245,243,238,0.92)",
                    borderRadius: 999,
                    px: 2,
                    py: 1.5,
                    fontSize: "0.9375rem",
                    fontWeight: 400,
                    textTransform: "none",
                    "&:hover": { bgcolor: "rgba(245,243,238,0.08)" },
                  }}
                >
                  Talk to us
                </Button>
              </Stack>
            </motion.div>
          </motion.div>
        </Container>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1.4, duration: 1 }}
          style={{ position: "absolute", bottom: 24, right: 32, zIndex: 2 }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "rgba(245,243,238,0.7)" }}>
            <Typography sx={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase" }}>
              Scroll
            </Typography>
            <Box sx={{ width: 40, height: 1, bgcolor: "rgba(245,243,238,0.5)" }} />
          </Stack>
        </motion.div>
      </Box>

      {/* --------------------------- CAPABILITIES --------------------------- */}
      <Box sx={{ py: { xs: 10, md: 16 }, px: 2, color: ink }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 4, md: 10 }} sx={{ mb: { xs: 6, md: 10 } }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-15%" }} variants={reveal} custom={0}>
              <Typography variant="overline" sx={{ letterSpacing: "0.3em", fontSize: 11, color: inkSoft, fontWeight: 500 }}>
                01 — Capabilities
              </Typography>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-15%" }}
              variants={reveal}
              custom={1}
              style={{ flex: 1 }}
            >
              <Typography
                className="font-display"
                sx={{
                  fontSize: { xs: "2rem", md: "3rem" },
                  lineHeight: 1.05,
                  fontWeight: 400,
                  letterSpacing: "-0.025em",
                  maxWidth: 720,
                }}
              >
                Decisions worth making,{" "}
                <Box component="em" sx={{ fontStyle: "italic", color: inkSoft }}>
                  grounded in evidence.
                </Box>
              </Typography>
            </motion.div>
          </Stack>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10%" }}
            variants={staggerParent}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                gap: 0,
                borderTop: `1px solid ${hair}`,
              }}
            >
              {[
                {
                  n: "A",
                  title: "Business analysis",
                  desc: "AI reports on foot traffic, demographics and spending patterns — cut through the anecdote.",
                },
                {
                  n: "B",
                  title: "Competition mapping",
                  desc: "See where rivals cluster, where they don't, and the gaps that make sense for your model.",
                },
                {
                  n: "C",
                  title: "Interactive maps",
                  desc: "Scoring overlaid on live Nuwara Eliya geography. Zoom, compare, decide.",
                },
              ].map((item, i) => (
                <motion.div key={item.title} variants={staggerChild}>
                  <Box
                    sx={{
                      p: { xs: 3, md: 4 },
                      borderBottom: `1px solid ${hair}`,
                      borderRight: { md: i < 2 ? `1px solid ${hair}` : "none" },
                      height: "100%",
                      transition: "background-color 0.4s ease",
                      "&:hover": {
                        bgcolor: isDark ? "rgba(245,243,238,0.03)" : "rgba(10,10,10,0.02)",
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: 11, letterSpacing: "0.3em", color: inkSoft, mb: 6, fontWeight: 500 }}>
                      {item.n}
                    </Typography>
                    <Typography
                      className="font-display"
                      sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" }, lineHeight: 1.15, mb: 1.5, letterSpacing: "-0.02em" }}
                    >
                      {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: "0.9375rem", lineHeight: 1.55, color: inkSoft, maxWidth: 320 }}>
                      {item.desc}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ------------------------------ CONTACT ------------------------------ */}
      <Box id="contact" sx={{ py: { xs: 10, md: 16 }, px: 2, color: ink }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 4, md: 10 }} sx={{ mb: { xs: 6, md: 10 } }}>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-15%" }} variants={reveal}>
              <Typography variant="overline" sx={{ letterSpacing: "0.3em", fontSize: 11, color: inkSoft, fontWeight: 500 }}>
                02 — In touch
              </Typography>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-15%" }} variants={reveal} custom={1} style={{ flex: 1 }}>
              <Typography
                className="font-display"
                sx={{ fontSize: { xs: "2rem", md: "3rem" }, lineHeight: 1.05, fontWeight: 400, letterSpacing: "-0.025em", maxWidth: 720 }}
              >
                Talk to a human,{" "}
                <Box component="em" sx={{ fontStyle: "italic", color: inkSoft }}>
                  not a form.
                </Box>
              </Typography>
              <Typography sx={{ mt: 3, fontSize: "1rem", lineHeight: 1.55, color: inkSoft, maxWidth: 560 }}>
                Booking a call, emailing the team, or scheduling a working session — we read everything
                and reply the same day.
              </Typography>
            </motion.div>
          </Stack>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-10%" }} variants={staggerParent}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                borderTop: `1px solid ${hair}`,
              }}
            >
              {[
                {
                  icon: <EventIcon sx={{ fontSize: 18 }} />,
                  label: "Book a meeting",
                  value: "Google Calendar",
                  href: GOOGLE_CALENDAR_MEETING_URL,
                  external: true,
                },
                {
                  icon: <PhoneIcon sx={{ fontSize: 18 }} />,
                  label: "Call agent",
                  value: contactPhone,
                  sub: "Mon–Sat, 9am – 6pm",
                  href: getPhoneLink(contactPhone),
                },
                {
                  icon: <EmailIcon sx={{ fontSize: 18 }} />,
                  label: "Email",
                  value: CONTACT_EMAIL,
                  sub: isAuthenticated ? "Opens in Gmail" : "Register to send",
                  onClick: () => {
                    if (isAuthenticated) window.open(getEmailLink(CONTACT_EMAIL, true), "_blank");
                    else navigate("/register");
                  },
                },
              ].map((c, i) => (
                <motion.div key={c.label} variants={staggerChild}>
                  <Box
                    component={c.href ? "a" : "div"}
                    href={c.href}
                    target={c.external ? "_blank" : undefined}
                    rel={c.external ? "noopener noreferrer" : undefined}
                    onClick={c.onClick}
                    sx={{
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                      cursor: "pointer",
                      p: { xs: 3, md: 4 },
                      borderBottom: `1px solid ${hair}`,
                      borderRight: { md: i < 2 ? `1px solid ${hair}` : "none" },
                      transition: "background-color 0.4s ease",
                      "&:hover": {
                        bgcolor: isDark ? "rgba(245,243,238,0.04)" : "rgba(10,10,10,0.03)",
                        "& .arrow": { transform: "translate(4px, -4px)" },
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 6 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ color: inkSoft }}>
                        {c.icon}
                        <Typography sx={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 500 }}>
                          {c.label}
                        </Typography>
                      </Stack>
                      <ArrowOutwardIcon
                        className="arrow"
                        sx={{ fontSize: 18, color: inkSoft, transition: "transform 0.3s ease" }}
                      />
                    </Stack>
                    <Typography
                      className="font-display"
                      sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" }, lineHeight: 1.2, letterSpacing: "-0.02em", wordBreak: "break-word" }}
                    >
                      {c.value}
                    </Typography>
                    {c.sub && (
                      <Typography sx={{ mt: 1.5, fontSize: "0.875rem", color: inkSoft }}>{c.sub}</Typography>
                    )}
                  </Box>
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ------------------------------ FOOTER ------------------------------ */}
      <Box
        component="footer"
        sx={{
          bgcolor: isDark ? "#050807" : "#0a0a0a",
          color: "rgba(245,243,238,0.72)",
          pt: { xs: 8, md: 12 },
          pb: 4,
          px: 2,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 6, md: 4 }} sx={{ mb: { xs: 6, md: 10 } }}>
            <Box sx={{ flex: 1.4 }}>
              <Typography
                className="font-display"
                sx={{ fontSize: { xs: "2rem", md: "2.75rem" }, color: "#f5f3ee", lineHeight: 1.05, letterSpacing: "-0.025em", fontWeight: 400, maxWidth: 520 }}
              >
                SmartLoc — location intelligence for the hill country.
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 4 }}>
                {[
                  { icon: <InstagramIcon fontSize="small" />, href: socialMedia.instagram },
                  { icon: <TwitterIcon fontSize="small" />, href: socialMedia.twitter },
                  { icon: <FacebookIcon fontSize="small" />, href: socialMedia.facebook },
                  { icon: <WhatsAppIcon fontSize="small" />, href: getWhatsAppLink(socialMedia.whatsapp) },
                ].map((s, i) => (
                  <IconButton
                    key={i}
                    component="a"
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "rgba(245,243,238,0.6)",
                      "&:hover": { color: "#f5f3ee", bgcolor: "rgba(245,243,238,0.06)" },
                    }}
                    size="small"
                  >
                    {s.icon}
                  </IconButton>
                ))}
              </Stack>
            </Box>

            <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {[
                {
                  h: "Product",
                  items: [
                    { label: "Dashboard", onClick: () => navigate("/dashboard") },
                    { label: "Recommendations", onClick: () => navigate("/recommendations") },
                    { label: "Profile", onClick: () => navigate("/profile") },
                  ],
                },
                {
                  h: "Resources",
                  items: [
                    { label: "Contact", onClick: () => (window.location.hash = "#contact") },
                    { label: "Area guide" },
                    { label: "Support" },
                  ],
                },
                {
                  h: "Legal",
                  items: [{ label: "Privacy" }, { label: "Terms" }],
                },
              ].map((col) => (
                <Box key={col.h}>
                  <Typography sx={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(245,243,238,0.55)", mb: 2, fontWeight: 500 }}>
                    {col.h}
                  </Typography>
                  <Stack spacing={1.25}>
                    {col.items.map((it) => (
                      <Typography
                        key={it.label}
                        onClick={it.onClick}
                        sx={{
                          fontSize: "0.9375rem",
                          color: "rgba(245,243,238,0.75)",
                          cursor: it.onClick ? "pointer" : "default",
                          "&:hover": { color: it.onClick ? "#f5f3ee" : undefined },
                        }}
                      >
                        {it.label}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ pt: 4, borderTop: "1px solid rgba(245,243,238,0.1)" }}
          >
            <Typography sx={{ fontSize: "0.8125rem", color: "rgba(245,243,238,0.5)" }}>
              © {new Date().getFullYear()} SmartLoc. All rights reserved.
            </Typography>
            <Typography sx={{ fontSize: "0.8125rem", color: "rgba(245,243,238,0.5)" }}>
              Built in Nuwara Eliya.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
