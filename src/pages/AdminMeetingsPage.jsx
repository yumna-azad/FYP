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
  Grid,
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState([
    { id: 1, title: "Team Sync", date: "2024-01-20", time: "10:00 AM", attendee: "John Smith", status: "Scheduled" },
    { id: 2, title: "Client Review", date: "2024-01-22", time: "2:00 PM", attendee: "Sarah Johnson", status: "Completed" },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "", attendee: "", status: "Scheduled" });
  const [editingId, setEditingId] = useState(null);

  const handleSave = () => {
    if (editingId) {
      setMeetings(meetings.map(m => m.id === editingId ? { ...form, id: editingId } : m));
    } else {
      setMeetings([...meetings, { ...form, id: Date.now() }]);
    }
    setDialogOpen(false);
    setForm({ title: "", date: "", time: "", attendee: "", status: "Scheduled" });
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this meeting?")) {
      setMeetings(meetings.filter(m => m.id !== id));
    }
  };

  const openEdit = (meeting) => {
    setForm(meeting);
    setEditingId(meeting.id);
    setDialogOpen(true);
  };

  return (
    <Box sx={{ height: "100%", overflowY: "auto" }}>
      <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Schedule Meeting
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage meetings and appointments
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setDialogOpen(true); setEditingId(null); setForm({ title: "", date: "", time: "", attendee: "", status: "Scheduled" }); }}>
            Schedule Meeting
          </Button>
        </Box>

        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Attendee</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {meetings.map((meeting) => (
                <TableRow key={meeting.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{meeting.title}</TableCell>
                  <TableCell>{meeting.date}</TableCell>
                  <TableCell>{meeting.time}</TableCell>
                  <TableCell>{meeting.attendee}</TableCell>
                  <TableCell>
                    <Chip label={meeting.status} size="small" color={meeting.status === "Completed" ? "success" : "default"} variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(meeting)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(meeting.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingId ? "Edit Meeting" : "Schedule Meeting"}</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} margin="dense" required />
            <TextField fullWidth type="date" label="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} margin="dense" InputLabelProps={{ shrink: true }} required />
            <TextField fullWidth type="time" label="Time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} margin="dense" InputLabelProps={{ shrink: true }} required />
            <TextField fullWidth label="Attendee" value={form.attendee} onChange={(e) => setForm({ ...form, attendee: e.target.value })} margin="dense" required />
            <TextField fullWidth select SelectProps={{ native: true }} label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} margin="dense">
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={!form.title || !form.date || !form.time || !form.attendee}>
              {editingId ? "Update" : "Schedule"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
