// src/db/seed.js
// Run with: node src/db/seed.js

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db = require("./database");

console.log("🌱 Seeding database...");

// ── Admin ─────────────────────────────────────────────────────────────────────
const adminPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "AdminSecure2025!", 10);
const adminId = uuidv4();

const insertAdmin = db.prepare(`
  INSERT OR REPLACE INTO admins (id, email, password, name)
  VALUES (?, ?, ?, ?)
`);
insertAdmin.run(adminId, process.env.ADMIN_EMAIL || "admin@andyhomecare.co.ke", adminPassword, "Andy Admin");
console.log("  ✓ Admin account created");

// ── Sample Payments ───────────────────────────────────────────────────────────
const payments = [
  { id: uuidv4(), mpesa_code: "RDE7ABC001", amount: 500, payment_date: "2025-06-01", phone: "0712000001", status: "verified" },
  { id: uuidv4(), mpesa_code: "RDE7ABC002", amount: 500, payment_date: "2025-06-02", phone: "0733000002", status: "verified" },
  { id: uuidv4(), mpesa_code: "RDE7ABC003", amount: 500, payment_date: "2025-06-08", phone: "0745000003", status: "pending" },
  { id: uuidv4(), mpesa_code: "RDE7ABC004", amount: 500, payment_date: "2025-06-03", phone: "0700000004", status: "verified" },
  { id: uuidv4(), mpesa_code: "RDE7ABC005", amount: 500, payment_date: "2025-06-09", phone: "0711000005", status: "pending" },
  { id: uuidv4(), mpesa_code: "RDE7ABC006", amount: 500, payment_date: "2025-06-04", phone: "0722000006", status: "verified" },
];

const insertPayment = db.prepare(`
  INSERT OR IGNORE INTO payments (id, mpesa_code, amount, payment_date, phone, status)
  VALUES (@id, @mpesa_code, @amount, @payment_date, @phone, @status)
`);
payments.forEach(p => insertPayment.run(p));
console.log(`  ✓ ${payments.length} payments seeded`);

// ── Sample Users + Profiles ───────────────────────────────────────────────────
const workers = [
  {
    user: { id: uuidv4(), role: "worker", full_name: "Grace Wanjiru", phone: "0712000001", id_number: "12345678", location: "Bungoma Town", payment_id: payments[0].id, profile_status: "active" },
    profile: { skill: "house help", experience: "3 years", salary_min: 10000, salary_max: 14000, availability: "Mon–Sat, Full Day", bio: "Experienced and reliable house help. Excellent references available." },
  },
  {
    user: { id: uuidv4(), role: "worker", full_name: "Joseph Simiyu", phone: "0733000002", id_number: "23456789", location: "Musikoma", payment_id: payments[1].id, profile_status: "active" },
    profile: { skill: "gardener", experience: "5 years", salary_min: 8000, salary_max: 11000, availability: "Mon–Fri, Morning", bio: "Skilled gardener specializing in landscaping and fruit tree maintenance." },
  },
  {
    user: { id: uuidv4(), role: "worker", full_name: "Esther Nekesa", phone: "0745000003", id_number: "34567890", location: "Webuye", payment_id: payments[2].id, profile_status: "pending" },
    profile: { skill: "house help", experience: "1 year", salary_min: 7000, salary_max: 9000, availability: "Flexible", bio: "Hardworking and eager to learn. Available immediately." },
  },
  {
    user: { id: uuidv4(), role: "worker", full_name: "Mary Nafula", phone: "0756000006", id_number: "45678901", location: "Kanduyi", payment_id: payments[5].id, profile_status: "active" },
    profile: { skill: "nanny", experience: "2 years", salary_min: 12000, salary_max: 16000, availability: "Mon–Sun, Full Day", bio: "Caring nanny with pediatric first aid certification." },
  },
];

const employers = [
  {
    user: { id: uuidv4(), role: "employer", full_name: "Dr. Amina Hassan", phone: "0700000004", location: "Bungoma Town", payment_id: payments[3].id, profile_status: "active" },
    profile: { help_type: "house help", budget_min: 10000, budget_max: 15000, description: "Looking for a reliable house help for a family of 4. Own residence, meals provided. Must be honest and hardworking.", is_active: 1 },
  },
  {
    user: { id: uuidv4(), role: "employer", full_name: "Rose Wanyonyi", phone: "0711000005", location: "Kanduyi", payment_id: payments[4].id, profile_status: "pending" },
    profile: { help_type: "cook", budget_min: 14000, budget_max: 20000, description: "Family cook needed. Must know how to prepare both local and continental dishes. 5-day work week.", is_active: 1 },
  },
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, role, full_name, phone, id_number, location, payment_id, profile_status)
  VALUES (@id, @role, @full_name, @phone, @id_number, @location, @payment_id, @profile_status)
`);
const insertWorker = db.prepare(`
  INSERT OR IGNORE INTO worker_profiles (id, skill, experience, salary_min, salary_max, availability, bio)
  VALUES (@id, @skill, @experience, @salary_min, @salary_max, @availability, @bio)
`);
const insertEmployer = db.prepare(`
  INSERT OR IGNORE INTO employer_profiles (id, help_type, budget_min, budget_max, description, is_active)
  VALUES (@id, @help_type, @budget_min, @budget_max, @description, @is_active)
`);

const seedAll = db.transaction(() => {
  workers.forEach(({ user, profile }) => {
    insertUser.run(user);
    insertWorker.run({ id: user.id, ...profile });
  });
  employers.forEach(({ user, profile }) => {
    const u = { ...user, id_number: null };
    insertUser.run(u);
    insertEmployer.run({ id: u.id, ...profile });
  });
});

seedAll();
console.log(`  ✓ ${workers.length} workers seeded`);
console.log(`  ✓ ${employers.length} employers seeded`);
console.log("\n✅ Seed complete!");
console.log(`\nAdmin login:\n  Email:    ${process.env.ADMIN_EMAIL || "admin@andyhomecare.co.ke"}\n  Password: ${process.env.ADMIN_PASSWORD || "AdminSecure2025!"}`);
