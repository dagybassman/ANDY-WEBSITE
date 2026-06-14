// src/routes/contacts.js
// Workers and employers can express interest in each other

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db/database");
const { requireUser } = require("../middleware/auth");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/contacts
// Send a contact/interest request to another user
// Requires: logged-in active user
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", requireUser, (req, res) => {
  const { to_user_id, message } = req.body;
  if (!to_user_id) {
    return res.status(400).json({ success: false, message: "to_user_id is required." });
  }
  if (to_user_id === req.user.id) {
    return res.status(400).json({ success: false, message: "You cannot send a request to yourself." });
  }

  const target = db.prepare("SELECT id, profile_status FROM users WHERE id = ?").get(to_user_id);
  if (!target || target.profile_status !== "active") {
    return res.status(404).json({ success: false, message: "User not found or not active." });
  }

  // Avoid duplicate open requests
  const existing = db.prepare(`
    SELECT id FROM contact_requests
    WHERE from_user_id = ? AND to_user_id = ? AND status != 'responded'
  `).get(req.user.id, to_user_id);

  if (existing) {
    return res.status(409).json({ success: false, message: "You've already sent a request to this person." });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO contact_requests (id, from_user_id, to_user_id, message)
    VALUES (?, ?, ?, ?)
  `).run(id, req.user.id, to_user_id, message || null);

  res.status(201).json({ success: true, message: "Request sent.", data: { id } });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/contacts/received
// Get all contact requests received by the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
router.get("/received", requireUser, (req, res) => {
  const rows = db.prepare(`
    SELECT cr.id, cr.message, cr.status, cr.created_at,
      u.id AS from_id, u.full_name, u.role, u.location,
      COALESCE(wp.skill, ep.help_type) AS category
    FROM contact_requests cr
    JOIN users u ON u.id = cr.from_user_id
    LEFT JOIN worker_profiles wp ON wp.id = u.id
    LEFT JOIN employer_profiles ep ON ep.id = u.id
    WHERE cr.to_user_id = ?
    ORDER BY cr.created_at DESC
  `).all(req.user.id);

  res.json({ success: true, data: rows });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/contacts/:id/seen
// Mark a received request as seen (and reveal full phone number)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/seen", requireUser, (req, res) => {
  const cr = db.prepare("SELECT * FROM contact_requests WHERE id = ?").get(req.params.id);
  if (!cr || cr.to_user_id !== req.user.id) {
    return res.status(404).json({ success: false, message: "Request not found." });
  }

  db.prepare("UPDATE contact_requests SET status='seen' WHERE id=?").run(req.params.id);

  // Return the sender's full (unmasked) phone number
  const sender = db.prepare("SELECT full_name, phone, location FROM users WHERE id = ?").get(cr.from_user_id);
  res.json({ success: true, message: "Contact revealed.", data: sender });
});

module.exports = router;
