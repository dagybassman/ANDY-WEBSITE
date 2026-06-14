// src/routes/payments.js

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db/database");
const { requireAdmin } = require("../middleware/auth");
const { validatePayment, validateId } = require("../middleware/validate");
const { verifyTransaction } = require("../utils/mpesa");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments
// Submit a new M-Pesa payment for verification
// Public — called before registration is complete
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", validatePayment, (req, res) => {
  const { mpesa_code, amount, payment_date, phone } = req.body;

  // Check for duplicate code
  const existing = db.prepare("SELECT id, status FROM payments WHERE mpesa_code = ?").get(mpesa_code.toUpperCase());
  if (existing) {
    if (existing.status === "verified") {
      return res.status(409).json({
        success: false,
        message: "This M-Pesa code has already been used for a registration.",
      });
    }
    if (existing.status === "rejected") {
      return res.status(409).json({
        success: false,
        message: "This M-Pesa code was rejected. Please contact support.",
      });
    }
    // Pending — return the existing payment so user can continue
    return res.status(200).json({
      success: true,
      message: "Payment already submitted. Awaiting verification.",
      data: { payment_id: existing.id, status: existing.status },
    });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO payments (id, mpesa_code, amount, payment_date, phone, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(id, mpesa_code.toUpperCase(), amount, payment_date, phone || null);

  return res.status(201).json({
    success: true,
    message: "Payment submitted. Proceed to complete your profile — our team will verify within 2 hours.",
    data: { payment_id: id, status: "pending" },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/:id
// Check status of a payment (polled by frontend)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const payment = db.prepare(
    "SELECT id, mpesa_code, amount, payment_date, status, created_at FROM payments WHERE id = ?"
  ).get(req.params.id);

  if (!payment) {
    return res.status(404).json({ success: false, message: "Payment not found." });
  }

  res.json({ success: true, data: payment });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments  (Admin)
// List all payments with optional status filter
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireAdmin, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT p.*, u.full_name, u.role
    FROM payments p
    LEFT JOIN users u ON u.payment_id = p.id
  `;
  const params = [];

  if (status) {
    query += " WHERE p.status = ?";
    params.push(status);
  }

  query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), offset);

  const payments = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as n FROM payments${status ? " WHERE status=?" : ""}`).get(...(status ? [status] : [])).n;

  res.json({ success: true, data: payments, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/payments/:id/verify  (Admin)
// Verify a payment (with optional M-Pesa API cross-check)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/verify", requireAdmin, async (req, res) => {
  const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
  if (!payment) return res.status(404).json({ success: false, message: "Payment not found." });
  if (payment.status === "verified") return res.json({ success: true, message: "Already verified.", data: payment });

  // Optional: cross-check with Safaricom API
  let mpesaCheck = null;
  if (req.body.check_mpesa) {
    mpesaCheck = await verifyTransaction(payment.mpesa_code);
    if (!mpesaCheck.verified && !mpesaCheck.simulated) {
      return res.status(400).json({
        success: false,
        message: "M-Pesa API could not confirm this transaction.",
        mpesa: mpesaCheck,
      });
    }
  }

  db.prepare(`
    UPDATE payments SET status='verified', verified_by=?, verified_at=datetime('now'), notes=?
    WHERE id=?
  `).run(req.admin.id, req.body.notes || null, req.params.id);

  // Also activate the user's profile if they've registered
  db.prepare(`
    UPDATE users SET profile_status='active', updated_at=datetime('now')
    WHERE payment_id=? AND profile_status='pending'
  `).run(req.params.id);

  res.json({ success: true, message: "Payment verified and user profile activated.", mpesa: mpesaCheck });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/payments/:id/reject  (Admin)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/reject", requireAdmin, (req, res) => {
  const payment = db.prepare("SELECT id FROM payments WHERE id = ?").get(req.params.id);
  if (!payment) return res.status(404).json({ success: false, message: "Payment not found." });

  db.prepare(`
    UPDATE payments SET status='rejected', verified_by=?, verified_at=datetime('now'), notes=?
    WHERE id=?
  `).run(req.admin.id, req.body.reason || "Rejected by admin", req.params.id);

  res.json({ success: true, message: "Payment rejected." });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/mpesa/callback
// Safaricom async callback (for future STK push integration)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/mpesa/callback", (req, res) => {
  const { Body } = req.body;
  console.log("M-Pesa callback received:", JSON.stringify(Body, null, 2));
  // Handle STK push result here when implemented
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

module.exports = router;
