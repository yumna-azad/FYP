import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import EmailIcon from "@mui/icons-material/Email";
import DeleteIcon from "@mui/icons-material/Delete";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";

export default function AdminMailPage() {
  const [tab, setTab] = useState("inbox");
  const [emails, setEmails] = useState([
    { id: 1, from: "user@example.com", subject: "Question about location", body: "I need help finding a location...", date: "2024-01-15", read: false, type: "inbox" },
    { id: 2, from: "admin@smartloc.lk", subject: "Welcome email", body: "Thank you for using SmartLoc...", date: "2024-01-14", read: true, type: "sent" },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ to: "", subject: "", body: "" });

  const filteredEmails = emails.filter(e => e.type === tab);

  const handleSend = () => {
    setEmails([...emails, { id: Date.now(), from: "admin@smartloc.lk", subject: form.subject, body: form.body, date: new Date().toISOString().split("T")[0], read: false, type: "sent" }]);
    setDialogOpen(false);
    setForm({ to: "", subject: "", body: "" });
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this email?")) {
      setEmails(emails.filter(e => e.id !== id));
    }
  };

  const markAsRead = (id) => {
    setEmails(emails.map(e => e.id === id ? { ...e, read: true } : e));
  };

  return (
    <Box sx={{ height: "100%", overflowY: "auto" }}>
      <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Mail Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage emails and communications
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<SendIcon />} onClick={() => setDialogOpen(true)}>
            Send Email
          </Button>
        </Box>

        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
            <Tab label="Inbox" value="inbox" />
            <Tab label="Sent" value="sent" />
          </Tabs>

          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ fontWeight: 600 }}>From/To</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    No emails in {tab}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmails.map((email) => (
                  <TableRow key={email.id} hover sx={{ bgcolor: !email.read ? "action.hover" : "transparent" }}>
                    <TableCell sx={{ fontWeight: !email.read ? 600 : 400 }}>{email.from}</TableCell>
                    <TableCell>{email.subject}</TableCell>
                    <TableCell>{email.date}</TableCell>
                    <TableCell>
                      <Chip label={email.read ? "Read" : "Unread"} size="small" color={email.read ? "default" : "primary"} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      {!email.read && tab === "inbox" && (
                        <IconButton size="small" onClick={() => markAsRead(email.id)}>
                          <MarkEmailReadIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small" color="error" onClick={() => handleDelete(email.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Send Email</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="To" type="email" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} margin="dense" required />
            <TextField fullWidth label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} margin="dense" required />
            <TextField fullWidth label="Message" multiline rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} margin="dense" required />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSend} disabled={!form.to || !form.subject || !form.body}>
              Send
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
