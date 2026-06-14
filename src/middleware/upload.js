// src/middleware/upload.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "2");

// Ensure upload directories exist
["photos"].forEach(dir => {
  const full = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOAD_DIR, "photos"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, or WebP images are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

module.exports = upload;
