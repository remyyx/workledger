import { useState, useCallback, useMemo } from "react";

const COLORS = {
  navy: "#0A1628",
  gold: "#C9A84C",
  cream: "#F5F0E8",
  slate: "#2D3E50",
  green: "#1A3A2A",
  copper: "#B87333",
  rose: "#B76E79",
  charcoal: "#2C2C2C",
  bg: "#0D1117",
  cardBg: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  textMuted: "#8B949E",
  accent: "#C9A84C",
  link: "#58A6FF",
};

// ─── Data Model ──────────────────────────────────────────
const LAYERS = [
  {
    id: "frontend",
    label: "Frontend",
    color: "#3B82F6",
    y: 0,
    nodes: [
      { id: "nextjs", label: "Next.js 14", desc: "App Router, RSC, Server Actions" },
      { id: "dashboard", label: "Dashboard", desc: "/dashboard — role-aware (CR/MK)" },
      { id: "marketplace", label: "Marketplace", desc: "Creator discovery, MakeOfferModal" },
      { id: "contracts-ui", label: "Contract Detail", desc: "Milestone flow, activity timeline" },
      { id: "mcc-portfolio", label: "MCC Portfolio", desc: "Credential cards, federal aesthetic" },
      { id: "admin-ui", label: "Admin Panel", desc: "Internal dashboard (Phase 2)" },
    ],
  },
  {
    id: "api",
    label: "API Routes",
    color: "#8B5CF6",
    y: 1,
    nodes: [
      { id: "contracts-api", label: "/api/contracts", desc: "CRUD + state machine transitions" },
      { id: "proposals-api", label: "/api/proposals", desc: "CR→MK + MK→CR negotiation" },
      { id: "milestones-api", label: "/api/milestones/[seq]", desc: "fund, submit, approve, release, dispute" },
      { id: "mccs-api", label: "/api/mccs", desc: "Credential queries + portfolio" },
      { id: "admin-api", label: "/api/admin/*", desc: "Auth, disputes, audit (Phase 2)" },
      { id: "test-api", label: "/api/test/*", desc: "Mock escrow, mock mint (dev only)" },
    ],
  },
  {
    id: "services",
    label: "Service Layer",
    color: "#F59E0B",
    y: 2,
    nodes: [
      { id: "escrow", label: "Escrow Engine", desc: "milestone-escrow.ts — fund/release/refund" },
      { id: "mint", label: "MCC Mint", desc: "mint-credential.ts — T1+T4 on release" },
      { id: "crypto", label: "Crypto", desc: "AES-256-GCM — preimages + wallet seeds" },
      { id: "messages", label: "Contract Messages", desc: "Activity timeline, system events" },
      { id: "wallet", label: "Wallet Manager", desc: "Philosophy A — platform-managed XRPL" },
      { id: "n8n-client", label: "n8n Client", desc: "14 event types → workflow triggers" },
    ],
  },
  {
    id: "external",
    label: "External Systems",
    color: "#10B981",
    y: 3,
    nodes: [
      { id: "xrpl", label: "XRPL Ledger", desc: "Escrow, NFTokenMint, Payments, Trust Lines" },
      { id: "supabase", label: "Supabase", desc: "Postgres + RLS + Auth (Google OAuth)" },
      { id: "pinata", label: "Pinata/IPFS", desc: "MCC metadata storage" },
      { id: "n8n", label: "n8n Workflows", desc: "Notifications, automations, webhooks" },
      { id: "austrac", label: "AUSTRAC", desc: "Compliance reporting (VASP registered)" },
    ],
  },
  {
    id: "admin",
    label: "Admin Layer",
    color: "#EF4444",
    y: 4,
    nodes: [
      { id: "boss", label: "Boss", desc: "Full access — remy@studioledger.ai" },
      { id: "dev", label: "Dev", desc: "Database + architecture" },
      { id: "accounting", label: "Accounting", desc: "Financial data + reports" },
      { id: "commercial", label: "Commercial", desc: "Contract design + disputes" },
      { id: "protocol", label: "Protocol", desc: "UX/UI + platform config" },
    ],
  },
];

const CONNECTIONS = [
  // Frontend → API
  { from: "dashboard", to: "contracts-api", label: "fetch" },
  { from: "marketplace", to: "proposals-api", label: "offer" },
  { from: "contracts-ui", to: "milestones-api", label: "actions" },
  { from: "mcc-portfolio", to: "mccs-api", label: "query" },
  { from: "admin-ui", to: "admin-api", label: "manage" },
  // API → Services
  { from: "contracts-api", to: "escrow", label: "fund" },
  { from: "contracts-api", to: "crypto", label: "encrypt" },
  { from: "milestones-api", to: "escrow", label: "release" },
  { from: "milestones-api", to: "mint", label: "mint MCC" },
  { from: "milestones-api", to: "messages", label: "log" },
  { from: "contracts-api", to: "n8n-client", label: "events" },
  // Services → External
  { from: "escrow", to: "xrpl", label: "EscrowCreate/Finish" },
  { from: "mint", to: "xrpl", label: "NFTokenMint" },
  { from: "mint", to: "pinata", label: "metadata" },
  { from: "wallet", to: "xrpl", label: "wallet ops" },
  { from: "crypto", to: "supabase", label: "encrypted store" },
  { from: "n8n-client", to: "n8n", label: "webhooks" },
  { from: "messages", to: "supabase", label: "insert" },
  // Admin
  { from: "admin-api", to: "supabase", label: "admin_accounts" },
  { from: "commercial", to: "admin-api", label: "disputes" },
  { from: "boss", to: "admin-api", label: "all access" },
];

// ─── Contract Lifecycle State Machine ──────────────────
const LIFECYCLE_STATES = [
  { id: "draft", label: "Draft", color: "#6B7280", x: 50, y: 40 },
  { id: "proposed", label: "Proposed", color: "#8B5CF6", x: 200, y: 40 },
  { id: "funded", label: "Funded", color: "#3B82F6", x: 350, y: 40 },
  { id: "submitted", label: "Submitted", color: "#F59E0B", x: 350, y: 140 },
  { id: "approved", label: "Approved", color: "#10B981", x: 200, y: 140 },
  { id: "released", label: "Released", color: "#C9A84C", x: 50, y: 140 },
  { id: "disputed", label: "Disputed", color: "#EF4444", x: 500, y: 90 },
  { id: "mcc_minted", label: "MCC Minted", color: "#C9A84C", x: 50, y: 220 },
];

const LIFECYCLE_TRANSITIONS = [
  { from: "draft", to: "proposed", label: "propose" },
  { from: "proposed", to: "funded", label: "fund escrow" },
  { from: "funded", to: "submitted", label: "submit work" },
  { from: "submitted", to: "approved", label: "approve" },
  { from: "submitted", to: "funded", label: "request changes" },
  { from: "approved", to: "released", label: "release escrow" },
  { from: "released", to: "mcc_minted", label: "auto-mint T1+T4" },
  { from: "funded", to: "disputed", label: "dispute" },
  { from: "submitted", to: "disputed", label: "dispute" },
  { from: "approved", to: "disputed", label: "dispute" },
];

// ─── Database Schema View ──────────────────────────────
const DB_TABLES = [
  {
    group: "Core",
    color: "#3B82F6",
    tables: [
      { name: "users", cols: "id, email, display_name, role, xrpl_address, encrypted_seed" },
      { name: "contracts", cols: "id, creator_id, marketplace_id, title, status, template, currency" },
      { name: "milestones", cols: "id, contract_id, sequence, status, amount, escrow_tx_hash" },
      { name: "contract_messages", cols: "id, contract_id, sender_id, type, content, metadata" },
    ],
  },
  {
    group: "Credentials",
    color: "#C9A84C",
    tables: [
      { name: "nft_registry", cols: "id, contract_id, milestone_id, nft_token_id, taxon, owner, mint_tx_hash" },
      { name: "dispute_events", cols: "id, contract_id, milestone_id, initiated_by, reason, status" },
    ],
  },
  {
    group: "Negotiation",
    color: "#8B5CF6",
    tables: [
      { name: "project_briefs", cols: "id, marketplace_id, title, description, budget, deadline" },
      { name: "proposals", cols: "id, brief_id, counterparty_id, direction, terms, status" },
      { name: "proposal_rounds", cols: "id, proposal_id, round_number, changes, proposed_by" },
    ],
  },
  {
    group: "Admin",
    color: "#EF4444",
    tables: [
      { name: "admin_accounts", cols: "id, email, admin_role, password_hash, is_active, created_by" },
      { name: "admin_sessions", cols: "id, admin_id, token_hash, ip_address, expires_at" },
      { name: "admin_audit_log", cols: "id, admin_id, action, target_type, target_id, details" },
      { name: "admin_permissions", cols: "id, admin_role, resource, can_read, can_write, can_delete" },
      { name: "dispute_arbitrators", cols: "id, user_id, status, skill_domains, mcc_count, approved_by" },
      { name: "dispute_panels", cols: "id, dispute_id, arbitrator_id, vote, vote_reason" },
    ],
  },
];

// ─── Fee Flow ──────────────────────────────────────────
const FEE_STEPS = [
  { label: "Client funds escrow", detail: "Full milestone amount locked on XRPL", icon: "🔒" },
  { label: "Creator submits work", detail: "Deliverable hash + media uploaded", icon: "📦" },
  { label: "Client approves", detail: "Milestone status → approved", icon: "✓" },
  { label: "Release escrow", detail: "EscrowFinish with encrypted fulfillment", icon: "🔓" },
  { label: "Deduct 0.98% fee", detail: "Decrypt creator seed → Payment to platform", icon: "💰" },
  { label: "Mint MCCs", detail: "T1 (creator) + T4 (client) auto-minted", icon: "🏅" },
  { label: "n8n events fire", detail: "mcc.minted + milestone.released webhooks", icon: "⚡" },
];

// ─── Components ────────────────────────────────────────

function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: `1px solid ${active === t.id ? COLORS.gold : COLORS.border}`,
            background: active === t.id ? COLORS.gold + "22" : COLORS.cardBg,
            color: active === t.id ? COLORS.gold : COLORS.textMuted,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: active === t.id ? 600 : 400,
            transition: "all 0.2s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ArchitectureView() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredConn, setHoveredConn] = useState(null);

  const nodePositions = useMemo(() => {
    const pos = {};
    LAYERS.forEach((layer) => {
      const count = layer.nodes.length;
      const totalW = 700;
      const spacing = totalW / (count + 1);
      layer.nodes.forEach((node, i) => {
        pos[node.id] = {
          x: spacing * (i + 1),
          y: 70 + layer.y * 110,
          color: layer.color,
          layer: layer.id,
        };
      });
    });
    return pos;
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" viewBox="0 0 750 600" style={{ overflow: "visible" }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.textMuted + "66"} />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.gold} />
          </marker>
        </defs>

        {/* Layer backgrounds */}
        {LAYERS.map((layer) => (
          <g key={layer.id}>
            <rect x={10} y={40 + layer.y * 110} width={730} height={95} rx={12} fill={layer.color + "08"} stroke={layer.color + "25"} strokeWidth={1} />
            <text x={24} y={58 + layer.y * 110} fill={layer.color} fontSize={10} fontWeight={600} opacity={0.7} fontFamily="system-ui">
              {layer.label.toUpperCase()}
            </text>
          </g>
        ))}

        {/* Connections */}
        {CONNECTIONS.map((conn, i) => {
          const fromPos = nodePositions[conn.from];
          const toPos = nodePositions[conn.to];
          if (!fromPos || !toPos) return null;
          const isActive = hoveredConn === i || selectedNode === conn.from || selectedNode === conn.to;
          const midY = (fromPos.y + toPos.y) / 2;
          return (
            <g key={i} onMouseEnter={() => setHoveredConn(i)} onMouseLeave={() => setHoveredConn(null)} style={{ cursor: "pointer" }}>
              <path
                d={`M ${fromPos.x} ${fromPos.y + 14} C ${fromPos.x} ${midY}, ${toPos.x} ${midY}, ${toPos.x} ${toPos.y - 14}`}
                fill="none"
                stroke={isActive ? COLORS.gold : COLORS.textMuted + "30"}
                strokeWidth={isActive ? 1.5 : 0.8}
                markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow)"}
                style={{ transition: "all 0.2s" }}
              />
              {isActive && (
                <text x={(fromPos.x + toPos.x) / 2} y={midY - 4} textAnchor="middle" fill={COLORS.gold} fontSize={8} fontFamily="system-ui" fontWeight={500}>
                  {conn.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {LAYERS.map((layer) =>
          layer.nodes.map((node) => {
            const pos = nodePositions[node.id];
            const isSelected = selectedNode === node.id;
            const isConnected = CONNECTIONS.some(
              (c) => (c.from === selectedNode && c.to === node.id) || (c.to === selectedNode && c.from === node.id)
            );
            const highlight = isSelected || isConnected;
            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={pos.x - 48}
                  y={pos.y - 14}
                  width={96}
                  height={28}
                  rx={6}
                  fill={highlight ? layer.color + "30" : COLORS.cardBg}
                  stroke={highlight ? layer.color : COLORS.border}
                  strokeWidth={highlight ? 1.5 : 1}
                  style={{ transition: "all 0.2s" }}
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fill={highlight ? COLORS.text : COLORS.textMuted}
                  fontSize={9}
                  fontWeight={highlight ? 600 : 400}
                  fontFamily="system-ui"
                >
                  {node.label}
                </text>
              </g>
            );
          })
        )}
      </svg>

      {/* Detail panel */}
      {selectedNode && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.gold}44`,
            borderRadius: 10,
            padding: "12px 16px",
            maxWidth: 220,
            boxShadow: `0 4px 20px ${COLORS.gold}11`,
          }}
        >
          {(() => {
            const node = LAYERS.flatMap((l) => l.nodes).find((n) => n.id === selectedNode);
            const layer = LAYERS.find((l) => l.nodes.some((n) => n.id === selectedNode));
            const inbound = CONNECTIONS.filter((c) => c.to === selectedNode);
            const outbound = CONNECTIONS.filter((c) => c.from === selectedNode);
            return (
              <>
                <div style={{ fontSize: 11, color: layer?.color, fontWeight: 600, marginBottom: 4 }}>
                  {layer?.label}
                </div>
                <div style={{ fontSize: 14, color: COLORS.text, fontWeight: 700, marginBottom: 6 }}>
                  {node?.label}
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 8 }}>
                  {node?.desc}
                </div>
                {inbound.length > 0 && (
                  <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>
                    <span style={{ color: COLORS.gold }}>← In:</span>{" "}
                    {inbound.map((c) => c.from).join(", ")}
                  </div>
                )}
                {outbound.length > 0 && (
                  <div style={{ fontSize: 10, color: COLORS.textMuted }}>
                    <span style={{ color: COLORS.gold }}>→ Out:</span>{" "}
                    {outbound.map((c) => `${c.to} (${c.label})`).join(", ")}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function LifecycleView() {
  const [activeState, setActiveState] = useState(null);

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 12 }}>
        Click a state to see its transitions. This is the milestone-level lifecycle — each milestone in a contract follows this path independently.
      </div>
      <svg width="100%" viewBox="0 0 620 270" style={{ overflow: "visible" }}>
        {/* Transitions */}
        {LIFECYCLE_TRANSITIONS.map((t, i) => {
          const from = LIFECYCLE_STATES.find((s) => s.id === t.from);
          const to = LIFECYCLE_STATES.find((s) => s.id === t.to);
          if (!from || !to) return null;
          const isActive = activeState === t.from || activeState === t.to;
          const fromX = from.x + 50;
          const fromY = from.y + 20;
          const toX = to.x + 50;
          const toY = to.y + 20;
          const midX = (fromX + toX) / 2;
          const midY = (fromY + toY) / 2;
          const isReverse = t.label === "request changes";
          const offset = isReverse ? -20 : 0;
          return (
            <g key={i}>
              <line
                x1={fromX}
                y1={fromY + offset}
                x2={toX}
                y2={toY + offset}
                stroke={isActive ? COLORS.gold : COLORS.textMuted + "40"}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={t.label === "dispute" ? "4 3" : "none"}
                markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow)"}
              />
              {isActive && (
                <text
                  x={midX}
                  y={midY + offset - 6}
                  textAnchor="middle"
                  fill={t.label === "dispute" ? "#EF4444" : COLORS.gold}
                  fontSize={9}
                  fontWeight={500}
                  fontFamily="system-ui"
                >
                  {t.label}
                </text>
              )}
            </g>
          );
        })}

        {/* States */}
        {LIFECYCLE_STATES.map((state) => {
          const isActive = activeState === state.id;
          const isConnected =
            activeState &&
            LIFECYCLE_TRANSITIONS.some(
              (t) => (t.from === activeState && t.to === state.id) || (t.to === activeState && t.from === state.id)
            );
          const highlight = isActive || isConnected;
          return (
            <g key={state.id} onClick={() => setActiveState(isActive ? null : state.id)} style={{ cursor: "pointer" }}>
              <rect
                x={state.x}
                y={state.y}
                width={100}
                height={38}
                rx={8}
                fill={highlight ? state.color + "30" : COLORS.cardBg}
                stroke={highlight ? state.color : COLORS.border}
                strokeWidth={highlight ? 2 : 1}
                style={{ transition: "all 0.2s" }}
              />
              <text
                x={state.x + 50}
                y={state.y + 23}
                textAnchor="middle"
                fill={highlight ? "#fff" : COLORS.textMuted}
                fontSize={11}
                fontWeight={highlight ? 700 : 500}
                fontFamily="system-ui"
              >
                {state.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DatabaseView() {
  const [expandedTable, setExpandedTable] = useState(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {DB_TABLES.map((group) => (
        <div
          key={group.group}
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${group.color}33`,
            borderRadius: 10,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: group.color, marginBottom: 10, letterSpacing: "0.05em" }}>
            {group.group.toUpperCase()}
          </div>
          {group.tables.map((table) => (
            <div
              key={table.name}
              onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
              style={{
                padding: "6px 8px",
                marginBottom: 4,
                borderRadius: 6,
                cursor: "pointer",
                background: expandedTable === table.name ? group.color + "18" : "transparent",
                border: `1px solid ${expandedTable === table.name ? group.color + "44" : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, fontFamily: "monospace" }}>
                {table.name}
              </div>
              {expandedTable === table.name && (
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.6, fontFamily: "monospace" }}>
                  {table.cols}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FeeFlowView() {
  const [activeStep, setActiveStep] = useState(null);

  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 16 }}>
        The 0.98% fee flow from escrow funding through MCC minting. Click any step for details.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {FEE_STEPS.map((step, i) => {
          const isActive = activeStep === i;
          const progress = ((i + 1) / FEE_STEPS.length) * 100;
          return (
            <div
              key={i}
              onClick={() => setActiveStep(isActive ? null : i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 8,
                cursor: "pointer",
                background: isActive ? COLORS.gold + "15" : COLORS.cardBg,
                border: `1px solid ${isActive ? COLORS.gold + "44" : COLORS.border}`,
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Progress bar */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${COLORS.gold}08, ${COLORS.gold}12)`,
                  transition: "width 0.3s",
                }}
              />
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: isActive ? COLORS.gold + "30" : COLORS.border + "50",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {step.icon}
              </div>
              <div style={{ position: "relative", flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? COLORS.gold : COLORS.text }}>
                  {step.label}
                </div>
                {isActive && (
                  <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>
                    {step.detail}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.textMuted,
                  fontFamily: "monospace",
                  position: "relative",
                }}
              >
                {i + 1}/{FEE_STEPS.length}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsBar() {
  const stats = [
    { label: "Tests", value: "216", sub: "12 suites" },
    { label: "Migrations", value: "15", sub: "001→015" },
    { label: "API Routes", value: "24", sub: "REST + test" },
    { label: "Fee", value: "0.98%", sub: "XRPL native" },
    { label: "MCC Taxons", value: "4", sub: "T1-T4" },
    { label: "Admin Roles", value: "5", sub: "migration 015" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 20 }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "8px 10px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.gold }}>{s.value}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.text, marginTop: 2 }}>{s.label}</div>
          <div style={{ fontSize: 9, color: COLORS.textMuted }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────

const TABS = [
  { id: "arch", label: "Architecture" },
  { id: "lifecycle", label: "Contract Lifecycle" },
  { id: "db", label: "Database Schema" },
  { id: "flow", label: "Fee Flow" },
];

export default function StudioLedgerArchitecture() {
  const [activeTab, setActiveTab] = useState("arch");

  return (
    <div
      style={{
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: 24,
        minHeight: "100vh",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.gold, margin: 0, letterSpacing: "-0.02em" }}>
            StudioLedger
          </h1>
          <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 400 }}>
            Architecture Overview — Session 17
          </span>
        </div>
        <div style={{ fontSize: 11, color: COLORS.textMuted }}>
          Web3 freelancer platform — XRPL escrow, milestone contracts, Minted Craft Credentials
        </div>
      </div>

      <StatsBar />
      <TabBar tabs={TABS} active={activeTab} onSelect={setActiveTab} />

      <div
        style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 20,
          minHeight: 400,
        }}
      >
        {activeTab === "arch" && <ArchitectureView />}
        {activeTab === "lifecycle" && <LifecycleView />}
        {activeTab === "db" && <DatabaseView />}
        {activeTab === "flow" && <FeeFlowView />}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 16, fontSize: 10, color: COLORS.textMuted, textAlign: "center" }}>
        Interactive — click nodes/states to explore connections. Built from 17 sessions of architecture.
      </div>
    </div>
  );
}
