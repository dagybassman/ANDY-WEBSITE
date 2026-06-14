// src/routes/employers.js

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db/database");
const { requireAdmin } = require("../middleware/auth");
const { validateEmployer, validateId } = require("../middleware/validate");

const router = express.Router();

const formatEmployer = (row) => ({
  id: row.id,
  full_name: row.full_name,
  phone: row.phone,
  location: row.location,
  profile_status: row.profile_status,
  created_at: row.created_at,
  help_type: row.help_type,
  budget_min: row.budget_min,
  budget_max: row.budget_max,
  description: row.description,
  is_active: !!row.is_active,
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employers
// List active employer job postings. Public.
// Supports: ?help_type=nanny&location=bungoma&q=amina&page=1&limit=12
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const { help_type, location, q, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ["u.profile_status = 'active'", "u.role = 'employer'", "ep.is_active = 1"];
  const params = [];

  if (help_type) { where.push("ep.help_type = ?"); params.push(help_type.toLowerCase()); }
  if (location)  { where.push("u.location LIKE ?"); params.push(`%${location}%`); }
  if (q)         { where.push("(u.full_name LIKE ? OR u.location LIKE ? OR ep.description LIKE ?)"); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }

  const whereClause = "WHERE " + where.join(" AND ");

  const rows = db.prepare(`
    SELECT u.id, u.full_name,
      SUBSTR(u.phone,1,4)||' ***'||SUBSTR(u.phone,-3) AS phone,
      u.location, u.profile_status, u.created_at,
      ep.help_type, ep.budget_min, ep.budget_max, ep.description, ep.is_active
    FROM users u
    JOIN employer_profiles ep ON ep.id = u.id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`
    SELECT COUNT(*) as n FROM users u
    JOIN employer_profiles ep ON ep.id = u.id
    ${whereClause}
  `).get(...params).n;

  res.json({
    success: true,
    data: rows.map(formatEmployer),
    meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employers/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const row = db.prepare(`
    SELECT u.id, u.full_name,
      SUBSTR(u.phone,1,4)||' ***'||SUBSTR(u.phone,-3) AS phone,
      u.location, u.profile_status, u.created_at,
      ep.help_type, ep.budget_min, ep.budget_max, ep.description, ep.is_active
    FROM users u
    JOIN employer_profiles ep ON ep.id = u.id
    WHERE u.id = ? AND u.role = 'employer'
  `).get(req.params.id);

  if (!row) return res.status(404).json({ success: false, message: "Employer not found." });
  res.json({ success: true, data: formatEmployer(row) });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/employers
// Register a new employer
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validateEmployer, (req, res) => {
  const { full_name, phone, location, help_type, budget_min, budget_max, description, payment_id } = req.body;

  const payment = db.prepare("SELECT id, status FROM payments WHERE id = ?").get(payment_id);
  if (!payment) {
    return res.status(400).json({ success: false, message: "Payment not found. Please submit payment first." });
  }
  if (payment.status === "rejected") {
    return res.status(400).json({ success: false, message: "Your payment was rejected. Contact support." });
  }

  const taken = db.prepare("SELECT id FROM users WHERE payment_id = ?").get(payment_id);
  if (taken) {
    return res.status(409).json({ success: false, message: "This payment has already been used to register." });
  }

  const id = uuidv4();

  const register = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, role, full_name, phone, location, payment_id, profile_status)
      VALUES (?, 'employer', ?, ?, ?, ?, ?)
    `).run(id, full_name, phone, location, payment_id,
      payment.status === "verified" ? "active" : "pending");

    db.prepare(`
      INSERT INTO employer_profiles (id, help_type, budget_min, budget_max, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, help_type.toLowerCase(), parseInt(budget_min),
      budget_max ? parseInt(budget_max) : null, description);
  });

  register();

  const profileStatus = payment.status === "verified" ? "active" : "pending";

  res.status(201).json({
    success: true,
    message: profileStatus === "active"
      ? "Registration successful! Your job listing is now live."
      : "Registration submitted. Your listing will go live once payment is verified (within 2 hours).",
    data: { id, profile_status: profileStatus },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/employers/:id  (Admin)
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", requireAdmin, validateId, (req, res) => {
  const employer = db.prepare("SELECT id FROM users WHERE id = ? AND role='employer'").get(req.params.id);
  if (!employer) return res.status(404).json({ success: false, message: "Employer not found." });

  const { help_type, budget_min, budget_max, description, is_active, profile_status } = req.body;

  if (profile_status) {
    db.prepare("UPDATE users SET profile_status=?, updated_at=datetime('now') WHERE id=?")
      .run(profile_status, req.params.id);
  }

  db.prepare(`
    UPDATE employer_profiles SET
      help_type   = COALESCE(?, help_type),
      budget_min  = COALESCE(?, budget_min),
      budget_max  = COALESCE(?, budget_max),
      description = COALESCE(?, description),
      is_active   = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    help_type?.toLowerCase() || null,
    budget_min ? parseInt(budget_min) : null,
    budget_max ? parseInt(budget_max) : null,
    description || null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    req.params.id
  );

  res.json({ success: true, message: "Employer profile updated." });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/employers/:id  (Admin)
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", requireAdmin, validateId, (req, res) => {
  const result = db.prepare("DELETE FROM users WHERE id = ? AND role = 'employer'").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "Employer not found." });
  res.json({ success: true, message: "Employer deleted." });
});

module.exports = router;
