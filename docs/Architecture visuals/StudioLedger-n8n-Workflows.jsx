import { useState, useCallback, useMemo } from "react";

// ─── Palette ──────────────────────────────────────────
const C = {
  bg: "#0D1117",
  card: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  gold: "#C9A84C",
  blue: "#58A6FF",
  green: "#3FB950",
  red: "#F85149",
  purple: "#BC8CFF",
  orange: "#F0883E",
  cyan: "#39D2C0",
  pink: "#F778BA",
};

// ─── n8n Node colors (mimic n8n's own palette) ───────
const N8N = {
  webhook: "#FF6D5A",
  switch: "#E8AA42",
  function: "#9B59B6",
  http: "#3498DB",
  email: "#2ECC71",
  slack: "#4A154B",
  telegram: "#0088CC",
  supabase: "#3ECF8E",
  xrpl: "#1A73E8",
  ifNode: "#E67E22",
  set: "#7F8C8D",
  wait: "#F39C12",
  merge: "#8E44AD",
  noOp: "#95A5A6",
};

// ─── Event Categories ─────────────────────────────────
const EVENT_CATEGORIES = [
  {
    id: "user",
    label: "User Events",
    color: C.cyan,
    events: [
      {
        id: "user.registered",
        label: "user.registered",
        trigger: "POST /api/auth/callback",
        payload: "{ user_id, email, role, display_name }",
        description: "Fires when a new user completes OAuth signup. Used for welcome emails, onboarding sequences, and CRM sync.",
        workflow: {
          name: "Welcome & Onboard",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "user.registered", x: 50, y: 80 },
            { id: "sw", type: "Switch", color: N8N.switch, label: "Check role", x: 210, y: 80 },
            { id: "cr", type: "Set", color: N8N.set, label: "Creator template", x: 370, y: 40 },
            { id: "mk", type: "Set", color: N8N.set, label: "Client template", x: 370, y: 120 },
            { id: "em", type: "Email", color: N8N.email, label: "Send welcome", x: 530, y: 80 },
            { id: "sb", type: "Supabase", color: N8N.supabase, label: "Log onboard", x: 690, y: 80 },
          ],
          edges: [
            { from: "wh", to: "sw" },
            { from: "sw", to: "cr", label: "creator" },
            { from: "sw", to: "mk", label: "marketplace" },
            { from: "cr", to: "em" },
            { from: "mk", to: "em" },
            { from: "em", to: "sb" },
          ],
        },
      },
    ],
  },
  {
    id: "contract",
    label: "Contract Events",
    color: C.blue,
    events: [
      {
        id: "contract.created",
        label: "contract.created",
        trigger: "POST /api/contracts",
        payload: "{ contract_id, creator_id, marketplace_id, title, template, currency, milestones[] }",
        description: "Fires after contract + milestones are inserted in DB. Triggers counterparty notification and contract summary generation.",
        workflow: {
          name: "Contract Notification",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "contract.created", x: 50, y: 80 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Format summary", x: 210, y: 80 },
            { id: "sb", type: "Supabase", color: N8N.supabase, label: "Get counterparty", x: 370, y: 80 },
            { id: "em", type: "Email", color: N8N.email, label: "Notify counterparty", x: 530, y: 50 },
            { id: "sl", type: "Slack", color: N8N.slack, label: "#contracts channel", x: 530, y: 120 },
          ],
          edges: [
            { from: "wh", to: "fn1" },
            { from: "fn1", to: "sb" },
            { from: "sb", to: "em" },
            { from: "sb", to: "sl" },
          ],
        },
      },
      {
        id: "contract.funded",
        label: "contract.funded",
        trigger: "POST /api/milestones/[seq] (fund)",
        payload: "{ contract_id, milestone_id, amount, currency, escrow_tx_hash }",
        description: "Fires when first milestone is funded via XRPL EscrowCreate. Signals the contract is live — work can begin.",
        workflow: {
          name: "Funding Confirmation",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "contract.funded", x: 50, y: 80 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Format amounts", x: 210, y: 80 },
            { id: "em1", type: "Email", color: N8N.email, label: "Notify creator", x: 370, y: 40 },
            { id: "em2", type: "Email", color: N8N.email, label: "Confirm to client", x: 370, y: 120 },
            { id: "xr", type: "HTTP", color: N8N.xrpl, label: "Verify on XRPL", x: 530, y: 80 },
          ],
          edges: [
            { from: "wh", to: "fn1" },
            { from: "fn1", to: "em1" },
            { from: "fn1", to: "em2" },
            { from: "fn1", to: "xr" },
          ],
        },
      },
      {
        id: "contract.completed",
        label: "contract.completed",
        trigger: "POST /api/milestones/[seq] (release last)",
        payload: "{ contract_id, total_paid, currency, milestones_count, mcc_count }",
        description: "Fires when the final milestone is released. All escrows settled, all MCCs minted. Triggers completion emails and portfolio update.",
        workflow: {
          name: "Completion & Review",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "contract.completed", x: 50, y: 80 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Build summary", x: 210, y: 80 },
            { id: "em1", type: "Email", color: N8N.email, label: "Creator receipt", x: 370, y: 30 },
            { id: "em2", type: "Email", color: N8N.email, label: "Client receipt", x: 370, y: 80 },
            { id: "sb", type: "Supabase", color: N8N.supabase, label: "Update stats", x: 370, y: 130 },
            { id: "sl", type: "Slack", color: N8N.slack, label: "#completed", x: 530, y: 80 },
          ],
          edges: [
            { from: "wh", to: "fn1" },
            { from: "fn1", to: "em1" },
            { from: "fn1", to: "em2" },
            { from: "fn1", to: "sb" },
            { from: "fn1", to: "sl" },
          ],
        },
      },
    ],
  },
  {
    id: "milestone",
    label: "Milestone Events",
    color: C.gold,
    events: [
      {
        id: "milestone.funded",
        label: "milestone.funded",
        trigger: "POST /api/milestones/[seq] (fund)",
        payload: "{ contract_id, milestone_id, sequence, amount, currency, escrow_tx_hash }",
        description: "Fires per-milestone when escrow is created. Distinct from contract.funded — this fires for M2, M3, etc. when auto-funded on prior release.",
        workflow: {
          name: "Milestone Escrow Alert",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "milestone.funded", x: 50, y: 80 },
            { id: "if1", type: "If", color: N8N.ifNode, label: "Is auto-fund?", x: 210, y: 80 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Format alert", x: 370, y: 50 },
            { id: "no", type: "NoOp", color: N8N.noOp, label: "Skip (manual)", x: 370, y: 120 },
            { id: "em", type: "Email", color: N8N.email, label: "Notify creator", x: 530, y: 50 },
          ],
          edges: [
            { from: "wh", to: "if1" },
            { from: "if1", to: "fn1", label: "yes" },
            { from: "if1", to: "no", label: "no" },
            { from: "fn1", to: "em" },
          ],
        },
      },
      {
        id: "milestone.submitted",
        label: "milestone.submitted",
        trigger: "POST /api/milestones/[seq] (submit)",
        payload: "{ contract_id, milestone_id, sequence, deliverable_hash, deliverable_notes }",
        description: "Creator submitted deliverables. Client needs to review. Time-sensitive — sets the review clock.",
        workflow: {
          name: "Review Request",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "milestone.submitted", x: 50, y: 80 },
            { id: "sb", type: "Supabase", color: N8N.supabase, label: "Get client info", x: 210, y: 80 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Build review link", x: 370, y: 80 },
            { id: "em", type: "Email", color: N8N.email, label: "Review request", x: 530, y: 50 },
            { id: "wt", type: "Wait", color: N8N.wait, label: "48h timeout", x: 530, y: 120 },
            { id: "em2", type: "Email", color: N8N.email, label: "Reminder", x: 690, y: 120 },
          ],
          edges: [
            { from: "wh", to: "sb" },
            { from: "sb", to: "fn1" },
            { from: "fn1", to: "em" },
            { from: "fn1", to: "wt" },
            { from: "wt", to: "em2" },
          ],
        },
      },
      {
        id: "milestone.approved",
        label: "milestone.approved",
        trigger: "POST /api/milestones/[seq] (approve)",
        payload: "{ contract_id, milestone_id, sequence, approved_by }",
        description: "Client approved the deliverable. Creator can now expect escrow release. Informational — the release is the real trigger.",
        workflow: {
          name: "Approval Notification",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "milestone.approved", x: 50, y: 80 },
            { id: "em", type: "Email", color: N8N.email, label: "Notify creator", x: 210, y: 80 },
          ],
          edges: [{ from: "wh", to: "em" }],
        },
      },
      {
        id: "milestone.released",
        label: "milestone.released",
        trigger: "releaseMilestoneAndAdvance()",
        payload: "{ contract_id, milestone_id, sequence, amount, currency, fee_amount, creator_address, escrow_finish_hash }",
        description: "The big one. Escrow finished, 0.98% fee deducted, funds released to creator. Triggers MCC mint, next milestone auto-fund, and financial logging.",
        workflow: {
          name: "Release Pipeline",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "milestone.released", x: 30, y: 100 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Parse amounts", x: 170, y: 100 },
            { id: "xr1", type: "HTTP", color: N8N.xrpl, label: "Verify escrow tx", x: 310, y: 40 },
            { id: "em1", type: "Email", color: N8N.email, label: "Creator receipt", x: 310, y: 100 },
            { id: "em2", type: "Email", color: N8N.email, label: "Client receipt", x: 310, y: 160 },
            { id: "sb1", type: "Supabase", color: N8N.supabase, label: "Log fee", x: 460, y: 40 },
            { id: "sl", type: "Slack", color: N8N.slack, label: "#releases", x: 460, y: 100 },
            { id: "sb2", type: "Supabase", color: N8N.supabase, label: "Update stats", x: 460, y: 160 },
          ],
          edges: [
            { from: "wh", to: "fn1" },
            { from: "fn1", to: "xr1" },
            { from: "fn1", to: "em1" },
            { from: "fn1", to: "em2" },
            { from: "xr1", to: "sb1" },
            { from: "em1", to: "sl" },
            { from: "em2", to: "sb2" },
          ],
        },
      },
      {
        id: "milestone.disputed",
        label: "milestone.disputed",
        trigger: "POST /api/milestones/[seq] (dispute)",
        payload: "{ contract_id, milestone_id, sequence, initiated_by, reason }",
        description: "Either party raised a dispute. Freezes the milestone. Triggers admin notification and dispute panel assignment.",
        workflow: {
          name: "Dispute Handler",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "milestone.disputed", x: 50, y: 80 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Format dispute", x: 210, y: 80 },
            { id: "sb", type: "Supabase", color: N8N.supabase, label: "Create dispute_event", x: 370, y: 40 },
            { id: "em1", type: "Email", color: N8N.email, label: "Notify both parties", x: 370, y: 100 },
            { id: "sl", type: "Slack", color: N8N.slack, label: "#disputes (urgent)", x: 370, y: 160 },
            { id: "em2", type: "Email", color: N8N.email, label: "Alert admin (commercial)", x: 530, y: 100 },
          ],
          edges: [
            { from: "wh", to: "fn1" },
            { from: "fn1", to: "sb" },
            { from: "fn1", to: "em1" },
            { from: "fn1", to: "sl" },
            { from: "em1", to: "em2" },
          ],
        },
      },
    ],
  },
  {
    id: "dispute",
    label: "Dispute Events",
    color: C.red,
    events: [
      {
        id: "dispute.opened",
        label: "dispute.opened",
        trigger: "POST /api/disputes",
        payload: "{ dispute_id, contract_id, milestone_id, initiator_id, reason, evidence_urls }",
        description: "Formal dispute created (distinct from milestone.disputed). Assigns arbitration panel, notifies commercial admin.",
        workflow: {
          name: "Panel Assignment",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "dispute.opened", x: 50, y: 80 },
            { id: "sb1", type: "Supabase", color: N8N.supabase, label: "Find arbitrators", x: 210, y: 80 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Select panel (3)", x: 370, y: 80 },
            { id: "sb2", type: "Supabase", color: N8N.supabase, label: "Create dispute_panels", x: 530, y: 50 },
            { id: "em", type: "Email", color: N8N.email, label: "Notify arbitrators", x: 530, y: 120 },
          ],
          edges: [
            { from: "wh", to: "sb1" },
            { from: "sb1", to: "fn1" },
            { from: "fn1", to: "sb2" },
            { from: "fn1", to: "em" },
          ],
        },
      },
      {
        id: "dispute.escalated",
        label: "dispute.escalated",
        trigger: "Admin action",
        payload: "{ dispute_id, escalated_by, reason, previous_votes }",
        description: "Panel deadlocked or party appeals. Escalates to boss admin for final ruling.",
        workflow: {
          name: "Escalation Alert",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "dispute.escalated", x: 50, y: 80 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Build case file", x: 210, y: 80 },
            { id: "em", type: "Email", color: N8N.email, label: "Boss + commercial", x: 370, y: 50 },
            { id: "sl", type: "Slack", color: N8N.slack, label: "#disputes-escalated", x: 370, y: 120 },
          ],
          edges: [
            { from: "wh", to: "fn1" },
            { from: "fn1", to: "em" },
            { from: "fn1", to: "sl" },
          ],
        },
      },
      {
        id: "dispute.resolved",
        label: "dispute.resolved",
        trigger: "Panel vote or admin ruling",
        payload: "{ dispute_id, resolution, winner, refund_amount, mcc_impact }",
        description: "Dispute resolved. Triggers escrow release or refund, updates MCCs, notifies both parties.",
        workflow: {
          name: "Resolution Pipeline",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "dispute.resolved", x: 30, y: 100 },
            { id: "sw", type: "Switch", color: N8N.switch, label: "Resolution type", x: 170, y: 100 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Creator wins", x: 310, y: 40 },
            { id: "fn2", type: "Function", color: N8N.function, label: "Client wins", x: 310, y: 100 },
            { id: "fn3", type: "Function", color: N8N.function, label: "Split", x: 310, y: 160 },
            { id: "xr", type: "HTTP", color: N8N.xrpl, label: "Execute payout", x: 460, y: 100 },
            { id: "em", type: "Email", color: N8N.email, label: "Both parties", x: 610, y: 70 },
            { id: "sb", type: "Supabase", color: N8N.supabase, label: "Update records", x: 610, y: 130 },
          ],
          edges: [
            { from: "wh", to: "sw" },
            { from: "sw", to: "fn1", label: "creator" },
            { from: "sw", to: "fn2", label: "client" },
            { from: "sw", to: "fn3", label: "split" },
            { from: "fn1", to: "xr" },
            { from: "fn2", to: "xr" },
            { from: "fn3", to: "xr" },
            { from: "xr", to: "em" },
            { from: "xr", to: "sb" },
          ],
        },
      },
    ],
  },
  {
    id: "credential",
    label: "Credential Events",
    color: C.gold,
    events: [
      {
        id: "mcc.minted",
        label: "mcc.minted",
        trigger: "mintWorkCredentialOnRelease()",
        payload: "{ nft_token_id, taxon, owner_address, contract_id, milestone_id, mint_tx_hash, metadata_cid }",
        description: "MCC minted on XRPL and offer created. Both T1 (creator) and T4 (client) fire separately. Triggers portfolio update and social sharing prompt.",
        workflow: {
          name: "MCC Verification & Notify",
          nodes: [
            { id: "wh", type: "Webhook", color: N8N.webhook, label: "mcc.minted", x: 50, y: 80 },
            { id: "xr", type: "HTTP", color: N8N.xrpl, label: "Verify on-chain", x: 210, y: 80 },
            { id: "if1", type: "If", color: N8N.ifNode, label: "Verified?", x: 370, y: 80 },
            { id: "sb", type: "Supabase", color: N8N.supabase, label: "Confirm nft_registry", x: 530, y: 40 },
            { id: "em", type: "Email", color: N8N.email, label: "Credential earned!", x: 530, y: 100 },
            { id: "err", type: "Function", color: N8N.function, label: "Log mismatch", x: 530, y: 160 },
          ],
          edges: [
            { from: "wh", to: "xr" },
            { from: "xr", to: "if1" },
            { from: "if1", to: "sb", label: "yes" },
            { from: "if1", to: "err", label: "no" },
            { from: "sb", to: "em" },
          ],
        },
      },
    ],
  },
  {
    id: "system",
    label: "System Events",
    color: C.orange,
    events: [
      {
        id: "escrow.expiring",
        label: "escrow.expiring",
        trigger: "Schedule (every 1h)",
        payload: "{ contract_id, milestone_id, escrow_cancel_after, hours_remaining }",
        description: "Not webhook-driven — scheduled job. Queries milestones with escrow expiring within 24h. Critical for preventing fund lockup.",
        workflow: {
          name: "Escrow Expiration Watcher",
          nodes: [
            { id: "sc", type: "Schedule", color: N8N.wait, label: "Every 1 hour", x: 50, y: 80 },
            { id: "sb", type: "Supabase", color: N8N.supabase, label: "Query expiring", x: 210, y: 80 },
            { id: "if1", type: "If", color: N8N.ifNode, label: "Any found?", x: 370, y: 80 },
            { id: "fn1", type: "Function", color: N8N.function, label: "Format warnings", x: 510, y: 50 },
            { id: "em", type: "Email", color: N8N.email, label: "Warn both parties", x: 650, y: 30 },
            { id: "sl", type: "Slack", color: N8N.slack, label: "#escrow-alerts", x: 650, y: 80 },
            { id: "no", type: "NoOp", color: N8N.noOp, label: "Nothing expiring", x: 510, y: 130 },
          ],
          edges: [
            { from: "sc", to: "sb" },
            { from: "sb", to: "if1" },
            { from: "if1", to: "fn1", label: "yes" },
            { from: "if1", to: "no", label: "no" },
            { from: "fn1", to: "em" },
            { from: "fn1", to: "sl" },
          ],
        },
      },
    ],
  },
];

// ─── SVG Helpers ──────────────────────────────────────

function WorkflowNode({ node, isSelected, onClick }) {
  const w = 110;
  const h = 36;
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <rect
        x={node.x}
        y={node.y}
        width={w}
        height={h}
        rx={6}
        fill={isSelected ? node.color + "35" : C.card}
        stroke={node.color}
        strokeWidth={isSelected ? 2 : 1.2}
        style={{ transition: "all 0.15s" }}
      />
      {/* Type badge */}
      <rect x={node.x} y={node.y} width={w} height={14} rx={6} fill={node.color + "30"} />
      <rect x={node.x} y={node.y + 8} width={w} height={6} fill={node.color + "30"} />
      <text
        x={node.x + w / 2}
        y={node.y + 10}
        textAnchor="middle"
        fill={node.color}
        fontSize={7}
        fontWeight={700}
        fontFamily="system-ui"
        style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
      >
        {node.type}
      </text>
      {/* Label */}
      <text
        x={node.x + w / 2}
        y={node.y + 26}
        textAnchor="middle"
        fill={C.text}
        fontSize={9}
        fontWeight={500}
        fontFamily="system-ui"
      >
        {node.label}
      </text>
    </g>
  );
}

function WorkflowEdge({ from, to, label, nodes }) {
  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;

  const w = 110;
  const h = 36;
  const x1 = fromNode.x + w;
  const y1 = fromNode.y + h / 2;
  const x2 = toNode.x;
  const y2 = toNode.y + h / 2;
  const midX = (x1 + x2) / 2;

  return (
    <g>
      <path
        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={C.muted + "55"}
        strokeWidth={1.2}
        markerEnd="url(#n8n-arrow)"
      />
      {label && (
        <text
          x={midX}
          y={Math.min(y1, y2) - 4}
          textAnchor="middle"
          fill={C.muted}
          fontSize={7}
          fontFamily="system-ui"
          fontStyle="italic"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function WorkflowDiagram({ workflow }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const maxX = Math.max(...workflow.nodes.map((n) => n.x)) + 140;
  const maxY = Math.max(...workflow.nodes.map((n) => n.y)) + 60;

  return (
    <svg width="100%" viewBox={`0 0 ${maxX} ${maxY}`} style={{ overflow: "visible" }}>
      <defs>
        <marker id="n8n-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.muted + "55"} />
        </marker>
      </defs>
      {/* Grid dots */}
      {Array.from({ length: Math.ceil(maxX / 30) }).map((_, xi) =>
        Array.from({ length: Math.ceil(maxY / 30) }).map((_, yi) => (
          <circle key={`${xi}-${yi}`} cx={xi * 30 + 15} cy={yi * 30 + 15} r={0.5} fill={C.border} />
        ))
      )}
      {workflow.edges.map((e, i) => (
        <WorkflowEdge key={i} {...e} nodes={workflow.nodes} />
      ))}
      {workflow.nodes.map((node) => (
        <WorkflowNode
          key={node.id}
          node={node}
          isSelected={selectedNode === node.id}
          onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
        />
      ))}
    </svg>
  );
}

// ─── Event Timeline (left sidebar) ───────────────────

function EventTimeline({ events, selectedEvent, onSelect, contractLifecycle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Contract lifecycle flow at top */}
      <div style={{ padding: "8px 10px", marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>
          CONTRACT LIFECYCLE FLOW
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {contractLifecycle.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span
                style={{
                  fontSize: 9,
                  color: step.color,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  padding: "2px 5px",
                  borderRadius: 4,
                  background: selectedEvent === step.id ? step.color + "25" : "transparent",
                  border: `1px solid ${selectedEvent === step.id ? step.color + "55" : "transparent"}`,
                }}
                onClick={() => onSelect(step.id)}
              >
                {step.short}
              </span>
              {i < contractLifecycle.length - 1 && <span style={{ color: C.border, fontSize: 8 }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: C.border, margin: "0 10px 8px" }} />

      {EVENT_CATEGORIES.map((cat) => (
        <div key={cat.id}>
          <div
            style={{
              padding: "6px 10px",
              fontSize: 9,
              fontWeight: 700,
              color: cat.color,
              letterSpacing: "0.08em",
            }}
          >
            {cat.label.toUpperCase()}
          </div>
          {cat.events.map((evt) => (
            <div
              key={evt.id}
              onClick={() => onSelect(evt.id)}
              style={{
                padding: "6px 10px 6px 16px",
                cursor: "pointer",
                background: selectedEvent === evt.id ? cat.color + "15" : "transparent",
                borderLeft: `2px solid ${selectedEvent === evt.id ? cat.color : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: selectedEvent === evt.id ? C.text : C.muted,
                  fontWeight: selectedEvent === evt.id ? 600 : 400,
                }}
              >
                {evt.label}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────

const CONTRACT_LIFECYCLE = [
  { id: "contract.created", short: "created", color: C.blue },
  { id: "contract.funded", short: "funded", color: C.blue },
  { id: "milestone.funded", short: "m.funded", color: C.gold },
  { id: "milestone.submitted", short: "submitted", color: C.gold },
  { id: "milestone.approved", short: "approved", color: C.gold },
  { id: "milestone.released", short: "released", color: C.gold },
  { id: "mcc.minted", short: "mcc", color: C.gold },
  { id: "contract.completed", short: "completed", color: C.green },
];

export default function N8NWorkflows() {
  const [selectedEvent, setSelectedEvent] = useState("milestone.released");

  const currentEvent = useMemo(() => {
    for (const cat of EVENT_CATEGORIES) {
      const found = cat.events.find((e) => e.id === selectedEvent);
      if (found) return { ...found, catColor: cat.color, catLabel: cat.label };
    }
    return null;
  }, [selectedEvent]);

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: C.gold, margin: 0 }}>StudioLedger</h1>
          <span style={{ fontSize: 12, color: C.muted }}>n8n Workflow Architecture</span>
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
          14 event types — fire-and-forget webhooks from src/lib/n8n/client.ts — click any event to see its workflow
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Event list */}
        <div
          style={{
            width: 200,
            borderRight: `1px solid ${C.border}`,
            overflowY: "auto",
            padding: "8px 0",
            flexShrink: 0,
          }}
        >
          <EventTimeline
            events={EVENT_CATEGORIES}
            selectedEvent={selectedEvent}
            onSelect={setSelectedEvent}
            contractLifecycle={CONTRACT_LIFECYCLE}
          />
        </div>

        {/* Right: Workflow detail */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
          {currentEvent ? (
            <>
              {/* Event header */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 9,
                      color: currentEvent.catColor,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: currentEvent.catColor + "20",
                    }}
                  >
                    {currentEvent.catLabel.toUpperCase()}
                  </span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "monospace", color: C.text }}>
                  {currentEvent.label}
                </h2>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
                  {currentEvent.description}
                </div>
              </div>

              {/* Metadata */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 4, letterSpacing: "0.05em" }}>
                    TRIGGER
                  </div>
                  <div style={{ fontSize: 11, color: C.blue, fontFamily: "monospace" }}>{currentEvent.trigger}</div>
                </div>
                <div
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 4, letterSpacing: "0.05em" }}>
                    PAYLOAD
                  </div>
                  <div style={{ fontSize: 10, color: C.green, fontFamily: "monospace", lineHeight: 1.5 }}>
                    {currentEvent.payload}
                  </div>
                </div>
              </div>

              {/* Workflow diagram */}
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: C.green,
                      boxShadow: `0 0 6px ${C.green}66`,
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                    {currentEvent.workflow.name}
                  </span>
                  <span style={{ fontSize: 10, color: C.muted, marginLeft: "auto" }}>
                    {currentEvent.workflow.nodes.length} nodes
                  </span>
                </div>
                <WorkflowDiagram workflow={currentEvent.workflow} />
              </div>

              {/* Node type legend */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 14,
                  padding: "10px 12px",
                  background: C.card,
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                }}
              >
                {[
                  { type: "Webhook", color: N8N.webhook },
                  { type: "Switch / If", color: N8N.switch },
                  { type: "Function", color: N8N.function },
                  { type: "Supabase", color: N8N.supabase },
                  { type: "Email", color: N8N.email },
                  { type: "Slack", color: N8N.slack },
                  { type: "XRPL HTTP", color: N8N.xrpl },
                  { type: "Wait", color: N8N.wait },
                ].map((item) => (
                  <div key={item.type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: item.color + "40",
                        border: `1px solid ${item.color}`,
                      }}
                    />
                    <span style={{ fontSize: 9, color: C.muted }}>{item.type}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: C.muted, fontSize: 13, padding: 40, textAlign: "center" }}>
              Select an event from the sidebar to view its n8n workflow.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
