// src/routes/workers.js

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db/database");
const { requireAdmin, optionalUser } = require("../middleware/auth");
const { validateWorker, validateId } = require("../middleware/validate");
const upload = require("../middleware/upload");

const router = express.Router();

// ── Helper: build worker response object ──────────────────────────────────────
const formatWorker = (row) => ({
  id: row.id,
  full_name: row.full_name,
  phone: row.phone,         // masked for public; full for admin
  location: row.location,
  profile_status: row.profile_status,
  created_at: row.created_at,
  skill: row.skill,
  experience: row.experience,
  salary_min: row.salary_min,
  salary_max: row.salary_max,
  availability: row.availability,
  bio: row.bio,
  photo_url: row.photo_url,
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workers
// List all ACTIVE workers. Public — phone is masked.
// Supports: ?skill=nanny&location=bungoma&q=grace&page=1&limit=12
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", optionalUser, (req, res) => {
  const { skill, location, q, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ["u.profile_status = 'active'", "u.role = 'worker'"];
  const params = [];

  if (skill) { where.push("wp.skill = ?"); params.push(skill.toLowerCase()); }
  if (location) { where.push("u.location LIKE ?"); params.push(`%${location}%`); }
  if (q) { where.push("(u.full_name LIKE ? OR u.location LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }

  const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

  const rows = db.prepare(`
    SELECT u.id, u.full_name,
      SUBSTR(u.phone,1,4)||' ***'||SUBSTR(u.phone,-3) AS phone,
      u.location, u.profile_status, u.created_at,
      wp.skill, wp.experience, wp.salary_min, wp.salary_max,
      wp.availability, wp.bio, wp.photo_url
    FROM users u
    JOIN worker_profiles wp ON wp.id = u.id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`
    SELECT COUNT(*) as n FROM users u
    JOIN worker_profiles wp ON wp.id = u.id
    ${whereClause}
  `).get(...params).n;

  res.json({
    success: true,
    data: rows.map(formatWorker),
    meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workers/:id
// Get single worker profile. Public.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const row = db.prepare(`
    SELECT u.id, u.full_name,
      SUBSTR(u.phone,1,4)||' ***'||SUBSTR(u.phone,-3) AS phone,
      u.location, u.profile_status, u.created_at,
      wp.skill, wp.experience, wp.salary_min, wp.salary_max,
      wp.availability, wp.bio, wp.photo_url
    FROM users u
    JOIN worker_profiles wp ON wp.id = u.id
    WHERE u.id = ? AND u.role = 'worker'
  `).get(req.params.id);

  if (!row) return res.status(404).json({ success: false, message: "Worker not found." });
  res.json({ success: true, data: formatWorker(row) });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workers
// Register a new worker (after payment submission)
// Accepts multipart/form-data for photo upload
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", upload.single("photo"), validateWorker, (req, res) => {
  const {
    full_name, phone, id_number, location,
    skill, experience, salary_min, salary_max,
    availability, bio, payment_id,
  } = req.body;

  // Verify the payment exists and is not already used
  const payment = db.prepare("SELECT id, status FROM payments WHERE id = ?").get(payment_id);
  if (!payment) {
    return res.status(400).json({ success: false, message: "Payment not found. Please submit payment first." });
  }
  if (payment.status === "rejected") {
    return res.status(400).json({ success: false, message: "Your payment was rejected. Contact support." });
  }

  // Check this payment isn't already tied to another user
  const taken = db.prepare("SELECT id FROM users WHERE payment_id = ?").get(payment_id);
  if (taken) {
    return res.status(409).json({ success: false, message: "This payment has already been used to register." });
  }

  const id = uuidv4();
  const photo_url = req.file ? `/uploads/photos/${req.file.filename}` : null;

  const register = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, role, full_name, phone, id_number, location, payment_id, profile_status)
      VALUES (?, 'worker', ?, ?, ?, ?, ?, ?)
    `).run(id, full_name, phone, id_number, location, payment_id,
      payment.status === "verified" ? "active" : "pending");

    db.prepare(`
      INSERT INTO worker_profiles (id, skill, experience, salary_min, salary_max, availability, bio, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, skill.toLowerCase(), experience, parseInt(salary_min),
      salary_max ? parseInt(salary_max) : null, availability, bio || null, photo_url);
  });

  register();

  const profileStatus = payment.status === "verified" ? "active" : "pending";

  res.status(201).json({
    success: true,
    message: profileStatus === "active"
      ? "Registration successful! Your profile is now live."
      : "Registration submitted. Your profile will go live once payment is verified (within 2 hours).",
    data: { id, profile_status: profileStatus },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/workers/:id  (Admin or owner)
// Update a worker profile
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", requireAdmin, validateId, (req, res) => {
  const worker = db.prepare("SELECT id FROM users WHERE id = ? AND role='worker'").get(req.params.id);
  if (!worker) return res.status(404).json({ success: false, message: "Worker not found." });

  const { skill, experience, salary_min, salary_max, availability, bio, profile_status } = req.body;

  if (profile_status) {
    db.prepare("UPDATE users SET profile_status=?, updated_at=datetime('now') WHERE id=?")
      .run(profile_status, req.params.id);
  }

  db.prepare(`
    UPDATE worker_profiles SET
      skill = COALESCE(?, skill),
      experience = COALESCE(?, experience),
      salary_min = COALESCE(?, salary_min),
      salary_max = COALESCE(?, salary_max),
      availability = COALESCE(?, availability),
      bio = COALESCE(?, bio)
    WHERE id = ?
  `).run(
    skill?.toLowerCase() || null, experience || null,
    salary_min ? parseInt(salary_min) : null,
    salary_max ? parseInt(salary_max) : null,
    availability || null, bio || null,
    req.params.id
  );

  res.json({ success: true, message: "Worker profile updated." });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/workers/:id  (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", requireAdmin, validateId, (req, res) => {
  const result = db.prepare("DELETE FROM users WHERE id = ? AND role = 'worker'").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "Worker not found." });
  res.json({ success: true, message: "Worker deleted." });
});

module.exports = router;
