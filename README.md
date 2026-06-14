# Andy Homecare Connect — Backend API

Express.js + SQLite REST API for the Andy Homecare Connect platform serving Bungoma, Kenya.

---

## 🚀 Quick Start

### 1. Clone & install
```bash
cd andy-homecare-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — update passwords, M-Pesa credentials, etc.
```

### 3. Seed database
```bash
npm run db:seed
# Creates the SQLite DB with tables + sample data
```

### 4. Start the server
```bash
npm run dev      # Development (auto-restarts)
npm start        # Production
```

Server runs at: **https://andy-website-i57z.onrender.com/**

---

## 📁 Project Structure

```
andy-homecare-backend/
├── src/
│   ├── server.js              # Express app entry point
│   ├── db/
│   │   ├── database.js        # SQLite schema + initialization
│   │   └── seed.js            # Sample data seeder
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication guards
│   │   ├── upload.js          # Multer photo upload
│   │   └── validate.js        # express-validator chains
│   ├── routes/
│   │   ├── payments.js        # M-Pesa payment submission & verification
│   │   ├── workers.js         # Worker registration, listing, search
│   │   ├── employers.js       # Employer registration, listing, search
│   │   ├── admin.js           # Admin login, dashboard, user management
│   │   └── contacts.js        # Contact/interest requests between users
│   └── utils/
│       └── mpesa.js           # Safaricom Daraja API integration
├── uploads/
│   └── photos/                # Worker profile photos
├── data/
│   └── andy_homecare.db       # SQLite database (auto-created)
├── .env.example
└── package.json
```

---

## 📡 API Reference

All responses follow the shape:
```json
{ "success": true/false, "message": "...", "data": {...} }
```

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server health + info |

---

### Payments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payments` | Public | Submit M-Pesa confirmation |
| GET | `/api/payments/:id` | Public | Check payment status |
| GET | `/api/payments` | Admin | List all payments |
| PATCH | `/api/payments/:id/verify` | Admin | Verify payment |
| PATCH | `/api/payments/:id/reject` | Admin | Reject payment |

**Submit payment (POST /api/payments):**
```json
{
  "mpesa_code": "RDE7ABC1234",
  "amount": 500,
  "payment_date": "2025-06-10",
  "phone": "0712345678"
}
```
Response includes `payment_id` to use in worker/employer registration.

---

### Workers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workers` | Public | List active workers |
| GET | `/api/workers/:id` | Public | Get worker profile |
| POST | `/api/workers` | Public | Register new worker |
| PUT | `/api/workers/:id` | Admin | Update worker |
| DELETE | `/api/workers/:id` | Admin | Delete worker |

**Query params for GET /api/workers:**
- `skill` — house help, gardener, nanny, cook, driver, security guard
- `location` — partial match, e.g. `Bungoma`
- `q` — search name or location
- `page`, `limit` — pagination (default: page=1, limit=12)

**Register worker (POST /api/workers)** — `multipart/form-data`:
```
full_name, phone, id_number, location,
skill, experience, salary_min, salary_max (optional),
availability, bio (optional), payment_id,
photo (file, optional)
```

---

### Employers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/employers` | Public | List active job listings |
| GET | `/api/employers/:id` | Public | Get employer profile |
| POST | `/api/employers` | Public | Register new employer |
| PUT | `/api/employers/:id` | Admin | Update employer |
| DELETE | `/api/employers/:id` | Admin | Delete employer |

**Register employer (POST /api/employers):**
```json
{
  "full_name": "Dr. Amina Hassan",
  "phone": "0712345678",
  "location": "Bungoma Town",
  "help_type": "house help",
  "budget_min": 10000,
  "budget_max": 15000,
  "description": "Looking for a reliable house help...",
  "payment_id": "uuid-from-payment-step"
}
```

---

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/login` | Public | Admin login → JWT |
| GET | `/api/admin/dashboard` | Admin | KPI stats + recent registrations |
| GET | `/api/admin/users` | Admin | List all users (filterable) |
| PATCH | `/api/admin/users/:id/status` | Admin | Change user status |
| DELETE | `/api/admin/users/:id` | Admin | Delete user |
| POST | `/api/admin/change-password` | Admin | Change admin password |

**Admin login:**
```json
{ "email": "admin@andyhomecare.co.ke", "password": "AdminSecure2025!" }
```
Returns `token` — include as `Authorization: Bearer <token>` on all admin requests.

**Filter users:** `?role=worker&status=pending&q=grace&page=1`

---

### Contacts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/contacts` | User JWT | Send contact request |
| GET | `/api/contacts/received` | User JWT | View received requests |
| PATCH | `/api/contacts/:id/seen` | User JWT | Mark seen + get phone |

---

## 🔐 Authentication

**Admin JWT** — obtained from `POST /api/admin/login`. Valid 12 hours.

**User JWT** — for future self-service login (not yet in v1, users are managed by admin). Add a `POST /api/users/login` route when implementing user auth.

---

## 💳 M-Pesa Integration

The `src/utils/mpesa.js` module wraps the Safaricom Daraja API.

**To go live:**
1. Register at https://developer.safaricom.co.ke
2. Create an app and get Consumer Key + Secret
3. Add credentials to `.env`
4. Change `MPESA_ENVIRONMENT=production`
5. Change `MPESA_BASE_URL=https://api.safaricom.co.ke`
6. Set `MPESA_SHORTCODE=542542`

In sandbox mode (default), all payment verifications are simulated as successful.

---

## 🗄️ Database

SQLite via `better-sqlite3`. Tables:
- `admins` — admin accounts
- `payments` — M-Pesa submissions
- `users` — all registered users (workers + employers)
- `worker_profiles` — worker-specific details
- `employer_profiles` — employer-specific details  
- `contact_requests` — interest/contact between users

**Reset & re-seed:**
```bash
rm data/andy_homecare.db
npm run db:seed
```

---

## 🌐 Deploying to Production

Recommended: **Railway**, **Render**, or a Kenyan VPS.

```bash
# Set NODE_ENV in production
NODE_ENV=production npm start
```

For a larger scale, swap SQLite for **PostgreSQL** (`pg` + `knex` or `prisma`).

---

## 📞 Support

- Email: chapchap.bungoma@gmail.com  
- Phone: 0706 791 121
