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
      let response = "Thanks for your question! For detailed location analysis, fill out the dashboard form and generate recommendations. For direct support, contact our team via phone or email.";
      
      if (userMsg.includes("dashboard") || userMsg.includes("input")) {
        response = "The dashboard helps you find the right location in Nuwara Eliya for your business type. Choose your business type (café, hotel, restaurant, etc.), set preferences and budget, then click 'Generate Recommendations' to get location suggestions.";
      } else if (userMsg.includes("recommendation") || userMsg.includes("location")) {
        response = "After filling the dashboard, you'll see ranked locations with scores, metrics, and nearby attractions. Click any location to see details.";
      } else if (userMsg.includes("contact") || userMsg.includes("phone") || userMsg.includes("email")) {
        response = "You can call us at +94 52 222 1234 or email hello@smartloc.lk. Our team is available Mon–Sat, 9am–6pm.";
      } else if (userMsg.includes("nuwara eliya") || userMsg.includes("area") || userMsg.includes("business type")) {
        response = "SmartLoc is for businesses finding the right location in Nuwara Eliya according to their business type. We focus on Nuwara Eliya—hill country, tourism, and commerce—and recommend the best spot for your café, hotel, restaurant, retail, or other type.";
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
