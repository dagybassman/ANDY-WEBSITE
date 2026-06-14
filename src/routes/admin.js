// src/routes/admin.js

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");
const { requireAdmin } = require("../middleware/auth");
const { validateAdminLogin } = require("../middleware/validate");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/login
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", validateAdminLogin, (req, res) => {
  const { email, password } = req.body;

  const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(email.toLowerCase());
  if (!admin) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }

  const valid = bcrypt.compareSync(password, admin.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, role: "admin" },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    success: true,
    message: "Login successful.",
    data: { token, name: admin.name, email: admin.email },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
// Summary stats for the admin panel
// ─────────────────────────────────────────────────────────────────────────────
router.get("/dashboard", requireAdmin, (req, res) => {
  const stats = {
    workers: {
      total:   db.prepare("SELECT COUNT(*) as n FROM users WHERE role='worker'").get().n,
      active:  db.prepare("SELECT COUNT(*) as n FROM users WHERE role='worker' AND profile_status='active'").get().n,
      pending: db.prepare("SELECT COUNT(*) as n FROM users WHERE role='worker' AND profile_status='pending'").get().n,
    },
    employers: {
      total:   db.prepare("SELECT COUNT(*) as n FROM users WHERE role='employer'").get().n,
      active:  db.prepare("SELECT COUNT(*) as n FROM users WHERE role='employer' AND profile_status='active'").get().n,
      pending: db.prepare("SELECT COUNT(*) as n FROM users WHERE role='employer' AND profile_status='pending'").get().n,
    },
    payments: {
      total:    db.prepare("SELECT COUNT(*) as n FROM payments").get().n,
      verified: db.prepare("SELECT COUNT(*) as n FROM payments WHERE status='verified'").get().n,
      pending:  db.prepare("SELECT COUNT(*) as n FROM payments WHERE status='pending'").get().n,
      rejected: db.prepare("SELECT COUNT(*) as n FROM payments WHERE status='rejected'").get().n,
      revenue:  db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status='verified'").get().s,
    },
  };

  const recent = db.prepare(`
    SELECT u.id, u.full_name, u.role, u.profile_status, u.created_at,
      p.mpesa_code, p.amount, p.status AS payment_status
    FROM users u
    LEFT JOIN payments p ON p.id = u.payment_id
    ORDER BY u.created_at DESC LIMIT 10
  `).all();

  res.json({ success: true, data: { stats, recent } });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// List all users (workers + employers) with filters
// ─────────────────────────────────────────────────────────────────────────────
router.get("/users", requireAdmin, (req, res) => {
  const { role, status, q, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = [];
  const params = [];

  if (role)   { where.push("u.role = ?"); params.push(role); }
  if (status) { where.push("u.profile_status = ?"); params.push(status); }
  if (q)      { where.push("(u.full_name LIKE ? OR u.phone LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }

  const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

  const users = db.prepare(`
    SELECT u.id, u.full_name, u.role, u.phone, u.location, u.id_number,
           u.profile_status, u.created_at,
           p.mpesa_code, p.amount, p.payment_date, p.status AS payment_status,
           COALESCE(wp.skill, ep.help_type) AS category
    FROM users u
    LEFT JOIN payments p ON p.id = u.payment_id
    LEFT JOIN worker_profiles wp ON wp.id = u.id
    LEFT JOIN employer_profiles ep ON ep.id = u.id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as n FROM users u ${whereClause}`)
    .get(...params).n;

  res.json({
    success: true,
    data: users,
    meta: { total, page: parseInt(page), limit: parseInt(limit) },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/status
// Change a user's profile status
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/users/:id/status", requireAdmin, (req, res) => {
  const { status } = req.body;
  const allowed = ["active", "pending", "suspended"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(", ")}` });
  }

  const result = db.prepare(
    "UPDATE users SET profile_status=?, updated_at=datetime('now') WHERE id=?"
  ).run(status, req.params.id);

  if (result.changes === 0) return res.status(404).json({ success: false, message: "User not found." });
  res.json({ success: true, message: `User status updated to '${status}'.` });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id
// Hard delete a user and their profile
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/users/:id", requireAdmin, (req, res) => {
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, message: "User not found." });
  res.json({ success: true, message: "User deleted." });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/change-password
// ─────────────────────────────────────────────────────────────────────────────
router.post("/change-password", requireAdmin, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: "Both current and new password are required." });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
  }

  const admin = db.prepare("SELECT * FROM admins WHERE id = ?").get(req.admin.id);
  if (!bcrypt.compareSync(current_password, admin.password)) {
    return res.status(401).json({ success: false, message: "Current password is incorrect." });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare("UPDATE admins SET password = ? WHERE id = ?").run(hash, req.admin.id);
  res.json({ success: true, message: "Password changed successfully." });
});

module.exports = router;
