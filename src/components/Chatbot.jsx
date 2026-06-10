import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Fade,
  Avatar,
  Stack,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { sendToGemini, hasGeminiKey } from "../lib/gemini.js";
import { answerLocally } from "../lib/localAssistant.js";

const INITIAL_MESSAGE = {
  from: "bot",
  text: "Hi! I'm the SmartLoc Business Assistant. I can help you pick a location in Nuwara Eliya, explain why an area suits your business, or talk through risks and timing. What's on your mind?",
};

const SUGGESTED_PROMPTS = [
  "Which location is safer for a first-time owner?",
  "Best area for a small-budget cafe?",
  "Which place has lower competition?",
  "What month is best to open?",
];

// Smart offline assistant grounded in the real 12-area dataset and seasonality
// (see src/lib/localAssistant.js). Used when no Gemini key is set, and as a
// graceful degrade when the Gemini API is unavailable (dead key / `limit: 0`
// regional quota). Gives genuine area/budget/timing/risk answers, not a stub.
function fallbackReply(userMsg) {
  return answerLocally(userMsg);
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef(null);
  // Once Gemini fails (dead key / regional `limit: 0`), stop calling it for the
  // rest of the session so every later reply is instant from the local assistant.
  const geminiLiveRef = useRef(hasGeminiKey());

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async (rawText) => {
    const text = rawText.trim();
    if (!text || busy) return;
    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setBusy(true);

    try {
      let reply;
      if (geminiLiveRef.current) {
        try {
          reply = await sendToGemini(text);
        } catch (err) {
          // Gemini unreachable (dead key / regional limit:0) — disable it for
          // the session and answer locally instead.
          console.warn("Gemini unavailable, switching to local assistant:", err);
          geminiLiveRef.current = false;
          reply = fallbackReply(text);
        }
      } else {
        reply = fallbackReply(text);
      }
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = () => sendMessage(input);

  return (
    <>
      {!open && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            bgcolor: "primary.main",
            color: "white",
            boxShadow: 3,
            "&:hover": { bgcolor: "primary.dark", transform: "scale(1.05)" },
            zIndex: 1000,
          }}
          aria-label="Open chatbot"
        >
          <ChatIcon />
        </IconButton>
      )}

      <Fade in={open}>
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 400,
            height: 560,
            display: open ? "flex" : "none",
            flexDirection: "column",
            borderRadius: 3,
            overflow: "hidden",
            zIndex: 1000,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: "primary.main",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <SmartToyIcon />
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.1 }}>
                  SmartLoc Business Assistant
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  Nuwara Eliya location advisor
                </Typography>
              </Box>
            </Stack>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box ref={scrollerRef} sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "background.default" }}>
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    maxWidth: "80%",
                    display: "flex",
                    gap: 1,
                    flexDirection: msg.from === "user" ? "row-reverse" : "row",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      bgcolor: msg.from === "user" ? "primary.main" : "secondary.main",
                    }}
                  >
                    {msg.from === "user" ? "U" : <SmartToyIcon sx={{ fontSize: 16 }} />}
                  </Avatar>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: msg.from === "user" ? "primary.main" : "action.hover",
                      color: msg.from === "user" ? "white" : "text.primary",
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                      {msg.text}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            ))}

            {busy && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 5, mt: 0.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.5,
                    "& > span": {
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "text.secondary",
                      opacity: 0.4,
                      animation: "typingBlink 1.2s infinite ease-in-out",
                    },
                    "& > span:nth-of-type(2)": { animationDelay: "0.2s" },
                    "& > span:nth-of-type(3)": { animationDelay: "0.4s" },
                    "@keyframes typingBlink": {
                      "0%, 80%, 100%": { opacity: 0.2 },
                      "40%": { opacity: 1 },
                    },
                  }}
                >
                  <span /><span /><span />
                </Box>
                <Typography variant="caption" color="text.secondary">thinking…</Typography>
              </Box>
            )}

            {messages.length === 1 && !busy && (
              <Box sx={{ mt: 1, pl: 5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                  Try asking
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
                  {SUGGESTED_PROMPTS.map((p) => (
                    <Chip
                      key={p}
                      label={p}
                      size="small"
                      onClick={() => sendMessage(p)}
                      sx={{
                        cursor: "pointer",
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
                        fontSize: "0.75rem",
                        height: 26,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <TextField
              fullWidth
              size="small"
              placeholder={busy ? "Waiting for reply…" : "Ask about areas, budget, risks, timing…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={busy}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleSend}
                      disabled={!input.trim() || busy}
                      color="primary"
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Paper>
      </Fade>
    </>
  );
}
