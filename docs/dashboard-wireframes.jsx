import { useState } from "react";

// StudioLedger Dashboard Wireframes
// Interactive mockup showing all main screens

const SCREENS = {
  DASHBOARD: "dashboard",
  WALLET: "wallet",
  CONTRACTS: "contracts",
  CONTRACT_DETAIL: "contract_detail",
  NEW_CONTRACT: "new_contract",
  NFTS: "nfts",
  PROFILE: "profile",
  SETTINGS: "settings",
};

// Color palette
const colors = {
  bg: "#F7F9FC",
  sidebar: "#0A1628",
  sidebarHover: "#11203A",
  brand: "#065A82",
  teal: "#1C7293",
  gold: "#F9A826",
  white: "#FFFFFF",
  darkText: "#1E293B",
  grayText: "#64748B",
  lightGray: "#E2E8F0",
  green: "#10B981",
  red: "#EF4444",
  yellow: "#F59E0B",
  blue: "#3B82F6",
};

function Badge({ color, children }) {
  const bgMap = {
    green: "#ECFDF5",
    yellow: "#FFFBEB",
    blue: "#EFF6FF",
    red: "#FEF2F2",
    gray: "#F1F5F9",
  };
  const textMap = {
    green: "#059669",
    yellow: "#D97706",
    blue: "#2563EB",
    red: "#DC2626",
    gray: "#475569",
  };
  return (
    <span
      style={{
        background: bgMap[color],
        color: textMap[color],
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, icon }) {
  return (
    <div
      style={{
        background: colors.white,
        borderRadius: 12,
        padding: "20px 24px",
        border: `1px solid ${colors.lightGray}`,
        flex: 1,
        minWidth: 160,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: colors.grayText }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: colors.darkText, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: colors.green, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Sidebar({ active, setScreen }) {
  const items = [
    { key: SCREENS.DASHBOARD, label: "Dashboard", icon: "📊" },
    { key: SCREENS.WALLET, label: "Wallet", icon: "💰" },
    { key: SCREENS.CONTRACTS, label: "Contracts", icon: "📄" },
    { key: SCREENS.NFTS, label: "NFTs", icon: "🏆" },
    { key: SCREENS.PROFILE, label: "Profile", icon: "👤" },
    { key: SCREENS.SETTINGS, label: "Settings", icon: "⚙️" },
  ];

  return (
    <div
      style={{
        width: 200,
        background: colors.sidebar,
        display: "flex",
        flexDirection: "column",
        padding: "20px 0",
        flexShrink: 0,
      }}
    >
      <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #1E293B" }}>
        <div style={{ color: colors.white, fontSize: 18, fontWeight: 700 }}>StudioLedger</div>
        <div style={{ color: colors.gold, fontSize: 11, marginTop: 2 }}>by ACI</div>
      </div>
      <div style={{ padding: "12px 0", flex: 1 }}>
        {items.map((item) => (
          <div
            key={item.key}
            onClick={() => setScreen(item.key)}
            style={{
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              background: active === item.key ? colors.sidebarHover : "transparent",
              borderLeft: active === item.key ? `3px solid ${colors.gold}` : "3px solid transparent",
              color: active === item.key ? colors.white : "#94A3B8",
              fontSize: 13,
              fontWeight: active === item.key ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 20px", borderTop: "1px solid #1E293B" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              background: colors.teal,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.white,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            RR
          </div>
          <div>
            <div style={{ color: colors.white, fontSize: 12, fontWeight: 500 }}>Remy R.</div>
            <div style={{ color: "#64748B", fontSize: 10 }}>Creator</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ title }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 32px",
        borderBottom: `1px solid ${colors.lightGray}`,
        background: colors.white,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.darkText, margin: 0 }}>{title}</h1>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div
          style={{
            background: "#F1F5F9",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            color: colors.grayText,
          }}
        >
          Testnet
        </div>
        <div style={{ position: "relative", cursor: "pointer", fontSize: 18 }}>
          🔔
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -4,
              width: 8,
              height: 8,
              borderRadius: 4,
              background: colors.red,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ===== SCREEN: Dashboard =====
function DashboardScreen({ setScreen }) {
  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Total Earnings" value="€4,820" sub="+12% this month" icon="💶" />
        <StatCard label="Active Contracts" value="3" icon="📄" />
        <StatCard label="Escrow Held" value="€1,500" icon="🔒" />
        <StatCard label="PoW NFTs" value="12" sub="+2 this week" icon="🏆" />
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Active Contracts */}
        <div
          style={{
            flex: 2,
            minWidth: 340,
            background: colors.white,
            borderRadius: 12,
            border: `1px solid ${colors.lightGray}`,
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.darkText, margin: 0 }}>
              Active Contracts
            </h3>
            <span
              onClick={() => setScreen(SCREENS.CONTRACTS)}
              style={{ fontSize: 12, color: colors.teal, cursor: "pointer" }}
            >
              View all →
            </span>
          </div>
          {[
            { title: "Brand Identity Package", client: "Alice M.", amount: "€800", status: "active", deadline: "Mar 5" },
            { title: "Blog Series (5 articles)", client: "TechCo Inc.", amount: "€1,200", status: "funded", deadline: "Mar 15" },
            { title: "Logo Animation", client: "Bob K.", amount: "€450", status: "active", deadline: "Feb 28" },
          ].map((c, i) => (
            <div
              key={i}
              onClick={() => setScreen(SCREENS.CONTRACT_DETAIL)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderTop: i > 0 ? `1px solid ${colors.lightGray}` : "none",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: colors.darkText }}>{c.title}</div>
                <div style={{ fontSize: 11, color: colors.grayText }}>{c.client} · Due {c.deadline}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.darkText }}>{c.amount}</div>
                <Badge color={c.status === "active" ? "green" : "yellow"}>{c.status}</Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Recent NFTs */}
        <div
          style={{
            flex: 1,
            minWidth: 220,
            background: colors.white,
            borderRadius: 12,
            border: `1px solid ${colors.lightGray}`,
            padding: 24,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.darkText, marginTop: 0, marginBottom: 16 }}>
            Recent NFTs
          </h3>
          {[
            { title: "Website Redesign", rating: "5.0", date: "Feb 18" },
            { title: "Marketing Copy", rating: "4.8", date: "Feb 10" },
            { title: "App Prototype", rating: "5.0", date: "Jan 28" },
          ].map((n, i) => (
            <div
              key={i}
              style={{
                padding: "10px 0",
                borderTop: i > 0 ? `1px solid ${colors.lightGray}` : "none",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: colors.darkText }}>{n.title}</div>
              <div style={{ fontSize: 11, color: colors.grayText }}>
                ⭐ {n.rating} · {n.date}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        {[
          { label: "New Contract", icon: "📄", screen: SCREENS.NEW_CONTRACT },
          { label: "View Wallet", icon: "💰", screen: SCREENS.WALLET },
          { label: "My NFTs", icon: "🏆", screen: SCREENS.NFTS },
        ].map((a, i) => (
          <button
            key={i}
            onClick={() => setScreen(a.screen)}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: `1px solid ${colors.lightGray}`,
              background: colors.white,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: colors.darkText,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {a.icon} {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== SCREEN: Wallet =====
function WalletScreen() {
  const [currency, setCurrency] = useState("EUR");
  return (
    <div style={{ padding: 32 }}>
      {/* Total Balance Card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.sidebar} 0%, ${colors.brand} 100%)`,
          borderRadius: 16,
          padding: "32px 40px",
          color: colors.white,
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Total Balance</div>
        <div style={{ fontSize: 40, fontWeight: 700 }}>€4,820.50</div>
        <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
          {["EUR", "USD", "XRP"].map((c) => (
            <span
              key={c}
              onClick={() => setCurrency(c)}
              style={{
                padding: "4px 14px",
                borderRadius: 20,
                fontSize: 12,
                cursor: "pointer",
                background: currency === c ? "rgba(255,255,255,0.2)" : "transparent",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Token Balances */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        {[
          { token: "RLUSD", amount: "3,200.00", icon: "💵", change: "+240 this week" },
          { token: "XRP", amount: "1,420.50", icon: "⚡", change: "+5.2% today" },
          { token: "EUR", amount: "200.00", icon: "🇪🇺", change: "GateHub" },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 180,
              background: colors.white,
              borderRadius: 12,
              border: `1px solid ${colors.lightGray}`,
              padding: "20px 24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: colors.darkText }}>{b.token}</span>
              <span style={{ fontSize: 20 }}>{b.icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.darkText, marginTop: 8 }}>{b.amount}</div>
            <div style={{ fontSize: 11, color: colors.green, marginTop: 4 }}>{b.change}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {["Send", "Receive", "Swap", "Withdraw"].map((a) => (
          <button
            key={a}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: a === "Send" ? colors.brand : colors.white,
              color: a === "Send" ? colors.white : colors.darkText,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              boxShadow: a !== "Send" ? `0 0 0 1px ${colors.lightGray}` : "none",
            }}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Recent Transactions */}
      <div
        style={{
          background: colors.white,
          borderRadius: 12,
          border: `1px solid ${colors.lightGray}`,
          padding: 24,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, color: colors.darkText }}>Recent Transactions</h3>
        {[
          { type: "Escrow Release", from: "Alice M.", amount: "+€400", time: "2 hours ago", status: "confirmed" },
          { type: "Escrow Funded", from: "TechCo Inc.", amount: "€1,200 locked", time: "1 day ago", status: "locked" },
          { type: "DEX Swap", from: "XRP → RLUSD", amount: "500 XRP", time: "3 days ago", status: "confirmed" },
        ].map((tx, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderTop: `1px solid ${colors.lightGray}`,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: colors.darkText }}>{tx.type}</div>
              <div style={{ fontSize: 11, color: colors.grayText }}>
                {tx.from} · {tx.time}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: tx.amount.startsWith("+") ? colors.green : colors.darkText,
                }}
              >
                {tx.amount}
              </div>
              <Badge color={tx.status === "confirmed" ? "green" : "yellow"}>{tx.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== SCREEN: Contracts List =====
function ContractsScreen({ setScreen }) {
  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["All", "Active", "Funded", "Completed", "Disputed"].map((f) => (
            <span
              key={f}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                cursor: "pointer",
                background: f === "All" ? colors.brand : colors.white,
                color: f === "All" ? colors.white : colors.grayText,
                border: `1px solid ${f === "All" ? colors.brand : colors.lightGray}`,
              }}
            >
              {f}
            </span>
          ))}
        </div>
        <button
          onClick={() => setScreen(SCREENS.NEW_CONTRACT)}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: "none",
            background: colors.brand,
            color: colors.white,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + New Contract
        </button>
      </div>

      {[
        { title: "Brand Identity Package", client: "Alice M.", amount: "€800", status: "active", template: "Fixed Price", progress: "1/1 milestones" },
        { title: "Blog Series (5 articles)", client: "TechCo Inc.", amount: "€1,200", status: "funded", template: "Milestone", progress: "0/5 milestones" },
        { title: "Logo Animation", client: "Bob K.", amount: "€450", status: "active", template: "Fixed Price", progress: "1/1 milestones" },
        { title: "Product Photography", client: "Sara L.", amount: "€600", status: "completed", template: "Fixed Price", progress: "1/1 milestones" },
        { title: "UX Audit Report", client: "DevCorp", amount: "€2,000", status: "draft", template: "Milestone", progress: "0/3 milestones" },
      ].map((c, i) => (
        <div
          key={i}
          onClick={() => setScreen(SCREENS.CONTRACT_DETAIL)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            background: colors.white,
            borderRadius: 12,
            border: `1px solid ${colors.lightGray}`,
            marginBottom: 8,
            cursor: "pointer",
          }}
        >
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.darkText }}>{c.title}</div>
            <div style={{ fontSize: 12, color: colors.grayText }}>
              {c.client} · {c.template} · {c.progress}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.darkText }}>{c.amount}</div>
            <Badge
              color={
                { active: "green", funded: "yellow", completed: "blue", draft: "gray", disputed: "red" }[c.status]
              }
            >
              {c.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== SCREEN: Contract Detail =====
function ContractDetailScreen({ setScreen }) {
  return (
    <div style={{ padding: 32 }}>
      <div
        onClick={() => setScreen(SCREENS.CONTRACTS)}
        style={{ fontSize: 12, color: colors.teal, cursor: "pointer", marginBottom: 16 }}
      >
        ← Back to Contracts
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Main Info */}
        <div
          style={{
            flex: 2,
            minWidth: 340,
            background: colors.white,
            borderRadius: 12,
            border: `1px solid ${colors.lightGray}`,
            padding: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.darkText, margin: "0 0 4px" }}>
                Blog Series (5 articles)
              </h2>
              <div style={{ fontSize: 13, color: colors.grayText }}>
                Client: TechCo Inc. · Template: Milestone
              </div>
            </div>
            <Badge color="yellow">funded</Badge>
          </div>

          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 20,
              padding: "16px 0",
              borderTop: `1px solid ${colors.lightGray}`,
              borderBottom: `1px solid ${colors.lightGray}`,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: colors.grayText }}>Total</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.darkText }}>€1,200</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: colors.grayText }}>Currency</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.darkText }}>RLUSD</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: colors.grayText }}>Platform Fee</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.darkText }}>€24 (2%)</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: colors.grayText }}>Deadline</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.darkText }}>Mar 15</div>
            </div>
          </div>

          {/* Milestones */}
          <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.darkText, marginTop: 20 }}>Milestones</h3>
          {[
            { seq: 1, title: "Article 1: AI in Healthcare", amount: "€240", status: "funded", deadline: "Feb 28" },
            { seq: 2, title: "Article 2: Blockchain in Supply Chain", amount: "€240", status: "pending", deadline: "Mar 5" },
            { seq: 3, title: "Article 3: Future of Remote Work", amount: "€240", status: "pending", deadline: "Mar 8" },
            { seq: 4, title: "Article 4: Green Tech Trends", amount: "€240", status: "pending", deadline: "Mar 12" },
            { seq: 5, title: "Article 5: Cybersecurity Basics", amount: "€240", status: "pending", deadline: "Mar 15" },
          ].map((m) => (
            <div
              key={m.seq}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: `1px solid ${colors.lightGray}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    background: m.status === "funded" ? colors.green : "#F1F5F9",
                    color: m.status === "funded" ? colors.white : colors.grayText,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {m.seq}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: colors.darkText }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: colors.grayText }}>Due {m.deadline}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.darkText }}>{m.amount}</div>
                <Badge color={m.status === "funded" ? "yellow" : "gray"}>{m.status}</Badge>
              </div>
            </div>
          ))}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                background: colors.brand,
                color: colors.white,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Submit Deliverable
            </button>
            <button
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: `1px solid ${colors.lightGray}`,
                background: colors.white,
                color: colors.grayText,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Raise Dispute
            </button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ flex: 1, minWidth: 220 }}>
          {/* Escrow Status */}
          <div
            style={{
              background: colors.white,
              borderRadius: 12,
              border: `1px solid ${colors.lightGray}`,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <h4 style={{ fontSize: 13, fontWeight: 600, color: colors.darkText, marginTop: 0 }}>Escrow Status</h4>
            <div
              style={{
                background: "#FFFBEB",
                borderRadius: 8,
                padding: 12,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "#92400E" }}>Locked on XRPL</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#92400E" }}>€240</div>
              <div style={{ fontSize: 10, color: "#92400E" }}>Milestone 1 of 5</div>
            </div>
            <div style={{ fontSize: 11, color: colors.grayText, marginTop: 8 }}>
              Tx: rE3x...9kF2 · Ledger #84291023
            </div>
          </div>

          {/* On-chain Activity */}
          <div
            style={{
              background: colors.white,
              borderRadius: 12,
              border: `1px solid ${colors.lightGray}`,
              padding: 20,
            }}
          >
            <h4 style={{ fontSize: 13, fontWeight: 600, color: colors.darkText, marginTop: 0 }}>On-Chain Activity</h4>
            {[
              { action: "Escrow Created", time: "Feb 20, 14:32", hash: "A3F2...8B1C" },
              { action: "Trust Line Set", time: "Feb 20, 14:30", hash: "7D9E...2F4A" },
            ].map((a, i) => (
              <div key={i} style={{ padding: "8px 0", borderTop: i > 0 ? `1px solid ${colors.lightGray}` : "none" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: colors.darkText }}>{a.action}</div>
                <div style={{ fontSize: 10, color: colors.grayText }}>
                  {a.time} · {a.hash}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== SCREEN: New Contract =====
function NewContractScreen({ setScreen }) {
  return (
    <div style={{ padding: 32, maxWidth: 640 }}>
      <div
        onClick={() => setScreen(SCREENS.CONTRACTS)}
        style={{ fontSize: 12, color: colors.teal, cursor: "pointer", marginBottom: 16 }}
      >
        ← Back to Contracts
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.darkText, marginTop: 0 }}>Create New Contract</h2>

      {/* Template Selection */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: colors.darkText, display: "block", marginBottom: 8 }}>
          Template
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { name: "Fixed Price", desc: "Single deliverable", active: true },
            { name: "Milestone", desc: "Multiple phases", active: false },
            { name: "Retainer", desc: "Monthly", active: false },
          ].map((t) => (
            <div
              key={t.name}
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                border: `2px solid ${t.active ? colors.brand : colors.lightGray}`,
                background: t.active ? "#EFF6FF" : colors.white,
                cursor: "pointer",
                minWidth: 120,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: t.active ? colors.brand : colors.darkText }}>
                {t.name}
              </div>
              <div style={{ fontSize: 11, color: colors.grayText }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      {[
        { label: "Contract Title", placeholder: "e.g., Brand Identity Package" },
        { label: "Description", placeholder: "Describe the scope of work...", textarea: true },
        { label: "Client Email", placeholder: "client@example.com" },
      ].map((f, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <label
            style={{ fontSize: 13, fontWeight: 600, color: colors.darkText, display: "block", marginBottom: 6 }}
          >
            {f.label}
          </label>
          {f.textarea ? (
            <div
              style={{
                width: "100%",
                height: 80,
                borderRadius: 8,
                border: `1px solid ${colors.lightGray}`,
                padding: 12,
                fontSize: 13,
                color: colors.grayText,
                boxSizing: "border-box",
              }}
            >
              {f.placeholder}
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                height: 40,
                borderRadius: 8,
                border: `1px solid ${colors.lightGray}`,
                padding: "0 12px",
                fontSize: 13,
                color: colors.grayText,
                display: "flex",
                alignItems: "center",
                boxSizing: "border-box",
              }}
            >
              {f.placeholder}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.darkText, display: "block", marginBottom: 6 }}>
            Amount
          </label>
          <div
            style={{
              height: 40,
              borderRadius: 8,
              border: `1px solid ${colors.lightGray}`,
              padding: "0 12px",
              fontSize: 13,
              color: colors.grayText,
              display: "flex",
              alignItems: "center",
            }}
          >
            500.00
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.darkText, display: "block", marginBottom: 6 }}>
            Currency
          </label>
          <div
            style={{
              height: 40,
              borderRadius: 8,
              border: `1px solid ${colors.lightGray}`,
              padding: "0 12px",
              fontSize: 13,
              color: colors.darkText,
              display: "flex",
              alignItems: "center",
              fontWeight: 500,
            }}
          >
            RLUSD (≈ €500)
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#F0FDF4",
          borderRadius: 8,
          padding: 12,
          marginBottom: 24,
          fontSize: 12,
          color: "#166534",
        }}
      >
        Platform fee: €10 (2%) · Client pays: €510 total · You receive: €500
      </div>

      <button
        style={{
          padding: "12px 32px",
          borderRadius: 8,
          border: "none",
          background: colors.brand,
          color: colors.white,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          width: "100%",
        }}
      >
        Create Contract & Send to Client
      </button>
    </div>
  );
}

// ===== SCREEN: NFTs =====
function NFTsScreen() {
  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["All NFTs", "Proof of Work", "Licenses", "Access Passes"].map((f, i) => (
          <span
            key={f}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              cursor: "pointer",
              background: i === 0 ? colors.brand : colors.white,
              color: i === 0 ? colors.white : colors.grayText,
              border: `1px solid ${i === 0 ? colors.brand : colors.lightGray}`,
            }}
          >
            {f}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { title: "Website Redesign", type: "Proof of Work", taxon: 1, rating: "5.0", client: "Alice M.", date: "Feb 18", amount: "€800" },
          { title: "Marketing Copy (10 pages)", type: "Proof of Work", taxon: 1, rating: "4.8", client: "TechCo", date: "Feb 10", amount: "€320" },
          { title: "App Prototype v2", type: "Proof of Work", taxon: 1, rating: "5.0", client: "StartupX", date: "Jan 28", amount: "€1,500" },
          { title: "Brand Guidelines — Full License", type: "License", taxon: 2, client: "Alice M.", date: "Feb 18", rights: "Commercial, Worldwide" },
          { title: "Logo Package — Limited Use", type: "License", taxon: 2, client: "Bob K.", date: "Jan 15", rights: "Personal, EU Only" },
          { title: "Priority Access — Gold Tier", type: "Access Pass", taxon: 3, client: "5 holders", date: "Ongoing", tier: "€50 RLUSD" },
        ].map((nft, i) => (
          <div
            key={i}
            style={{
              width: 220,
              background: colors.white,
              borderRadius: 12,
              border: `1px solid ${colors.lightGray}`,
              overflow: "hidden",
            }}
          >
            {/* Color header based on taxon */}
            <div
              style={{
                height: 6,
                background: nft.taxon === 1 ? colors.brand : nft.taxon === 2 ? colors.teal : colors.gold,
              }}
            />
            <div style={{ padding: 16 }}>
              <Badge color={nft.taxon === 1 ? "blue" : nft.taxon === 2 ? "green" : "yellow"}>
                Taxon {nft.taxon}
              </Badge>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.darkText, marginTop: 8 }}>{nft.title}</div>
              <div style={{ fontSize: 11, color: colors.grayText, marginTop: 2 }}>{nft.type}</div>

              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${colors.lightGray}`,
                  fontSize: 11,
                  color: colors.grayText,
                }}
              >
                {nft.rating && <div>⭐ {nft.rating} · {nft.client}</div>}
                {nft.rights && <div>{nft.rights}</div>}
                {nft.tier && <div>{nft.tier} · {nft.client}</div>}
                <div style={{ marginTop: 4 }}>
                  {nft.amount && <span style={{ fontWeight: 600, color: colors.darkText }}>{nft.amount}</span>}
                  {" · "}{nft.date}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== SCREEN: Profile =====
function ProfileScreen() {
  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Profile Card */}
        <div
          style={{
            width: 280,
            background: colors.white,
            borderRadius: 12,
            border: `1px solid ${colors.lightGray}`,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              background: colors.teal,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.white,
              fontSize: 28,
              fontWeight: 700,
              margin: "0 auto 12px",
            }}
          >
            RR
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.darkText, margin: "0 0 4px" }}>Remy Ruozzi</h3>
          <div style={{ fontSize: 12, color: colors.grayText, marginBottom: 8 }}>Creator · Writer & Designer</div>
          <Badge color="green">Verified</Badge>

          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${colors.lightGray}`,
            }}
          >
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.darkText }}>12</div>
              <div style={{ fontSize: 10, color: colors.grayText }}>Jobs</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.darkText }}>4.9</div>
              <div style={{ fontSize: 10, color: colors.grayText }}>Rating</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.darkText }}>12</div>
              <div style={{ fontSize: 10, color: colors.grayText }}>NFTs</div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: colors.grayText, marginTop: 12, fontFamily: "monospace" }}>
            rPx8...kF2m
          </div>
        </div>

        {/* Reputation (from chain) */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div
            style={{
              background: colors.white,
              borderRadius: 12,
              border: `1px solid ${colors.lightGray}`,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.darkText, marginTop: 0 }}>
              On-Chain Reputation
            </h3>
            <p style={{ fontSize: 12, color: colors.grayText, margin: "4px 0 16px" }}>
              Derived from XRPL. Cannot be faked or deleted.
            </p>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { label: "Total Earned", value: "€4,820" },
                { label: "Avg per Job", value: "€402" },
                { label: "On-Time Rate", value: "100%" },
                { label: "Repeat Clients", value: "3" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    background: "#F8FAFC",
                    borderRadius: 8,
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: colors.darkText }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: colors.grayText }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: colors.white,
              borderRadius: 12,
              border: `1px solid ${colors.lightGray}`,
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.darkText, marginTop: 0 }}>Skills</h3>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Writing", "Brand Design", "UI/UX", "Content Strategy", "Logo Design", "Copywriting"].map((s) => (
                <span
                  key={s}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 16,
                    background: "#EFF6FF",
                    color: colors.brand,
                    fontSize: 12,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== SCREEN: Settings =====
function SettingsScreen() {
  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <div
        style={{
          background: colors.white,
          borderRadius: 12,
          border: `1px solid ${colors.lightGray}`,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.darkText, marginTop: 0 }}>Payout Configuration</h3>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.darkText, display: "block", marginBottom: 6 }}>
            Strategy
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { name: "Single", desc: "One currency" },
              { name: "Split", desc: "Multiple currencies", active: true },
              { name: "Stack", desc: "Hold & grow" },
            ].map((s) => (
              <div
                key={s.name}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `2px solid ${s.active ? colors.brand : colors.lightGray}`,
                  background: s.active ? "#EFF6FF" : colors.white,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: s.active ? colors.brand : colors.darkText }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 10, color: colors.grayText }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Allocation */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.darkText, display: "block", marginBottom: 6 }}>
            Allocation
          </label>
          {[
            { currency: "RLUSD", pct: 70, action: "Auto-withdraw" },
            { currency: "XRP", pct: 30, action: "Stack (hold)" },
          ].map((a) => (
            <div
              key={a.currency}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                borderBottom: `1px solid ${colors.lightGray}`,
              }}
            >
              <div style={{ width: 70, fontSize: 13, fontWeight: 600, color: colors.darkText }}>{a.currency}</div>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: "#F1F5F9",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${a.pct}%`,
                    height: "100%",
                    background: a.currency === "RLUSD" ? colors.brand : colors.gold,
                    borderRadius: 4,
                  }}
                />
              </div>
              <div style={{ width: 30, fontSize: 13, fontWeight: 600, color: colors.darkText }}>{a.pct}%</div>
              <div style={{ fontSize: 11, color: colors.grayText, width: 90 }}>{a.action}</div>
            </div>
          ))}
        </div>

        {/* Auto-withdraw */}
        <div
          style={{
            background: "#F8FAFC",
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
            color: colors.grayText,
          }}
        >
          Auto-withdraw RLUSD to bank when balance exceeds €500 · Weekly
        </div>
      </div>

      <div
        style={{
          background: colors.white,
          borderRadius: 12,
          border: `1px solid ${colors.lightGray}`,
          padding: 24,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.darkText, marginTop: 0 }}>Display Currency</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {["EUR", "USD", "GBP", "XRP"].map((c) => (
            <span
              key={c}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                fontSize: 13,
                cursor: "pointer",
                background: c === "EUR" ? colors.brand : colors.white,
                color: c === "EUR" ? colors.white : colors.grayText,
                border: `1px solid ${c === "EUR" ? colors.brand : colors.lightGray}`,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN APP =====
export default function StudioLedgerWireframes() {
  const [screen, setScreen] = useState(SCREENS.DASHBOARD);

  const screenMap = {
    [SCREENS.DASHBOARD]: { title: "Dashboard", component: <DashboardScreen setScreen={setScreen} /> },
    [SCREENS.WALLET]: { title: "Wallet", component: <WalletScreen /> },
    [SCREENS.CONTRACTS]: { title: "Contracts", component: <ContractsScreen setScreen={setScreen} /> },
    [SCREENS.CONTRACT_DETAIL]: { title: "Contract Detail", component: <ContractDetailScreen setScreen={setScreen} /> },
    [SCREENS.NEW_CONTRACT]: { title: "New Contract", component: <NewContractScreen setScreen={setScreen} /> },
    [SCREENS.NFTS]: { title: "NFT Portfolio", component: <NFTsScreen /> },
    [SCREENS.PROFILE]: { title: "Public Profile", component: <ProfileScreen /> },
    [SCREENS.SETTINGS]: { title: "Settings", component: <SettingsScreen /> },
  };

  const current = screenMap[screen];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        background: colors.bg,
        overflow: "hidden",
      }}
    >
      <Sidebar active={screen} setScreen={setScreen} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar title={current.title} />
        <div style={{ flex: 1, overflow: "auto" }}>{current.component}</div>
      </div>
    </div>
  );
}
