// src/middleware/validate.js
// Shared validation chains using express-validator

const { body, param, query, validationResult } = require("express-validator");

/**
 * Run after validation chains — returns 422 with errors if any failed.
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Payment submission ────────────────────────────────────────────────────────
const validatePayment = [
  body("mpesa_code")
    .trim()
    .notEmpty().withMessage("M-Pesa confirmation code is required")
    .matches(/^[A-Z0-9]{10,14}$/i).withMessage("Enter a valid M-Pesa code (e.g. RDE7ABC1234)"),
  body("amount")
    .isFloat({ min: 1 }).withMessage("Amount must be a positive number"),
  body("payment_date")
    .isDate().withMessage("Enter a valid payment date (YYYY-MM-DD)"),
  body("phone")
    .optional()
    .matches(/^(07|01)\d{8}$/).withMessage("Enter a valid Kenyan phone number (07XXXXXXXX)"),
  handleValidation,
];

// ── Worker registration ───────────────────────────────────────────────────────
const SKILLS = ["house help", "gardener", "nanny", "cook", "driver", "security guard"];

const validateWorker = [
  body("full_name").trim().notEmpty().withMessage("Full name is required"),
  body("phone").matches(/^(07|01)\d{8}$/).withMessage("Enter a valid phone number"),
  body("id_number").trim().notEmpty().withMessage("ID number is required"),
  body("location").trim().notEmpty().withMessage("Location is required"),
  body("skill").isIn(SKILLS).withMessage(`Skill must be one of: ${SKILLS.join(", ")}`),
  body("experience").trim().notEmpty().withMessage("Experience is required"),
  body("salary_min").isInt({ min: 1 }).withMessage("Minimum salary is required"),
  body("availability").trim().notEmpty().withMessage("Availability is required"),
  body("payment_id").trim().notEmpty().withMessage("Payment reference is required"),
  handleValidation,
];

// ── Employer registration ─────────────────────────────────────────────────────
const validateEmployer = [
  body("full_name").trim().notEmpty().withMessage("Full name is required"),
  body("phone").matches(/^(07|01)\d{8}$/).withMessage("Enter a valid phone number"),
  body("location").trim().notEmpty().withMessage("Location is required"),
  body("help_type").isIn(SKILLS).withMessage(`Help type must be one of: ${SKILLS.join(", ")}`),
  body("budget_min").isInt({ min: 1 }).withMessage("Budget minimum is required"),
  body("description").trim().isLength({ min: 20 }).withMessage("Please describe the job in at least 20 characters"),
  body("payment_id").trim().notEmpty().withMessage("Payment reference is required"),
  handleValidation,
];

// ── Admin login ───────────────────────────────────────────────────────────────
const validateAdminLogin = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
  handleValidation,
];

// ── UUID param ────────────────────────────────────────────────────────────────
const validateId = [
  param("id").isUUID().withMessage("Invalid ID format"),
  handleValidation,
];

module.exports = {
  validatePayment,
  validateWorker,
  validateEmployer,
  validateAdminLogin,
  validateId,
  handleValidation,
};
