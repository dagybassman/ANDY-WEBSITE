// src/middleware/auth.js

const jwt = require("jsonwebtoken");

/**
 * Protect routes that require a logged-in user (worker or employer).
 * Expects: Authorization: Bearer <token>
 */
const requireUser = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided. Please log in." });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, full_name }
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token invalid or expired." });
  }
};

/**
 * Protect admin-only routes.
 * Expects: Authorization: Bearer <admin_token>
 */
const requireAdmin = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Admin token required." });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Admin token invalid or expired." });
  }
};

/**
 * Optional auth — attaches user to req if token present, but doesn't block.
 */
const optionalUser = (req, res, next) => {
  const header = req.headers["authorization"];
  if (header && header.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    } catch {
      // ignore invalid tokens in optional mode
    }
  }
  next();
};

module.exports = { requireUser, requireAdmin, optionalUser };
