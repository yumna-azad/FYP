import React, { useState } from "react";
import {
  Box,
  IconButton,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Fade,
  Avatar,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! I'm the SmartLoc assistant. SmartLoc helps businesses find the right location in Nuwara Eliya according to their business type. I can help you use the dashboard, understand recommendations, or answer questions about the area. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { from: "user", text: input.trim() }]);
    const userMsg = input.trim().toLowerCase();
    setInput("");
    
    setTimeout(() => {
      const greetingRe = /^(hi|hello|hey|hiya|yo|howdy|good\s*(morning|afternoon|evening)|hola|aloha|sup)\b/i;
      const thanksRe = /^(thanks|thank you|ty|thx|cheers|appreciate it)\b/i;
      const byeRe = /^(bye|goodbye|see ya|later|cya|ok bye)\b/i;
      const helpRe = /\b(help|what can you do|capabilities|menu|options)\b/i;

      let response;

      if (greetingRe.test(userMsg)) {
        response = "Hey! Happy to help. You can ask me about the dashboard, how recommendations work, or anything about Nuwara Eliya.";
      } else if (thanksRe.test(userMsg)) {
        response = "Anytime. Let me know if you want to dig into a specific business type or area.";
      } else if (byeRe.test(userMsg)) {
        response = "Take care! Come back if you want to run more recommendations.";
      } else if (helpRe.test(userMsg)) {
        response = "I can help with: • using the dashboard form • interpreting the XGBoost scores • understanding Nuwara Eliya areas • contacting the team. Ask away.";
      } else if (userMsg.includes("dashboard") || userMsg.includes("input") || userMsg.includes("form")) {
        response = "The dashboard takes four inputs: Business Type (required), Land (rent or purchase), Budget in LKR, and optionally a Preferred Area. Fill those and click Generate Recommendations — the XGBoost model ranks 12 Nuwara Eliya areas for you.";
      } else if (userMsg.includes("recommendation") || userMsg.includes("score") || userMsg.includes("ranking")) {
        response = "Each area gets a composite score: 40% XGBoost suitability for your business type × month, 25% budget fit, 20% footfall, 15% low-competition, plus a small bonus if you chose a preferred area. Hover the 12-month chart to see seasonality.";
      } else if (userMsg.includes("model") || userMsg.includes("xgboost") || userMsg.includes("ml") || userMsg.includes("ai")) {
        response = "Behind the scenes is an XGBoost regressor trained on 18,096 rows (1,508 businesses × 12 months × 24 features). Test R² is 0.8447. The notebook compared Random Forest, XGBoost, and LightGBM — XGBoost won.";
      } else if (userMsg.includes("contact") || userMsg.includes("phone") || userMsg.includes("email")) {
        response = "Call us at +94 52 222 1234 or email hello@smartloc.lk. Mon–Sat, 9am–6pm.";
      } else if (userMsg.includes("nuwara eliya") || userMsg.includes("area") || userMsg.includes("location") || userMsg.includes("business type")) {
        response = "SmartLoc is focused on Nuwara Eliya — the hill country capital. We cover 12 areas including Town Centre, Gregory Lake Front, Hakgala Road, Pedro, Nanu Oya, Kandapola and the tea estates belt. Pick a business type and we'll rank them.";
      } else if (/\?$/.test(userMsg.trim())) {
        response = "Good question — I'm a limited assistant so I may not have that specific answer. Try rephrasing with keywords like dashboard, recommendations, model, or contact. For anything detailed, the team is reachable on the Contact section.";
      } else {
        response = "Got it. I can help you with the dashboard, the XGBoost recommendations, or quick facts about Nuwara Eliya — just ask. Type 'help' to see what I cover.";
      }

      setMessages((prev) => [...prev, { from: "bot", text: response }]);
    }, 500);
  };

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
            width: 380,
            height: 500,
            display: open ? "flex" : "none",
            flexDirection: "column",
            borderRadius: 3,
            overflow: "hidden",
            zIndex: 1000,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SmartToyIcon />
              <Typography variant="subtitle1" fontWeight={600}>
                SmartLoc Assistant
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "background.default" }}>
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    maxWidth: "75%",
                    display: "flex",
                    gap: 1,
                    flexDirection: msg.from === "user" ? "row-reverse" : "row",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: msg.from === "user" ? "primary.main" : "secondary.main",
                    }}
                  >
                    {msg.from === "user" ? "U" : <SmartToyIcon sx={{ fontSize: 18 }} />}
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
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSend} disabled={!input.trim()} color="primary">
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
