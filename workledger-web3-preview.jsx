import { useState } from "react";

const DollarSign = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);
const FileText = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const Lock = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const Award = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
);
const LayoutDashboard = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
);
const Wallet = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><circle cx="18" cy="12" r="2"/></svg>
);
const Bell = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
);
const Plus = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const Trophy = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Wallet", icon: Wallet },
  { label: "Contracts", icon: FileText },
  { label: "NFTs", icon: Award },
  { label: "Profile", icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  { label: "Settings", icon: () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
];

/* ── Glass Card ─────────────────────────────────── */
function GlassCard({ children, className = "", glow = "" }) {
  return (
    <div
      className={className}
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 24,
        position: "relative",
        overflow: "hidden",
        ...(glow && {
          boxShadow: `0 0 40px -12px ${glow}`,
        }),
      }}
    >
      {children}
    </div>
  );
}

/* ── Stat Card ──────────────────────────────────── */
function StatCard({ label, value, icon, subtext, gradient }) {
  return (
    <GlassCard glow={gradient === "cyan" ? "rgba(0,210,255,0.15)" : gradient === "purple" ? "rgba(168,85,247,0.15)" : gradient === "amber" ? "rgba(251,191,36,0.15)" : "rgba(16,185,129,0.15)"}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: gradient === "cyan" ? "linear-gradient(90deg, #00d2ff, #3a7bd5)" : gradient === "purple" ? "linear-gradient(90deg, #a855f7, #6366f1)" : gradient === "amber" ? "linear-gradient(90deg, #f59e0b, #ef4444)" : "linear-gradient(90deg, #10b981, #06b6d4)", borderRadius: "16px 16px 0 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 6 }}>{label}</p>
          <p style={{ color: "#fff", fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>{value}</p>
          {subtext && <p style={{ color: "#10b981", fontSize: 12, marginTop: 6 }}>{subtext}</p>}
        </div>
        <div style={{ color: "rgba(255,255,255,0.2)", padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 12 }}>{icon}</div>
      </div>
    </GlassCard>
  );
}

/* ── Status Badge ───────────────────────────────── */
function StatusBadge({ status }) {
  const config = {
    active: { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.3)" },
    funded: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" },
    completed: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.3)" },
    draft: { bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.1)" },
    submitted: { bg: "rgba(168,85,247,0.15)", color: "#c084fc", border: "rgba(168,85,247,0.3)" },
    released: { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.3)" },
  };
  const c = config[status] || config.draft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}`, textTransform: "capitalize", letterSpacing: "0.02em" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, marginRight: 6, boxShadow: `0 0 6px ${c.color}` }} />
      {status}
    </span>
  );
}

/* ── Contract Card ──────────────────────────────── */
function ContractCard({ title, client, amount, currency, status, milestones, completed, template, date }) {
  const pct = milestones > 0 ? (completed / milestones) * 100 : 0;
  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ color: "#fff", fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h3>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 }}>{client}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
        <span style={{ color: "#fff", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{amount} <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400, fontSize: 12 }}>{currency}</span></span>
        {milestones > 0 && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{completed}/{milestones} milestones</span>}
      </div>
      {milestones > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 9999 }}>
            <div style={{ height: 4, borderRadius: 9999, background: "linear-gradient(90deg, #00d2ff, #a855f7)", width: `${pct}%`, transition: "width 0.5s ease", boxShadow: "0 0 8px rgba(0,210,255,0.4)" }} />
          </div>
        </div>
      )}
      <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
        <span style={{ textTransform: "capitalize" }}>{template}</span>
        <span>{date}</span>
      </div>
    </GlassCard>
  );
}

/* ── NFT Card ───────────────────────────────────── */
function NFTCard({ name, description, taxon, rating, amount, currency, date }) {
  const taxonConfig = {
    1: { label: "Proof of Work", gradient: "linear-gradient(90deg, #00d2ff, #3a7bd5)", color: "#00d2ff" },
    2: { label: "License", gradient: "linear-gradient(90deg, #10b981, #06b6d4)", color: "#10b981" },
    3: { label: "Access Pass", gradient: "linear-gradient(90deg, #f59e0b, #ef4444)", color: "#f59e0b" },
  };
  const tc = taxonConfig[taxon] || taxonConfig[1];
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ height: 3, background: tc.gradient }} />
      <div style={{ padding: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: tc.color }}>{tc.label}</span>
        <h3 style={{ color: "#fff", fontWeight: 600, fontSize: 14, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</h3>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{description}</p>
        <div style={{ marginTop: 10 }}>
          {rating && (
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "#fbbf24" }}>{"★".repeat(rating)}</span>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>{"★".repeat(5 - rating)}</span>
            </div>
          )}
          {amount && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{amount} {currency}</p>}
        </div>
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 10 }}>Minted {date}</p>
      </div>
    </div>
  );
}

/* ── MAIN DASHBOARD ─────────────────────────────── */
export default function StudioLedgerWeb3Dashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: "#080c14" }}>

      {/* ── Sidebar ──────────────────────────────── */}
      <aside style={{ width: 220, minHeight: "100vh", background: "linear-gradient(180deg, #0a1020 0%, #060a14 100%)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(0,210,255,0.3)" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>W</span>
            </div>
            <div>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>StudioLedger</span>
              <span style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>by ACI</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === activeNav;
            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 2,
                  transition: "all 0.15s",
                  background: isActive ? "rgba(0,210,255,0.08)" : "transparent",
                  color: isActive ? "#00d2ff" : "rgba(255,255,255,0.4)",
                  borderLeft: isActive ? "2px solid #00d2ff" : "2px solid transparent",
                  ...(isActive && { boxShadow: "inset 0 0 20px rgba(0,210,255,0.05)" }),
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>RR</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Remy Ruozzi</p>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Creator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top Bar */}
        <header style={{ height: 56, background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>Dashboard</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", marginRight: 6, boxShadow: "0 0 6px #fbbf24" }} />
              testnet
            </span>
            <button style={{ position: "relative", padding: 4, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
              <Bell size={20} />
              <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "radial-gradient(ellipse at 20% 0%, rgba(0,210,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(168,85,247,0.03) 0%, transparent 50%)" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
            <StatCard label="Total Earned" value="$6,250" icon={<DollarSign size={24} />} subtext="+12% this month" gradient="cyan" />
            <StatCard label="Active Contracts" value="2" icon={<FileText size={24} />} gradient="purple" />
            <StatCard label="Escrow Held" value="$3,700" icon={<Lock size={24} />} gradient="amber" />
            <StatCard label="PoW NFTs" value="3" icon={<Award size={24} />} gradient="green" />
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>

            {/* Active Contracts */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>Active Contracts</h2>
                <button style={{ background: "none", border: "none", color: "#00d2ff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>View all</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <ContractCard
                  title="E-Commerce Platform Redesign"
                  client="TechCo Inc."
                  amount="3,000.00"
                  currency="RLUSD"
                  status="active"
                  milestones={3}
                  completed={1}
                  template="milestone"
                  date="Jan 20, 2025"
                />
                <ContractCard
                  title="Brand Identity Package"
                  client="StartupXYZ"
                  amount="1,500.00"
                  currency="RLUSD"
                  status="funded"
                  milestones={1}
                  completed={0}
                  template="fixed price"
                  date="Feb 10, 2025"
                />
              </div>
            </div>

            {/* NFTs */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>Recent NFTs</h2>
                <button style={{ background: "none", border: "none", color: "#00d2ff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>View all</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <NFTCard name="Design System & Wireframes" description="Complete UI kit for TechCo e-commerce redesign" taxon={1} rating={5} amount="800" currency="RLUSD" date="Feb 14, 2025" />
                <NFTCard name="Fitness App UI License" description="Non-exclusive license for fitness app UI designs" taxon={2} date="Jan 29, 2025" />
                <NFTCard name="Mobile App Prototype" description="Interactive Figma prototype for fitness tracking app" taxon={1} rating={4} amount="2,000" currency="XRP" date="Jan 29, 2025" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)",
                color: "#fff", fontWeight: 600, fontSize: 14,
                boxShadow: "0 0 20px rgba(0,210,255,0.3)",
                transition: "all 0.15s",
              }}>
                <Plus size={16} /> New Contract
              </button>
              <button style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 10, cursor: "pointer",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: 14,
                transition: "all 0.15s",
              }}>
                <Wallet size={16} /> View Wallet
              </button>
              <button style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 10, cursor: "pointer",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: 14,
                transition: "all 0.15s",
              }}>
                <Trophy size={16} /> My NFTs
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
