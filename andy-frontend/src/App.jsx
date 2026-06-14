import { useState, useEffect, useCallback, useRef } from "react";

// ─── API CONFIG ────────────────────────────────────────────────────────────────
// Change this to your deployed backend URL in production
const API_BASE = "http://localhost:5000/api";

const api = {
  get: async (path, token = null) => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.json();
  },
  post: async (path, body, token = null, isFormData = false) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!isFormData) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
    return res.json();
  },
  patch: async (path, body, token) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  del: async (path, token) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
};

// ─── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --sienna:#C1581F; --sienna-d:#9B4118;
    --green:#2D5E3A;  --green-l:#3E7A4F;
    --cream:#FAF6F0;  --sand:#EDE3D5;
    --charcoal:#1E2A22; --mid:#6B7C73;
    --white:#FFFFFF;  --error:#B91C1C; --success:#15803D;
    --radius:10px;    --shadow:0 2px 16px rgba(30,42,34,.10);
  }
  body { font-family:'Inter',sans-serif; background:var(--cream); color:var(--charcoal); min-height:100vh; }
  .app-shell { display:flex; flex-direction:column; min-height:100vh; }

  /* NAV */
  nav { background:var(--green); padding:0 24px; display:flex; align-items:center; justify-content:space-between; height:64px; position:sticky; top:0; z-index:100; box-shadow:0 2px 12px rgba(0,0,0,.18); }
  .nav-brand { display:flex; align-items:center; gap:10px; font-family:'Lora',serif; font-size:1.25rem; font-weight:700; color:var(--cream); cursor:pointer; }
  .nav-brand span { color:#F4B942; }
  .nav-links { display:flex; gap:6px; }
  .nav-btn { background:none; border:none; color:rgba(250,246,240,.75); font-size:.875rem; font-weight:500; padding:8px 14px; border-radius:6px; cursor:pointer; transition:all .2s; }
  .nav-btn:hover, .nav-btn.active { background:rgba(255,255,255,.12); color:var(--cream); }
  .nav-btn.cta { background:var(--sienna); color:var(--white); padding:8px 18px; }
  .nav-btn.cta:hover { background:var(--sienna-d); }

  /* HERO */
  .hero { background:linear-gradient(135deg,var(--green) 0%,var(--green-l) 50%,#4A7A3A 100%); padding:72px 24px 80px; text-align:center; position:relative; overflow:hidden; }
  .hero::before { content:''; position:absolute; inset:0; background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E"); }
  .hero-eyebrow { display:inline-block; background:rgba(241,185,66,.2); color:#F4B942; font-size:.75rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; padding:5px 14px; border-radius:20px; margin-bottom:20px; }
  .hero h1 { font-family:'Lora',serif; font-size:clamp(2rem,5vw,3.25rem); font-weight:700; color:var(--white); line-height:1.15; margin-bottom:18px; }
  .hero h1 em { color:#F4B942; font-style:normal; }
  .hero p { font-size:1.1rem; color:rgba(250,246,240,.8); max-width:560px; margin:0 auto 36px; line-height:1.65; }
  .hero-btns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
  .btn-primary { background:var(--sienna); color:var(--white); border:none; padding:14px 30px; border-radius:var(--radius); font-size:1rem; font-weight:600; cursor:pointer; transition:all .2s; box-shadow:0 4px 14px rgba(193,88,31,.35); }
  .btn-primary:hover { background:var(--sienna-d); transform:translateY(-1px); }
  .btn-outline { background:rgba(255,255,255,.1); color:var(--white); border:1.5px solid rgba(255,255,255,.4); padding:14px 30px; border-radius:var(--radius); font-size:1rem; font-weight:500; cursor:pointer; transition:all .2s; }
  .btn-outline:hover { background:rgba(255,255,255,.2); }

  /* STATS */
  .stats-bar { background:var(--white); border-bottom:1px solid var(--sand); padding:18px 24px; display:flex; justify-content:center; gap:48px; flex-wrap:wrap; }
  .stat { text-align:center; }
  .stat-num { font-family:'Lora',serif; font-size:1.6rem; font-weight:700; color:var(--green); }
  .stat-label { font-size:.75rem; color:var(--mid); text-transform:uppercase; letter-spacing:.08em; }

  /* SECTION */
  .section { padding:60px 24px; max-width:1100px; margin:0 auto; }
  .section-title { font-family:'Lora',serif; font-size:1.75rem; font-weight:700; color:var(--charcoal); margin-bottom:6px; }
  .section-sub { color:var(--mid); margin-bottom:36px; font-size:.95rem; }

  /* CARDS */
  .card-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:22px; }
  .worker-card { background:var(--white); border-radius:var(--radius); border:1.5px solid var(--sand); overflow:hidden; box-shadow:var(--shadow); transition:transform .2s,box-shadow .2s; position:relative; }
  .worker-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; background:linear-gradient(90deg,var(--sienna),var(--green)); }
  .worker-card:hover { transform:translateY(-3px); box-shadow:0 8px 28px rgba(30,42,34,.14); }
  .card-avatar { border-radius:50%; background:linear-gradient(135deg,var(--green),var(--sienna)); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--white); border:3px solid var(--sand); flex-shrink:0; }
  .card-photo { border-radius:50%; object-fit:cover; border:3px solid var(--sand); }
  .card-body { padding:20px; }
  .card-top { display:flex; gap:14px; align-items:flex-start; margin-bottom:14px; }
  .card-info h3 { font-size:1.05rem; font-weight:600; color:var(--charcoal); }
  .card-info p { font-size:.8rem; color:var(--mid); margin-top:2px; }
  .badge { display:inline-block; background:var(--sand); color:var(--green); font-size:.7rem; font-weight:600; padding:3px 10px; border-radius:20px; text-transform:capitalize; margin:2px 3px 2px 0; }
  .card-meta { font-size:.82rem; color:var(--mid); margin-top:10px; }
  .card-salary { font-family:'Lora',serif; font-size:1rem; font-weight:700; color:var(--green); margin-top:8px; }
  .card-actions { padding:14px 20px 18px; border-top:1px solid var(--sand); display:flex; gap:10px; }

  /* FORMS */
  .form-page { max-width:620px; margin:0 auto; padding:48px 24px; }
  .form-card { background:var(--white); border-radius:var(--radius); border:1.5px solid var(--sand); box-shadow:var(--shadow); padding:36px; }
  .form-title { font-family:'Lora',serif; font-size:1.5rem; font-weight:700; color:var(--charcoal); margin-bottom:4px; }
  .form-subtitle { color:var(--mid); font-size:.9rem; margin-bottom:28px; }
  .form-group { margin-bottom:20px; }
  label { display:block; font-size:.85rem; font-weight:500; color:var(--charcoal); margin-bottom:6px; }
  input,select,textarea { width:100%; padding:11px 14px; border:1.5px solid var(--sand); border-radius:8px; font-size:.95rem; font-family:'Inter',sans-serif; background:var(--cream); color:var(--charcoal); transition:border-color .2s,box-shadow .2s; outline:none; }
  input:focus,select:focus,textarea:focus { border-color:var(--green); box-shadow:0 0 0 3px rgba(45,94,58,.12); background:var(--white); }
  textarea { resize:vertical; min-height:90px; }
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .form-hint { font-size:.78rem; color:var(--mid); margin-top:4px; }
  .form-error { font-size:.8rem; color:var(--error); margin-top:4px; }
  .btn-full { width:100%; padding:13px; background:var(--green); color:var(--white); border:none; border-radius:var(--radius); font-size:1rem; font-weight:600; cursor:pointer; transition:background .2s; margin-top:8px; }
  .btn-full:hover { background:var(--green-l); }
  .btn-full:disabled { opacity:.55; cursor:not-allowed; }
  .btn-full.sienna { background:var(--sienna); }
  .btn-full.sienna:hover { background:var(--sienna-d); }

  /* PAYMENT BOX */
  .payment-box { background:linear-gradient(135deg,#1A3A24,#2D5E3A); border-radius:var(--radius); padding:28px; color:var(--white); margin-bottom:28px; border:1.5px solid rgba(255,255,255,.1); }
  .payment-box h3 { font-family:'Lora',serif; font-size:1.15rem; margin-bottom:14px; color:#F4B942; }
  .payment-detail { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.1); font-size:.9rem; }
  .payment-detail:last-child { border-bottom:none; }
  .payment-detail .val { font-weight:700; color:#F4B942; font-size:1rem; }
  .amount-note { margin-top:16px; background:rgba(244,185,66,.15); border:1px solid rgba(244,185,66,.3); border-radius:8px; padding:12px; font-size:.85rem; }

  /* STEPS */
  .steps { display:flex; gap:0; margin-bottom:32px; }
  .step-item { flex:1; display:flex; flex-direction:column; align-items:center; position:relative; text-align:center; }
  .step-item:not(:last-child)::after { content:''; position:absolute; top:16px; left:50%; width:100%; height:2px; background:var(--sand); z-index:0; }
  .step-num { width:34px; height:34px; border-radius:50%; background:var(--sand); color:var(--mid); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.85rem; z-index:1; position:relative; border:2px solid var(--sand); transition:all .3s; }
  .step-item.done .step-num { background:var(--green); color:var(--white); border-color:var(--green); }
  .step-item.active .step-num { background:var(--sienna); color:var(--white); border-color:var(--sienna); }
  .step-label { font-size:.72rem; color:var(--mid); margin-top:6px; font-weight:500; }
  .step-item.active .step-label { color:var(--sienna); }
  .step-item.done .step-label { color:var(--green); }

  /* ADMIN */
  .admin-grid { display:grid; grid-template-columns:220px 1fr; gap:24px; padding:32px 24px; max-width:1100px; margin:0 auto; }
  .admin-sidebar { background:var(--white); border-radius:var(--radius); border:1.5px solid var(--sand); padding:20px; height:fit-content; }
  .admin-nav-item { display:block; width:100%; text-align:left; background:none; border:none; padding:10px 14px; border-radius:8px; font-size:.9rem; color:var(--charcoal); cursor:pointer; transition:all .2s; margin-bottom:4px; }
  .admin-nav-item:hover,.admin-nav-item.active { background:var(--sand); color:var(--green); font-weight:600; }
  .admin-content { background:var(--white); border-radius:var(--radius); border:1.5px solid var(--sand); padding:28px; }
  .data-table { width:100%; border-collapse:collapse; font-size:.875rem; }
  .data-table th { background:var(--cream); padding:11px 14px; text-align:left; font-weight:600; color:var(--mid); font-size:.78rem; text-transform:uppercase; letter-spacing:.06em; border-bottom:1.5px solid var(--sand); }
  .data-table td { padding:12px 14px; border-bottom:1px solid var(--sand); vertical-align:middle; }
  .data-table tr:hover td { background:#F7F4EF; }
  .status-pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
  .status-pill.pending { background:rgba(245,158,11,.15); color:#B45309; }
  .status-pill.active,.status-pill.verified { background:rgba(21,128,61,.12); color:var(--success); }
  .status-pill.rejected,.status-pill.suspended { background:rgba(185,28,28,.1); color:var(--error); }
  .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
  .kpi { background:var(--cream); border-radius:10px; padding:18px; border:1.5px solid var(--sand); }
  .kpi-num { font-family:'Lora',serif; font-size:1.8rem; font-weight:700; color:var(--green); }
  .kpi-label { font-size:.78rem; color:var(--mid); margin-top:2px; }

  /* MODAL */
  .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:200; display:flex; align-items:center; justify-content:center; padding:24px; }
  .modal { background:var(--white); border-radius:var(--radius); max-width:480px; width:100%; padding:32px; box-shadow:0 20px 60px rgba(0,0,0,.25); max-height:90vh; overflow-y:auto; }
  .modal-title { font-family:'Lora',serif; font-size:1.25rem; font-weight:700; margin-bottom:16px; }
  .modal-close { float:right; background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--mid); margin-top:-4px; }

  /* ALERTS */
  .alert { border-radius:8px; padding:14px 18px; font-size:.9rem; margin-bottom:18px; display:flex; gap:10px; align-items:flex-start; }
  .alert.success { background:rgba(21,128,61,.08); border:1px solid rgba(21,128,61,.25); color:var(--success); }
  .alert.error   { background:rgba(185,28,28,.06); border:1px solid rgba(185,28,28,.2); color:var(--error); }
  .alert.info    { background:rgba(45,94,58,.07); border:1px solid rgba(45,94,58,.2); color:var(--green); }
  .alert.warning { background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.25); color:#92400E; }

  /* SKELETON */
  .skeleton { background:linear-gradient(90deg,var(--sand) 25%,#e5d8c9 50%,var(--sand) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skeleton-card { height:220px; border-radius:var(--radius); }

  /* PAGINATION */
  .pagination { display:flex; gap:8px; justify-content:center; align-items:center; margin-top:32px; flex-wrap:wrap; }
  .page-btn { background:var(--white); border:1.5px solid var(--sand); padding:8px 14px; border-radius:8px; font-size:.875rem; cursor:pointer; transition:all .2s; }
  .page-btn:hover,.page-btn.active { background:var(--green); color:var(--white); border-color:var(--green); }
  .page-btn:disabled { opacity:.4; cursor:not-allowed; }

  /* MISC */
  .page-header { background:var(--white); border-bottom:1.5px solid var(--sand); padding:28px 24px; }
  .page-header h2 { font-family:'Lora',serif; font-size:1.5rem; font-weight:700; }
  .page-header p { color:var(--mid); font-size:.9rem; margin-top:4px; }
  .empty-state { text-align:center; padding:60px 24px; color:var(--mid); }
  .empty-state .icon { font-size:3rem; margin-bottom:12px; }
  .search-bar { display:flex; gap:12px; margin-bottom:28px; flex-wrap:wrap; }
  .search-bar input { flex:1; min-width:200px; }
  .search-bar select { width:180px; }
  .divider { border:none; border-top:1.5px solid var(--sand); margin:24px 0; }
  .text-center { text-align:center; }
  .mt-16 { margin-top:16px; }
  .mt-24 { margin-top:24px; }

  /* SPINNER */
  .spinner { width:36px; height:36px; border:3px solid var(--sand); border-top-color:var(--green); border-radius:50%; animation:spin .7s linear infinite; margin:40px auto; }
  @keyframes spin { to { transform:rotate(360deg); } }

  /* FOOTER */
  footer { background:var(--charcoal); color:rgba(250,246,240,.65); padding:40px 24px 24px; margin-top:auto; }
  .footer-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:32px; max-width:1100px; margin:0 auto 28px; }
  .footer-brand { font-family:'Lora',serif; font-size:1.1rem; font-weight:700; color:var(--cream); margin-bottom:10px; }
  .footer-brand span { color:#F4B942; }
  footer h4 { color:var(--cream); font-size:.85rem; font-weight:600; margin-bottom:12px; text-transform:uppercase; letter-spacing:.08em; }
  footer p,footer a { font-size:.85rem; line-height:1.7; color:rgba(250,246,240,.6); text-decoration:none; }
  footer a:hover { color:#F4B942; }
  .footer-bottom { border-top:1px solid rgba(255,255,255,.08); padding-top:20px; text-align:center; font-size:.8rem; max-width:1100px; margin:0 auto; }

  @media(max-width:640px){
    .form-row { grid-template-columns:1fr; }
    .kpi-row  { grid-template-columns:1fr 1fr; }
    .admin-grid { grid-template-columns:1fr; }
    nav { padding:0 14px; }
    .nav-links .nav-btn:not(.cta) { display:none; }
  }
`;

// ─── HELPERS ───────────────────────────────────────────────────────────────────
const Alert = ({ type = "info", children }) => (
  <div className={`alert ${type}`}>
    <span>{type === "success" ? "✓" : type === "error" ? "✗" : type === "warning" ? "⚠" : "ℹ"}</span>
    <div>{children}</div>
  </div>
);

const Spinner = () => <div className="spinner" />;

const Avatar = ({ name = "", photoUrl = null, size = 62 }) => {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (photoUrl) {
    return <img src={`http://localhost:5000${photoUrl}`} alt={name} className="card-photo" style={{ width: size, height: size }} />;
  }
  return (
    <div className="card-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</div>
  );
};

const StatusPill = ({ status }) => <span className={`status-pill ${status}`}>{status}</span>;
const SkillBadge = ({ skill }) => <span className="badge">{skill}</span>;

const formatSalary = (min, max) =>
  max ? `KES ${Number(min).toLocaleString()} – ${Number(max).toLocaleString()}` : `KES ${Number(min).toLocaleString()}`;

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ─── PAGINATION COMPONENT ──────────────────────────────────────────────────────
const Pagination = ({ page, pages, onPage }) => {
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="page-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>← Prev</button>
      {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
        <button key={p} className={`page-btn ${p === page ? "active" : ""}`} onClick={() => onPage(p)}>{p}</button>
      ))}
      <button className="page-btn" disabled={page === pages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  );
};

// ─── WORKER CARD ───────────────────────────────────────────────────────────────
const WorkerCard = ({ worker }) => {
  const [showContact, setShowContact] = useState(false);
  return (
    <div className="worker-card">
      <div className="card-body">
        <div className="card-top">
          <Avatar name={worker.full_name} photoUrl={worker.photo_url} size={62} />
          <div className="card-info">
            <h3>{worker.full_name}</h3>
            <p>📍 {worker.location}</p>
            <span style={{ fontSize: ".72rem", color: "var(--success)", fontWeight: 600 }}>✓ Verified</span>
          </div>
        </div>
        <SkillBadge skill={worker.skill} />
        <div className="card-meta">
          <span>🕒 {worker.availability}</span><br />
          <span style={{ marginTop: 4, display: "inline-block" }}>💼 {worker.experience}</span>
        </div>
        <div className="card-salary">{formatSalary(worker.salary_min, worker.salary_max)}/mo</div>
      </div>
      <div className="card-actions">
        <button className="btn-primary" style={{ flex: 1, padding: "9px 12px", fontSize: ".85rem" }} onClick={() => setShowContact(true)}>
          Contact
        </button>
      </div>
      {showContact && (
        <div className="modal-backdrop" onClick={() => setShowContact(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowContact(false)}>×</button>
            <p className="modal-title">Contact {worker.full_name}</p>
            <p style={{ fontSize: ".9rem", color: "var(--mid)", marginBottom: 16 }}>Reach out directly to discuss the role and agree on terms.</p>
            <div style={{ background: "var(--cream)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <p style={{ fontWeight: 600 }}>📞 {worker.phone}</p>
              <p style={{ fontSize: ".8rem", color: "var(--mid)", marginTop: 4 }}>Call or WhatsApp</p>
            </div>
            {worker.bio && <p style={{ fontSize: ".85rem", color: "var(--charcoal)", lineHeight: 1.6, marginBottom: 16 }}>{worker.bio}</p>}
            <p style={{ fontSize: ".78rem", color: "var(--mid)" }}>Support: chapchap.bungoma@gmail.com · 0706791121</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── EMPLOYER CARD ─────────────────────────────────────────────────────────────
const EmployerCard = ({ employer }) => {
  const [showContact, setShowContact] = useState(false);
  return (
    <div className="worker-card">
      <div className="card-body">
        <div className="card-top">
          <Avatar name={employer.full_name} size={62} />
          <div className="card-info">
            <h3>{employer.full_name}</h3>
            <p>📍 {employer.location}</p>
            <span style={{ fontSize: ".72rem", color: "var(--success)", fontWeight: 600 }}>✓ Verified</span>
          </div>
        </div>
        <SkillBadge skill={employer.help_type} />
        <div className="card-meta" style={{ marginTop: 10 }}>
          <p style={{ fontSize: ".82rem", color: "var(--charcoal)", lineHeight: 1.5 }}>{employer.description}</p>
        </div>
        <div className="card-salary">{formatSalary(employer.budget_min, employer.budget_max)}</div>
        <div style={{ fontSize: ".75rem", color: "var(--mid)", marginTop: 6 }}>Posted {timeAgo(employer.created_at)}</div>
      </div>
      <div className="card-actions">
        <button className="btn-primary" style={{ flex: 1, padding: "9px 12px", fontSize: ".85rem" }} onClick={() => setShowContact(true)}>
          Apply / Contact
        </button>
      </div>
      {showContact && (
        <div className="modal-backdrop" onClick={() => setShowContact(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowContact(false)}>×</button>
            <p className="modal-title">Contact {employer.full_name}</p>
            <p style={{ fontSize: ".9rem", color: "var(--mid)", marginBottom: 16 }}>Introduce yourself and share your availability and experience.</p>
            <div style={{ background: "var(--cream)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <p style={{ fontWeight: 600 }}>📞 {employer.phone}</p>
              <p style={{ fontSize: ".8rem", color: "var(--mid)", marginTop: 4 }}>Call or WhatsApp</p>
            </div>
            <p style={{ fontSize: ".78rem", color: "var(--mid)" }}>Support: chapchap.bungoma@gmail.com · 0706791121</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PAGE: HOME ────────────────────────────────────────────────────────────────
const HomePage = ({ setPage }) => {
  const [featuredWorkers, setFeaturedWorkers] = useState([]);
  const [stats, setStats] = useState({ workers: "…", employers: "…" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/workers?limit=3"),
      api.get("/employers?limit=1"),
    ]).then(([wRes, eRes]) => {
      if (wRes.success) {
        setFeaturedWorkers(wRes.data);
        setStats({ workers: wRes.meta.total + "+", employers: (eRes.meta?.total || "…") + "+" });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="hero">
        <div className="hero-eyebrow">Serving Bungoma County, Kenya</div>
        <h1>Find Trusted Home<br />Help — <em>Fast.</em></h1>
        <p>Andy Homecare Connect links skilled domestic workers with families across Bungoma. Vetted profiles, transparent rates, and direct contact.</p>
        <div className="hero-btns">
          <button className="btn-primary" onClick={() => setPage("find-workers")}>Find Workers</button>
          <button className="btn-outline" onClick={() => setPage("find-jobs")}>Browse Jobs</button>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat"><div className="stat-num">{stats.workers}</div><div className="stat-label">Registered Workers</div></div>
        <div className="stat"><div className="stat-num">{stats.employers}</div><div className="stat-label">Active Employers</div></div>
        <div className="stat"><div className="stat-num">6</div><div className="stat-label">Service Categories</div></div>
        <div className="stat"><div className="stat-num">Bungoma</div><div className="stat-label">County, Kenya</div></div>
      </div>

      <div className="section">
        <p className="section-title">How It Works</p>
        <p className="section-sub">Get connected in three simple steps</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 24 }}>
          {[
            { n: "01", icon: "💳", title: "Pay Registration", text: "Pay via M-Pesa Paybill 542542, Acc 22703. Workers & employers each pay a one-time fee." },
            { n: "02", icon: "📝", title: "Complete Profile", text: "Fill in your details — skills, experience, location, and availability. Upload a clear photo." },
            { n: "03", icon: "🤝", title: "Get Connected", text: "Employers browse workers. Workers see job listings. Contact each other directly and seal the deal." },
          ].map(s => (
            <div key={s.n} style={{ background: "var(--white)", borderRadius: "var(--radius)", padding: 28, border: "1.5px solid var(--sand)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 12, right: 16, fontFamily: "Lora,serif", fontSize: "2.5rem", fontWeight: 700, color: "var(--sand)", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: "1.8rem", marginBottom: 14 }}>{s.icon}</div>
              <h3 style={{ fontFamily: "Lora,serif", fontSize: "1.05rem", fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: ".875rem", color: "var(--mid)", lineHeight: 1.65 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--sand)", padding: "60px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p className="section-title">Featured Workers</p>
          <p className="section-sub">Browse some of our available domestic workers</p>
          {loading ? (
            <div className="card-grid">{[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" />)}</div>
          ) : (
            <div className="card-grid">{featuredWorkers.map(w => <WorkerCard key={w.id} worker={w} />)}</div>
          )}
          <div className="text-center mt-24">
            <button className="btn-primary" onClick={() => setPage("find-workers")}>View All Workers →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PAGE: FIND WORKERS ────────────────────────────────────────────────────────
const FindWorkersPage = () => {
  const [workers, setWorkers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  const fetchWorkers = useCallback(async (currentPage = 1, currentQ = q, currentSkill = skill) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: currentPage, limit: 12 });
    if (currentQ) params.append("q", currentQ);
    if (currentSkill) params.append("skill", currentSkill);
    const res = await api.get(`/workers?${params}`);
    if (res.success) {
      setWorkers(res.data);
      setMeta(res.meta);
    } else {
      setError("Could not load workers. Is the backend running?");
    }
    setLoading(false);
  }, [q, skill]);

  useEffect(() => { fetchWorkers(1, "", ""); }, []);

  const handleSearch = (newQ, newSkill) => {
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchWorkers(1, newQ, newSkill), 400);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Find Domestic Workers</h2>
        <p>Browse {meta.total} verified workers available in Bungoma County</p>
      </div>
      <div className="section">
        <div className="search-bar">
          <input placeholder="Search by name or location…" value={q} onChange={e => { setQ(e.target.value); handleSearch(e.target.value, skill); }} />
          <select value={skill} onChange={e => { setSkill(e.target.value); handleSearch(q, e.target.value); }}>
            <option value="">All Skills</option>
            {["house help","gardener","nanny","cook","driver","security guard"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
        </div>
        {error && <Alert type="error">{error}</Alert>}
        {loading ? (
          <div className="card-grid">{Array(6).fill(0).map((_,i) => <div key={i} className="skeleton skeleton-card" />)}</div>
        ) : workers.length === 0 ? (
          <div className="empty-state"><div className="icon">🔍</div><p>No workers match your search. Try a different filter.</p></div>
        ) : (
          <>
            <div className="card-grid">{workers.map(w => <WorkerCard key={w.id} worker={w} />)}</div>
            <Pagination page={meta.page} pages={meta.pages} onPage={p => { setPage(p); fetchWorkers(p); }} />
          </>
        )}
      </div>
    </div>
  );
};

// ─── PAGE: FIND JOBS ───────────────────────────────────────────────────────────
const FindJobsPage = () => {
  const [employers, setEmployers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  const fetchEmployers = useCallback(async (currentPage = 1, currentQ = q, currentType = type) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: currentPage, limit: 12 });
    if (currentQ) params.append("q", currentQ);
    if (currentType) params.append("help_type", currentType);
    const res = await api.get(`/employers?${params}`);
    if (res.success) {
      setEmployers(res.data);
      setMeta(res.meta);
    } else {
      setError("Could not load job listings. Is the backend running?");
    }
    setLoading(false);
  }, [q, type]);

  useEffect(() => { fetchEmployers(1, "", ""); }, []);

  const handleSearch = (newQ, newType) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEmployers(1, newQ, newType), 400);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Browse Job Listings</h2>
        <p>{meta.total} employers looking for domestic workers in Bungoma County</p>
      </div>
      <div className="section">
        <div className="search-bar">
          <input placeholder="Search by name or location…" value={q} onChange={e => { setQ(e.target.value); handleSearch(e.target.value, type); }} />
          <select value={type} onChange={e => { setType(e.target.value); handleSearch(q, e.target.value); }}>
            <option value="">All Types</option>
            {["house help","gardener","nanny","cook","driver","security guard"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
        </div>
        {error && <Alert type="error">{error}</Alert>}
        {loading ? (
          <div className="card-grid">{Array(6).fill(0).map((_,i) => <div key={i} className="skeleton skeleton-card" />)}</div>
        ) : employers.length === 0 ? (
          <div className="empty-state"><div className="icon">📋</div><p>No jobs match your search.</p></div>
        ) : (
          <>
            <div className="card-grid">{employers.map(e => <EmployerCard key={e.id} employer={e} />)}</div>
            <Pagination page={meta.page} pages={meta.pages} onPage={p => fetchEmployers(p)} />
          </>
        )}
      </div>
    </div>
  );
};

// ─── PAGE: REGISTER ────────────────────────────────────────────────────────────
const RegisterPage = () => {
  const [role, setRole] = useState(null);
  const [step, setStep] = useState(1);
  const [payData, setPayData] = useState({ code: "", amount: "", date: "", phone: "" });
  const [paymentId, setPaymentId] = useState(null);
  const [profile, setProfile] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registeredId, setRegisteredId] = useState(null);
  const [profileStatus, setProfileStatus] = useState("");

  const STEPS = ["Choose Role", "Payment", "Profile", "Done"];

  // ── STEP 2: Submit payment ──────────────────────────────────────────────────
  const handlePayment = async () => {
    const errs = {};
    if (!payData.code.trim()) errs.code = "Enter your M-Pesa confirmation code";
    if (!payData.amount || isNaN(payData.amount)) errs.amount = "Enter the amount paid";
    if (!payData.date) errs.date = "Enter the payment date";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setApiError(""); setSubmitting(true);

    const res = await api.post("/payments", {
      mpesa_code: payData.code.trim().toUpperCase(),
      amount: parseFloat(payData.amount),
      payment_date: payData.date,
      phone: payData.phone || undefined,
    });

    setSubmitting(false);
    if (res.success) {
      setPaymentId(res.data.payment_id);
      setStep(3);
    } else {
      setApiError(res.message || "Payment submission failed. Please try again.");
    }
  };

  // ── STEP 3: Submit profile ──────────────────────────────────────────────────
  const handleProfile = async () => {
    setApiError(""); setSubmitting(true);

    let res;
    if (role === "worker") {
      const fd = new FormData();
      const fields = { ...profile, payment_id: paymentId };
      Object.entries(fields).forEach(([k, v]) => v !== undefined && v !== "" && fd.append(k, v));
      if (photoFile) fd.append("photo", photoFile);
      res = await api.post("/workers", fd, null, true);
    } else {
      res = await api.post("/employers", { ...profile, payment_id: paymentId });
    }

    setSubmitting(false);
    if (res.success) {
      setRegisteredId(res.data.id);
      setProfileStatus(res.data.profile_status);
      setStep(4);
    } else {
      setApiError(res.message || (res.errors ? res.errors.map(e => e.message).join(", ") : "Registration failed."));
    }
  };

  const resetAll = () => { setStep(1); setRole(null); setPayData({ code:"",amount:"",date:"",phone:"" }); setProfile({}); setPaymentId(null); setPhotoFile(null); setApiError(""); setErrors({}); };

  return (
    <div className="form-page">
      <div className="steps" style={{ marginTop: 24, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={s} className={`step-item ${step > i+1 ? "done" : step === i+1 ? "active" : ""}`}>
            <div className="step-num">{step > i+1 ? "✓" : i+1}</div>
            <div className="step-label">{s}</div>
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <h2 className="section-title text-center">Join Andy Homecare</h2>
          <p style={{ textAlign:"center", color:"var(--mid)", marginBottom:32, marginTop:6 }}>Are you looking for work or looking to hire?</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
            {[
              { val:"worker",   icon:"👷", label:"I'm a Worker",   sub:"House help, gardener, nanny, cook" },
              { val:"employer", icon:"🏠", label:"I'm an Employer", sub:"Looking for domestic help" },
            ].map(r => (
              <div key={r.val} onClick={() => { setRole(r.val); setStep(2); }}
                style={{ background:"var(--white)", border:`2px solid ${role===r.val?"var(--green)":"var(--sand)"}`, borderRadius:"var(--radius)", padding:"28px 20px", textAlign:"center", cursor:"pointer", transition:"all .2s", boxShadow:"var(--shadow)" }}>
                <div style={{ fontSize:"2.4rem", marginBottom:10 }}>{r.icon}</div>
                <h3 style={{ fontFamily:"Lora,serif", fontSize:"1.05rem", fontWeight:700, marginBottom:6 }}>{r.label}</h3>
                <p style={{ fontSize:".8rem", color:"var(--mid)" }}>{r.sub}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign:"center", marginTop:20, fontSize:".82rem", color:"var(--mid)" }}>A one-time registration fee of KES 500 is required via M-Pesa.</p>
        </div>
      )}

      {/* STEP 2: Payment */}
      {step === 2 && (
        <div className="form-card">
          <h2 className="form-title">Pay Registration Fee</h2>
          <p className="form-subtitle">Complete your M-Pesa payment then enter your details below.</p>
          <div className="payment-box">
            <h3>M-Pesa Payment Details</h3>
            <div className="payment-detail"><span>Paybill Number</span><span className="val">542542</span></div>
            <div className="payment-detail"><span>Account Number</span><span className="val">22703</span></div>
            <div className="payment-detail"><span>Amount</span><span className="val">KES 500</span></div>
            <div className="amount-note">📱 M-Pesa → Lipa na M-Pesa → Pay Bill → Enter details → Confirm → Note your code below.</div>
          </div>
          {apiError && <Alert type="error">{apiError}</Alert>}
          <div className="form-group">
            <label>M-Pesa Confirmation Code *</label>
            <input placeholder="e.g. RDE7XXXXXXX" value={payData.code} onChange={e => setPayData({...payData, code:e.target.value})} />
            {errors.code && <p className="form-error">{errors.code}</p>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Amount Paid (KES) *</label>
              <input type="number" placeholder="500" value={payData.amount} onChange={e => setPayData({...payData, amount:e.target.value})} />
              {errors.amount && <p className="form-error">{errors.amount}</p>}
            </div>
            <div className="form-group">
              <label>Payment Date *</label>
              <input type="date" value={payData.date} onChange={e => setPayData({...payData, date:e.target.value})} />
              {errors.date && <p className="form-error">{errors.date}</p>}
            </div>
          </div>
          <div className="form-group">
            <label>M-Pesa Phone Number (optional)</label>
            <input placeholder="07XX XXX XXX" value={payData.phone} onChange={e => setPayData({...payData, phone:e.target.value})} />
          </div>
          <Alert type="info">Our team verifies all payments within 2 hours. You'll be notified via SMS once approved.</Alert>
          <button className="btn-full" onClick={handlePayment} disabled={submitting}>
            {submitting ? "Submitting…" : "Confirm Payment & Continue →"}
          </button>
          <button onClick={() => setStep(1)} style={{ width:"100%", marginTop:10, background:"none", border:"none", color:"var(--mid)", fontSize:".85rem", cursor:"pointer" }}>← Back</button>
        </div>
      )}

      {/* STEP 3: Profile */}
      {step === 3 && (
        <div className="form-card">
          <h2 className="form-title">{role === "worker" ? "Worker Profile" : "Employer Profile"}</h2>
          <p className="form-subtitle">Complete your profile so {role === "worker" ? "employers can find you." : "workers know what you need."}</p>
          <Alert type="success">Payment recorded! Fill in your profile to go live.</Alert>
          {apiError && <Alert type="error">{apiError}</Alert>}

          {role === "worker" ? (
            <>
              <div className="form-row">
                <div className="form-group"><label>Full Name *</label><input placeholder="Your full name" value={profile.full_name||""} onChange={e => setProfile({...profile,full_name:e.target.value})} /></div>
                <div className="form-group"><label>ID Number *</label><input placeholder="National ID" value={profile.id_number||""} onChange={e => setProfile({...profile,id_number:e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Phone Number *</label><input placeholder="07XX XXX XXX" value={profile.phone||""} onChange={e => setProfile({...profile,phone:e.target.value})} /></div>
                <div className="form-group">
                  <label>Primary Skill *</label>
                  <select value={profile.skill||""} onChange={e => setProfile({...profile,skill:e.target.value})}>
                    <option value="">Select skill</option>
                    {["house help","gardener","nanny","cook","driver","security guard"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Years of Experience *</label>
                  <select value={profile.experience||""} onChange={e => setProfile({...profile,experience:e.target.value})}>
                    <option value="">Select</option>
                    {["Less than 1 year","1–2 years","3–5 years","5+ years"].map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Min Salary (KES/mo) *</label><input type="number" placeholder="e.g. 10000" value={profile.salary_min||""} onChange={e => setProfile({...profile,salary_min:e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Max Salary (KES/mo)</label><input type="number" placeholder="Optional" value={profile.salary_max||""} onChange={e => setProfile({...profile,salary_max:e.target.value})} /></div>
                <div className="form-group"><label>Location *</label><input placeholder="e.g. Bungoma Town" value={profile.location||""} onChange={e => setProfile({...profile,location:e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Availability *</label><input placeholder="e.g. Mon–Sat, Full Day" value={profile.availability||""} onChange={e => setProfile({...profile,availability:e.target.value})} /></div>
              <div className="form-group"><label>About Yourself</label><textarea placeholder="Describe your experience and strengths…" value={profile.bio||""} onChange={e => setProfile({...profile,bio:e.target.value})} /></div>
              <div className="form-group">
                <label>Profile Photo</label>
                <input type="file" accept="image/*" style={{ padding:"8px 0", border:"none", background:"none" }} onChange={e => setPhotoFile(e.target.files[0] || null)} />
                <p className="form-hint">Clear, recent photo. Max 2MB.</p>
              </div>
            </>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group"><label>Full Name *</label><input placeholder="Your full name" value={profile.full_name||""} onChange={e => setProfile({...profile,full_name:e.target.value})} /></div>
                <div className="form-group"><label>Phone Number *</label><input placeholder="07XX XXX XXX" value={profile.phone||""} onChange={e => setProfile({...profile,phone:e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Location *</label><input placeholder="e.g. Bungoma Town" value={profile.location||""} onChange={e => setProfile({...profile,location:e.target.value})} /></div>
                <div className="form-group">
                  <label>Type of Help Needed *</label>
                  <select value={profile.help_type||""} onChange={e => setProfile({...profile,help_type:e.target.value})}>
                    <option value="">Select</option>
                    {["house help","gardener","nanny","cook","driver","security guard"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Min Budget (KES/mo) *</label><input type="number" placeholder="e.g. 10000" value={profile.budget_min||""} onChange={e => setProfile({...profile,budget_min:e.target.value})} /></div>
                <div className="form-group"><label>Max Budget (KES/mo)</label><input type="number" placeholder="Optional" value={profile.budget_max||""} onChange={e => setProfile({...profile,budget_max:e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Job Description *</label><textarea placeholder="Describe the work, household size, special requirements…" value={profile.description||""} onChange={e => setProfile({...profile,description:e.target.value})} /></div>
            </>
          )}

          <button className="btn-full" onClick={handleProfile} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Profile →"}
          </button>
          <button onClick={() => { setStep(2); setApiError(""); }} style={{ width:"100%", marginTop:10, background:"none", border:"none", color:"var(--mid)", fontSize:".85rem", cursor:"pointer" }}>← Back</button>
        </div>
      )}

      {/* STEP 4: Done */}
      {step === 4 && (
        <div className="form-card text-center">
          <div style={{ fontSize:"3.5rem", marginBottom:16 }}>🎉</div>
          <h2 className="form-title" style={{ textAlign:"center" }}>Registration Submitted!</h2>
          <p style={{ color:"var(--mid)", marginTop:8, lineHeight:1.7 }}>
            {profileStatus === "active"
              ? "Your profile is now live! You can be found by " + (role === "worker" ? "employers" : "workers") + " immediately."
              : "Your profile has been received. Our team will verify your payment and activate your listing within 2–4 hours. You'll receive an SMS confirmation."}
          </p>
          {registeredId && <p style={{ fontSize:".78rem", color:"var(--mid)", marginTop:8 }}>Reference ID: <code>{registeredId}</code></p>}
          <div style={{ background:"var(--cream)", borderRadius:10, padding:18, margin:"24px 0", border:"1.5px solid var(--sand)" }}>
            <p style={{ fontWeight:600, marginBottom:6 }}>Need help?</p>
            <p style={{ fontSize:".875rem", color:"var(--mid)" }}>📧 chapchap.bungoma@gmail.com</p>
            <p style={{ fontSize:".875rem", color:"var(--mid)" }}>📞 0706 791 121</p>
          </div>
          <button className="btn-full" onClick={resetAll}>Register Another Person</button>
        </div>
      )}
    </div>
  );
};

// ─── PAGE: ADMIN ───────────────────────────────────────────────────────────────
const AdminPage = () => {
  const [auth, setAuth] = useState(() => sessionStorage.getItem("admin_token") || null);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState("dashboard");

  // Admin sub-state
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [usersFilter, setUsersFilter] = useState({ role: "", status: "", q: "" });
  const [paymentsFilter, setPaymentsFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const token = auth;

  const handleLogin = async () => {
    setLoginError(""); setLoggingIn(true);
    const res = await api.post("/admin/login", loginData);
    setLoggingIn(false);
    if (res.success) {
      sessionStorage.setItem("admin_token", res.data.token);
      setAuth(res.data.token);
    } else {
      setLoginError(res.message || "Login failed.");
    }
  };

  const handleLogout = () => { sessionStorage.removeItem("admin_token"); setAuth(null); };

  // Load dashboard data
  useEffect(() => {
    if (!auth) return;
    if (tab === "dashboard") {
      setLoading(true);
      api.get("/admin/dashboard", token).then(r => { if (r.success) setDashboard(r.data); setLoading(false); });
    }
    if (tab === "workers" || tab === "employers" || tab === "users") {
      setLoading(true);
      const params = new URLSearchParams({ limit: 50 });
      if (usersFilter.role) params.append("role", usersFilter.role);
      if (usersFilter.status) params.append("status", usersFilter.status);
      if (usersFilter.q) params.append("q", usersFilter.q);
      if (tab === "workers") params.set("role", "worker");
      if (tab === "employers") params.set("role", "employer");
      api.get(`/admin/users?${params}`, token).then(r => { if (r.success) setUsers(r.data); setLoading(false); });
    }
    if (tab === "payments") {
      setLoading(true);
      const params = new URLSearchParams({ limit: 50 });
      if (paymentsFilter) params.append("status", paymentsFilter);
      api.get(`/payments?${params}`, token).then(r => { if (r.success) setPayments(r.data); setLoading(false); });
    }
  }, [auth, tab, usersFilter, paymentsFilter]);

  const changeUserStatus = async (id, status) => {
    const res = await api.patch(`/admin/users/${id}/status`, { status }, token);
    setActionMsg(res.message || "Updated");
    // Refresh
    setUsers(prev => prev.map(u => u.id === id ? { ...u, profile_status: status } : u));
    setTimeout(() => setActionMsg(""), 3000);
  };

  const verifyPayment = async (id) => {
    const res = await api.patch(`/payments/${id}/verify`, {}, token);
    setActionMsg(res.message || "Verified");
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "verified" } : p));
    setTimeout(() => setActionMsg(""), 3000);
  };

  const rejectPayment = async (id) => {
    const res = await api.patch(`/payments/${id}/reject`, { reason: "Rejected by admin" }, token);
    setActionMsg(res.message || "Rejected");
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "rejected" } : p));
    setTimeout(() => setActionMsg(""), 3000);
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Permanently delete this user?")) return;
    const res = await api.del(`/admin/users/${id}`, token);
    setActionMsg(res.message || "Deleted");
    setUsers(prev => prev.filter(u => u.id !== id));
    setTimeout(() => setActionMsg(""), 3000);
  };

  if (!auth) return (
    <div className="form-page" style={{ paddingTop: 60 }}>
      <div className="form-card">
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:"2.2rem", marginBottom:8 }}>🔐</div>
          <h2 className="form-title">Admin Login</h2>
          <p className="form-subtitle">Restricted to Andy Homecare administrators</p>
        </div>
        {loginError && <Alert type="error">{loginError}</Alert>}
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={loginData.email} onChange={e => setLoginData({...loginData,email:e.target.value})} placeholder="admin@andyhomecare.co.ke" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={loginData.password} onChange={e => setLoginData({...loginData,password:e.target.value})} placeholder="Enter password" onKeyDown={e => e.key==="Enter" && handleLogin()} />
        </div>
        <button className="btn-full" onClick={handleLogin} disabled={loggingIn}>{loggingIn ? "Signing in…" : "Sign In"}</button>
      </div>
    </div>
  );

  const kpis = dashboard ? [
    { label:"Total Workers",    val: dashboard.stats.workers.total },
    { label:"Active Workers",   val: dashboard.stats.workers.active },
    { label:"Total Employers",  val: dashboard.stats.employers.total },
    { label:"Pending Review",   val: dashboard.stats.workers.pending + dashboard.stats.employers.pending },
    { label:"Payments Verified", val: dashboard.stats.payments.verified },
    { label:"Payments Pending",  val: dashboard.stats.payments.pending },
    { label:"Total Revenue",     val: `KES ${Number(dashboard.stats.payments.revenue).toLocaleString()}` },
  ] : [];

  return (
    <div>
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><h2>Admin Panel</h2><p>Manage registrations, payments and users</p></div>
        <button onClick={handleLogout} style={{ background:"none", border:"1.5px solid var(--sand)", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:".85rem", color:"var(--mid)" }}>Sign Out</button>
      </div>

      <div className="admin-grid">
        <div className="admin-sidebar">
          <p style={{ fontSize:".72rem", fontWeight:700, color:"var(--mid)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:12 }}>Navigation</p>
          {[
            { key:"dashboard", label:"📊 Dashboard" },
            { key:"workers",   label:"👷 Workers" },
            { key:"employers", label:"🏠 Employers" },
            { key:"payments",  label:"💳 Payments" },
          ].map(item => (
            <button key={item.key} className={`admin-nav-item ${tab===item.key?"active":""}`} onClick={() => setTab(item.key)}>{item.label}</button>
          ))}
        </div>

        <div className="admin-content">
          {actionMsg && <Alert type="success">{actionMsg}</Alert>}

          {/* DASHBOARD */}
          {tab === "dashboard" && (
            loading ? <Spinner /> : dashboard ? (
              <>
                <p style={{ fontFamily:"Lora,serif", fontSize:"1.15rem", fontWeight:700, marginBottom:20 }}>Overview</p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14, marginBottom:28 }}>
                  {kpis.map(k => (
                    <div key={k.label} className="kpi"><div className="kpi-num">{k.val}</div><div className="kpi-label">{k.label}</div></div>
                  ))}
                </div>
                <p style={{ fontWeight:600, marginBottom:12, fontSize:".9rem" }}>Recent Registrations</p>
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Role</th><th>Payment</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {dashboard.recent.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight:500 }}>{u.full_name}</td>
                        <td><span className="badge">{u.role}</span></td>
                        <td style={{ fontFamily:"monospace", fontSize:".8rem" }}>{u.mpesa_code || "—"}</td>
                        <td style={{ color:"var(--mid)" }}>{u.created_at?.slice(0,10)}</td>
                        <td><StatusPill status={u.profile_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : <Alert type="error">Could not load dashboard data.</Alert>
          )}

          {/* WORKERS / EMPLOYERS */}
          {(tab === "workers" || tab === "employers") && (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                <p style={{ fontFamily:"Lora,serif", fontSize:"1.15rem", fontWeight:700 }}>
                  {tab === "workers" ? "Registered Workers" : "Registered Employers"}
                </p>
                <div style={{ display:"flex", gap:8 }}>
                  <select style={{ width:160 }} value={usersFilter.status} onChange={e => setUsersFilter({...usersFilter, status:e.target.value})}>
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <input style={{ width:180 }} placeholder="Search name…" value={usersFilter.q} onChange={e => setUsersFilter({...usersFilter, q:e.target.value})} />
                </div>
              </div>
              {loading ? <Spinner /> : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>{tab === "workers" ? "Skill" : "Help Type"}</th>
                      <th>Phone</th>
                      <th>Location</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight:500 }}>{u.full_name}</td>
                        <td><SkillBadge skill={u.category || "—"} /></td>
                        <td style={{ fontSize:".82rem", color:"var(--mid)" }}>{u.phone}</td>
                        <td style={{ fontSize:".82rem", color:"var(--mid)" }}>{u.location}</td>
                        <td>
                          {u.mpesa_code
                            ? <span style={{ fontFamily:"monospace", fontSize:".78rem" }}>{u.mpesa_code}</span>
                            : <span style={{ color:"var(--mid)" }}>—</span>}
                        </td>
                        <td><StatusPill status={u.profile_status} /></td>
                        <td>
                          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                            {u.profile_status !== "active"    && <button onClick={() => changeUserStatus(u.id,"active")}    style={{ background:"rgba(21,128,61,.1)",  color:"var(--success)", border:"none", borderRadius:6, padding:"4px 9px", fontSize:".72rem", cursor:"pointer", fontWeight:600 }}>Approve</button>}
                            {u.profile_status !== "suspended" && <button onClick={() => changeUserStatus(u.id,"suspended")} style={{ background:"rgba(245,158,11,.1)", color:"#92400E",      border:"none", borderRadius:6, padding:"4px 9px", fontSize:".72rem", cursor:"pointer", fontWeight:600 }}>Suspend</button>}
                            <button onClick={() => deleteUser(u.id)} style={{ background:"rgba(185,28,28,.08)", color:"var(--error)", border:"none", borderRadius:6, padding:"4px 9px", fontSize:".72rem", cursor:"pointer", fontWeight:600 }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !loading && <tr><td colSpan={7} style={{ textAlign:"center", color:"var(--mid)", padding:28 }}>No records found.</td></tr>}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* PAYMENTS */}
          {tab === "payments" && (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                <p style={{ fontFamily:"Lora,serif", fontSize:"1.15rem", fontWeight:700 }}>Payment Verification</p>
                <select style={{ width:160 }} value={paymentsFilter} onChange={e => setPaymentsFilter(e.target.value)}>
                  <option value="">All Payments</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <Alert type="info">Cross-check each M-Pesa code against your Safaricom statement before approving.</Alert>
              {loading ? <Spinner /> : (
                <table className="data-table">
                  <thead><tr><th>User</th><th>Role</th><th>M-Pesa Code</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight:500 }}>{p.full_name || "Unregistered"}</td>
                        <td><span className="badge">{p.role || "—"}</span></td>
                        <td style={{ fontFamily:"monospace", fontSize:".82rem" }}>{p.mpesa_code}</td>
                        <td>KES {Number(p.amount).toLocaleString()}</td>
                        <td style={{ color:"var(--mid)" }}>{p.payment_date}</td>
                        <td><StatusPill status={p.status} /></td>
                        <td>
                          {p.status === "pending" && (
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={() => verifyPayment(p.id)} style={{ background:"rgba(21,128,61,.1)", color:"var(--success)", border:"none", borderRadius:6, padding:"4px 10px", fontSize:".75rem", cursor:"pointer", fontWeight:600 }}>✓ Verify</button>
                              <button onClick={() => rejectPayment(p.id)} style={{ background:"rgba(185,28,28,.08)", color:"var(--error)", border:"none", borderRadius:6, padding:"4px 10px", fontSize:".75rem", cursor:"pointer", fontWeight:600 }}>✗ Reject</button>
                            </div>
                          )}
                          {p.status !== "pending" && <span style={{ fontSize:".78rem", color:"var(--mid)" }}>{p.status}</span>}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && !loading && <tr><td colSpan={7} style={{ textAlign:"center", color:"var(--mid)", padding:28 }}>No payments found.</td></tr>}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [apiStatus, setApiStatus] = useState(null); // null | "ok" | "offline"

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  // Check if backend is reachable
  useEffect(() => {
    fetch(`${API_BASE.replace("/api",""  )}/health`)
      .then(r => r.ok ? setApiStatus("ok") : setApiStatus("offline"))
      .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <div className="app-shell">
      {apiStatus === "offline" && (
        <div style={{ background:"#FEF3C7", borderBottom:"1px solid #F59E0B", padding:"10px 24px", textAlign:"center", fontSize:".85rem", color:"#92400E" }}>
          ⚠ Backend offline — start the server with <code>npm run dev</code> in the <code>andy-homecare-backend</code> folder.
        </div>
      )}

      <nav>
        <div className="nav-brand" onClick={() => setPage("home")}><span>Andy</span> Homecare</div>
        <div className="nav-links">
          {[
            { key:"find-workers", label:"Find Workers" },
            { key:"find-jobs",    label:"Find Jobs" },
            { key:"register",     label:"Register", cta:true },
          ].map(n => (
            <button key={n.key} className={`nav-btn${n.cta?" cta":""}${page===n.key?" active":""}`} onClick={() => setPage(n.key)}>{n.label}</button>
          ))}
          <button className={`nav-btn${page==="admin"?" active":""}`} onClick={() => setPage("admin")}>Admin</button>
        </div>
      </nav>

      <main style={{ flex:1 }}>
        {page === "home"          && <HomePage setPage={setPage} />}
        {page === "find-workers"  && <FindWorkersPage />}
        {page === "find-jobs"     && <FindJobsPage />}
        {page === "register"      && <RegisterPage />}
        {page === "admin"         && <AdminPage />}
      </main>

      <footer>
        <div className="footer-grid">
          <div>
            <div className="footer-brand"><span>Andy</span> Homecare Connect</div>
            <p>Connecting trusted domestic workers with families across Bungoma County, Kenya.</p>
          </div>
          <div>
            <h4>Quick Links</h4>
            {[["Find Workers","find-workers"],["Find Jobs","find-jobs"],["Register","register"]].map(([l,k]) => (
              <div key={k}><a href="#" onClick={e => { e.preventDefault(); setPage(k); }}>{l}</a></div>
            ))}
          </div>
          <div>
            <h4>Support</h4>
            <p>📧 chapchap.bungoma@gmail.com</p>
            <p>📞 0706 791 121</p>
            <p style={{ marginTop:8 }}>Mon – Sat, 8am – 6pm</p>
          </div>
          <div>
            <h4>Payment</h4>
            <p>M-Pesa Paybill: <strong style={{ color:"#F4B942" }}>542542</strong></p>
            <p>Account: <strong style={{ color:"#F4B942" }}>22703</strong></p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 Andy Homecare Connect · Bungoma, Kenya · All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
