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

function fallbackReply(userMsg) {
  // Used only when VITE_GEMINI_API_KEY is not set — keeps the chatbot usable
  // during dev without burning a free-tier key, and as a graceful degrade if
  // Gemini errors out.
  const greetingRe = /^(hi|hello|hey|hiya|yo|howdy|good\s*(morning|afternoon|evening)|hola|aloha|sup)\b/i;
  const thanksRe = /^(thanks|thank you|ty|thx|cheers|appreciate it)\b/i;
  const byeRe = /^(bye|goodbye|see ya|later|cya|ok bye)\b/i;
  const helpRe = /\b(help|what can you do|capabilities|menu|options)\b/i;

  if (greetingRe.test(userMsg))
    return "Hey! Happy to help. You can ask me about areas, budget fit, best months to open, or risks to watch out for.";
  if (thanksRe.test(userMsg))
    return "Anytime. Let me know if you want to dig into a specific area.";
  if (byeRe.test(userMsg))
    return "Take care! Come back when you want to run more recommendations.";
  if (helpRe.test(userMsg))
    return "I can help with: • which area suits your business • best time to open • budget and competition • risks to consider. Ask away.";
  if (userMsg.includes("competition"))
    return "Low-competition options include Glencairn, Ambewela and the Tea estates belt. Town Centre is the most saturated.";
  if (userMsg.includes("budget") || userMsg.includes("cheap"))
    return "For smaller budgets look at Nanu Oya, Ambewela, Glencairn or the Tea estates belt. Town Centre and Gregory Lake Front are premium.";
  if (userMsg.includes("tourist") || userMsg.includes("visibility"))
    return "Gregory Lake Front, Town Centre and Hakgala Road have the strongest tourist visibility.";
  if (userMsg.includes("month") || userMsg.includes("time") || userMsg.includes("season"))
    return "Peak months are April, August and December. Monsoon / slower months are May, June, July, October and November.";
  return "Got it. I can help you think through area, budget, timing and risks — try one of the suggested questions, or ask in your own words.";
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef(null);

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
      if (hasGeminiKey()) {
        reply = await sendToGemini(text);
      } else {
        reply = fallbackReply(text.toLowerCase());
      }
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    } catch (err) {
      console.warn("Gemini error, falling back to canned reply:", err);
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: fallbackReply(text.toLowerCase()) },
      ]);
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
                  {hasGeminiKey() ? "Powered by Gemini" : "Offline mode"}
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
