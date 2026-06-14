// src/server.js
// Andy Homecare Connect — Express API Server

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

// ── Initialize DB on startup ──────────────────────────────────────────────────
require("./db/database");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow photo serving
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const origins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",").map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origins.includes(origin)) cb(null, true);
    else cb(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ── Request parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // max 10 registrations per IP per hour
  message: { success: false, message: "Too many registrations from this device. Try again later." },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many admin requests. Slow down." },
});

app.use(globalLimiter);

// ── Static file serving (uploaded photos) ────────────────────────────────────
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
app.use("/uploads", express.static(uploadDir, { maxAge: "7d" }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "Andy Homecare Connect API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    support: {
      email: process.env.SUPPORT_EMAIL || "chapchap.bungoma@gmail.com",
      phone: process.env.SUPPORT_PHONE || "0706791121",
    },
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/payments",  require("./routes/payments"));
app.use("/api/workers",   registrationLimiter, require("./routes/workers"));
app.use("/api/employers", registrationLimiter, require("./routes/employers"));
app.use("/api/admin",     adminLimiter, require("./routes/admin"));
app.use("/api/contacts",  require("./routes/contacts"));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found.`,
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message);

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 2}MB.`,
    });
  }

  // CORS error
  if (err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({ success: false, message: err.message });
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again or contact support."
      : err.message,
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏠 Andy Homecare Connect API`);
  console.log(`   Running on  http://localhost:${PORT}`);
  console.log(`   Health:     http://localhost:${PORT}/health`);
  console.log(`   Env:        ${process.env.NODE_ENV || "development"}`);
  console.log(`   DB:         ${process.env.DB_PATH || "./data/andy_homecare.db"}`);
  console.log(`\n   Support: ${process.env.SUPPORT_EMAIL} · ${process.env.SUPPORT_PHONE}\n`);
});

module.exports = app;
