// src/db/database.js
// SQLite database setup using better-sqlite3 (synchronous, zero-config, file-based)

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || "./data/andy_homecare.db";

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── SCHEMA ─────────────────────────────────────────────────────────────────

db.exec(`
  -- ── Admins ───────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS admins (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,          -- bcrypt hash
    name        TEXT NOT NULL DEFAULT 'Administrator',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ── Payments ─────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS payments (
    id              TEXT PRIMARY KEY,
    mpesa_code      TEXT UNIQUE NOT NULL,   -- e.g. RDE7ABC123
    amount          REAL NOT NULL,
    payment_date    TEXT NOT NULL,          -- date entered by user
    phone           TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','verified','rejected')),
    verified_by     TEXT,                   -- admin id
    verified_at     TEXT,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ── Users (both workers and employers) ───────────────────────────
  CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    role            TEXT NOT NULL CHECK(role IN ('worker','employer')),
    full_name       TEXT NOT NULL,
    phone           TEXT NOT NULL,
    id_number       TEXT,                   -- national ID (workers only)
    location        TEXT NOT NULL,
    payment_id      TEXT REFERENCES payments(id),
    profile_status  TEXT NOT NULL DEFAULT 'pending'
                    CHECK(profile_status IN ('pending','active','suspended')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ── Worker Profiles ───────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS worker_profiles (
    id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    skill         TEXT NOT NULL
                  CHECK(skill IN ('house help','gardener','nanny','cook','driver','security guard')),
    experience    TEXT NOT NULL,
    salary_min    INTEGER NOT NULL,
    salary_max    INTEGER,
    availability  TEXT NOT NULL,
    bio           TEXT,
    photo_url     TEXT
  );

  -- ── Employer Profiles ─────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS employer_profiles (
    id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    help_type     TEXT NOT NULL
                  CHECK(help_type IN ('house help','gardener','nanny','cook','driver','security guard')),
    budget_min    INTEGER NOT NULL,
    budget_max    INTEGER,
    description   TEXT NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1   -- 1=open, 0=filled
  );

  -- ── Contact Requests (worker → employer or vice versa) ────────────
  CREATE TABLE IF NOT EXISTS contact_requests (
    id            TEXT PRIMARY KEY,
    from_user_id  TEXT NOT NULL REFERENCES users(id),
    to_user_id    TEXT NOT NULL REFERENCES users(id),
    message       TEXT,
    status        TEXT NOT NULL DEFAULT 'sent'
                  CHECK(status IN ('sent','seen','responded')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ── Indexes ────────────────────────────────────────────────────────
  CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);
  CREATE INDEX IF NOT EXISTS idx_users_status     ON users(profile_status);
  CREATE INDEX IF NOT EXISTS idx_workers_skill    ON worker_profiles(skill);
  CREATE INDEX IF NOT EXISTS idx_payments_code    ON payments(mpesa_code);
  CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments(status);
`);

console.log("✓ Database initialized:", DB_PATH);

module.exports = db;
