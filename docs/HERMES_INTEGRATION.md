# Hermes Agent Integration — StudioLedger Plumbing Copilot

> **Purpose**: Architecture plan for deploying Hermes AI Agent (Nous Research) as a development copilot for StudioLedger's backend infrastructure — XRPL, n8n, Supabase, and the API route layer that ties them together.
>
> **Author**: Remy Ruozzi / Claude session — 2026-04-02
>
> **Status**: Architecture plan (not yet implemented)

---

## 1. Why Hermes for StudioLedger's Plumbing

StudioLedger's backend has four distinct plumbing layers that need to work in concert:

| Layer | What it does | Current state |
|-------|-------------|---------------|
| **XRPL** (`src/lib/xrpl/`) | Escrow lifecycle, wallet ops, MCC minting, trust lines, transaction listening | 8 modules built (client, escrow, milestone-escrow, retainer-escrow, wallet, nft, mint-credential, listener + transaction-monitor) |
| **n8n** (`src/lib/n8n/`) | Event-driven automation — notifications, lifecycle webhooks, scheduled jobs | Client built with 14 event types defined; no n8n instance deployed yet |
| **Supabase** (`src/lib/supabase/`) | Auth, database (7 tables + RLS), real-time subscriptions | Browser + server + admin clients built; 11 migrations applied |
| **API routes** (`src/app/api/`) | 24 route files bridging frontend ↔ XRPL ↔ Supabase | Auth, contracts, milestones, proposals, briefs, wallet, MCCs, listener, dev tools |

The problem isn't any single layer — it's the **glue between them**. When a milestone gets released, that triggers: XRPL escrow finish → transaction monitor confirms → Supabase milestone status update → MCC auto-mint → n8n event fire → contract completion check. A Hermes copilot adds a reasoning layer that can trace these cross-cutting flows, catch inconsistencies, and help develop new plumbing without breaking existing chains.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  HERMES AGENT                        │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ MEMORY.md│  │ USER.md  │  │ Skills (reusable) │  │
│  │ (project │  │ (Remy's  │  │ - escrow-debug    │  │
│  │  state)  │  │  prefs)  │  │ - milestone-trace │  │
│  └──────────┘  └──────────┘  │ - n8n-wire        │  │
│                               │ - migration-gen   │  │
│  ┌────────────────────────┐  │ - mcc-mint-verify │  │
│  │   Agent Profiles       │  │ - trust-line-check│  │
│  │   ┌─────────────────┐  │  └──────────────────────┘│
│  │   │ xrpl-ops        │  │                          │
│  │   │ db-architect     │  │                          │
│  │   │ workflow-builder │  │                          │
│  │   │ api-glue         │  │                          │
│  │   └─────────────────┘  │                          │
│  └────────────────────────┘                          │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           MCP Server Connections              │   │
│  │                                               │   │
│  │  ┌────────────┐ ┌──────────┐ ┌────────────┐ │   │
│  │  │ xrpl-mcp   │ │supabase- │ │  n8n-mcp   │ │   │
│  │  │            │ │  mcp     │ │            │ │   │
│  │  │• balances  │ │• query   │ │• list wf   │ │   │
│  │  │• escrow    │ │• insert  │ │• execute   │ │   │
│  │  │  status    │ │• migrate │ │• webhook   │ │   │
│  │  │• tx lookup │ │• schema  │ │  status    │ │   │
│  │  │• nft query │ │• RLS     │ │• logs      │ │   │
│  │  └────────────┘ └──────────┘ └────────────┘ │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  XRPL    │  │ Supabase │  │   n8n    │
   │ Testnet  │  │ Postgres │  │ Instance │
   └──────────┘  └──────────┘  └──────────┘
```

---

## 3. MCP Servers to Build

These are the bridge between Hermes and StudioLedger's infrastructure. Each wraps existing `src/lib/` modules into MCP-callable tools.

### 3.1 xrpl-mcp

Wraps `src/lib/xrpl/*`. Exposes read-only queries + controlled write operations.

```
Tools:
  xrpl_get_balances        → getBalances(address)
  xrpl_has_balance         → hasBalance(address, currency, amount, issuer?)
  xrpl_escrow_status       → look up escrow by sequence + owner on-chain
  xrpl_tx_lookup           → tx hash → full transaction details from ledger
  xrpl_account_objects     → all objects (escrows, trust lines, nfts) for an address
  xrpl_get_mccs            → getMCCs(address) — all MCC tokens
  xrpl_network_info        → getNetworkConfig() — current network, fees, reserves
  xrpl_listener_status     → getListenerStatus() — is the tx listener running?
  xrpl_simulate_escrow     → dry-run escrow create (validates without submitting)
  xrpl_check_trust_lines   → verify all required trust lines exist for an address
```

**Write tools (gated — require confirmation):**
```
  xrpl_setup_trust_lines   → setupTrustLines(wallet) — testnet only
  xrpl_fund_testnet        → request testnet XRP from faucet
```

**Why**: Hermes can inspect on-chain state while helping you debug escrow flows, verify MCC mints, check if trust lines are missing before a user hits an error.

### 3.2 supabase-mcp

Wraps Supabase admin client. Read-heavy, with controlled mutations.

```
Tools:
  db_query                 → SELECT with filters on any table (read-only)
  db_schema                → return table structure, columns, types, constraints
  db_rls_policies          → list all RLS policies for a table
  db_migration_history     → list applied migrations (schema_migrations table)
  db_count                 → row counts per table (health check)
  db_user_lookup           → find user by email or xrpl_address
  db_contract_state        → full contract + milestones + messages for a contract_id
  db_transaction_log       → recent transactions with status (pending/confirmed/failed)
  db_nft_registry          → MCC tokens by owner, taxon, or contract
```

**Write tools (gated):**
```
  db_insert                → insert row (for test data seeding)
  db_update                → update row (for manual state corrections)
  db_run_migration         → apply a .sql migration file (dev only)
```

**Why**: When tracing a bug through the escrow→milestone→MCC pipeline, Hermes can query each table to find where the state diverged from expected.

### 3.3 n8n-mcp

Wraps n8n REST API (once deployed). Manages workflow lifecycle.

```
Tools:
  n8n_list_workflows       → all workflows with status (active/inactive)
  n8n_get_workflow          → full workflow definition by ID
  n8n_execution_history     → recent executions with success/fail status
  n8n_execute_workflow      → trigger a workflow manually (with payload)
  n8n_webhook_test         → fire a test event to a webhook URL
  n8n_workflow_status      → is a specific workflow active? last run? errors?
```

**Why**: Hermes can verify that n8n workflows are wired correctly to the events in `src/lib/n8n/client.ts`, test webhook delivery, and inspect execution failures.

### 3.4 studioledger-api-mcp (optional — Phase 2)

Wraps StudioLedger's own API routes for end-to-end testing.

```
Tools:
  api_create_contract      → POST /api/contracts
  api_fund_milestone       → POST /api/test/milestones/fund
  api_release_milestone    → POST /api/test/milestones/release
  api_submit_deliverable   → PATCH /api/contracts/[id]/milestones/[seq]
  api_create_brief         → POST /api/briefs
  api_submit_proposal      → POST /api/proposals
  api_health_check         → hit all endpoints, return status codes
```

**Why**: Full pipeline testing — Hermes creates a contract, funds it, submits a deliverable, releases, and verifies MCC mint end-to-end.

---

## 4. Agent Profiles

Hermes supports multi-agent profiles — specialized personas with distinct tool access and instructions. Four profiles for StudioLedger:

### 4.1 `xrpl-ops` — Chain Operations Specialist

**Role**: Debug XRPL interactions, verify on-chain state, help develop new escrow/MCC features.

**Tools**: `xrpl-mcp` (all), `supabase-mcp` (read-only), terminal
**Memory focus**: XRPL gotchas, escrow sequence tracking, trust line requirements, testnet vs mainnet differences

**Example tasks**:
- "Verify that the escrow for contract X actually landed on testnet"
- "Why did this MCC mint fail? Check the tx hash"
- "We need to implement retainer escrow — what's the on-chain flow?"
- "Are all test users' trust lines set up for RLUSD?"

### 4.2 `db-architect` — Database & Auth Specialist

**Role**: Schema design, migration authoring, RLS policy review, auth flow debugging.

**Tools**: `supabase-mcp` (all), terminal
**Memory focus**: Migration numbering (currently 001–011), RLS gotchas, `getSessionOrDev()` pattern, admin client usage

**Example tasks**:
- "Draft migration 012 to add `asset_listings` table for the marketplace storefront"
- "Review RLS policies on `contracts` — can a creator see marketplace-only fields?"
- "The auth middleware is returning 401 for this test user — debug it"
- "Generate TypeScript types from the current schema"

### 4.3 `workflow-builder` — n8n Automation Specialist

**Role**: Design, build, and test n8n workflows that respond to StudioLedger events.

**Tools**: `n8n-mcp` (all), `supabase-mcp` (read-only), `xrpl-mcp` (read-only), terminal
**Memory focus**: 14 event types in `src/lib/n8n/client.ts`, webhook URL patterns, fire-and-forget architecture, 5-minute execution timeout

**Example tasks**:
- "Build an n8n workflow that sends an email when `milestone.released` fires"
- "Create the escrow expiration watcher — check for escrows expiring within 24h"
- "Wire up the onboarding flow: user.registered → create XRPL account → set trust lines → welcome email"
- "Test the dispute.escalated webhook — make sure the payload matches what n8n expects"

### 4.4 `api-glue` — Integration Layer Specialist

**Role**: Develop and debug API routes that bridge frontend, XRPL, Supabase, and n8n.

**Tools**: All MCP servers, terminal, browser
**Memory focus**: API route patterns, `getSessionOrDev()` auth, `createSystemMessage()` params object (not positional), fee calculations return strings, sequential milestone funding rule

**Example tasks**:
- "The milestone release endpoint should auto-mint an MCC and fire n8n — trace the full flow"
- "Build the API route for accepting a direct offer (MK→CR path C)"
- "Add proper error handling to `/api/contracts/[id]/milestones/[seq]`"
- "This contract got stuck in 'funded' status — trace why it didn't advance to 'active'"

---

## 5. Persistent Memory Structure

Hermes uses two memory files that persist across sessions. Here's how to structure them for StudioLedger:

### 5.1 MEMORY.md (Project State)

Maps directly to your existing `METACONTEXT.md` — this IS the Hermes memory file. Update it to include:

```markdown
# MEMORY.md — StudioLedger Hermes Memory

## Plumbing State
- XRPL client: singleton, auto-reconnect, testnet active
- Listener: built but not deployed (needs long-running process)
- Transaction monitor: built, handles EscrowCreate/EscrowFinish/Payment
- n8n: client built (14 events), no instance deployed
- Supabase: 11 migrations, 7 tables, RLS enabled
- API routes: 24 files, all using getSessionOrDev() for auth

## Active Escrow Sequences
[Updated by xrpl-ops agent during development]
- Contract abc123: milestone 1 = escrow seq 45, milestone 2 = pending
- ...

## Known Plumbing Bugs
[Carried forward from METACONTEXT.md, updated by any agent]

## Architecture Decisions Log
[Append-only, dated entries — same as METACONTEXT.md]

## Last MCP Health Check
- xrpl-mcp: ✅ connected (testnet)
- supabase-mcp: ✅ 7 tables, 1,234 rows
- n8n-mcp: ❌ not deployed
```

### 5.2 USER.md (Remy's Preferences)

```markdown
# USER.md — Remy Ruozzi

## Dev Preferences
- TypeScript strict, @/ path aliases
- Amounts as strings (never floats for money)
- Comments explain WHY not WHAT
- Barrel files for module exports
- Zod at API boundaries

## Architecture Preferences
- XRPL calls only through src/lib/xrpl/ (never xrpl.js directly in components)
- DB queries only through Supabase clients
- n8n for async side effects (notifications, timers) — not in API routes
- Sequential milestone funding (one at a time, in order)
- Fee calculations via helpers, never raw in components

## Communication
- Direct, no fluff
- Show the code, explain the gotcha
- Update METACONTEXT.md after every significant session
```

---

## 6. Reusable Skills (Hermes Auto-Documents These)

When Hermes solves a complex plumbing problem, it saves the solution as a reusable skill file. Pre-seed these based on patterns already in the codebase:

### `skills/escrow-debug.md`
```
Trigger: "escrow failed", "escrow stuck", "escrow not confirming"
Steps:
1. Get contract_id → query milestones table for escrow_sequence + escrow_condition
2. xrpl_escrow_status(owner, sequence) → check on-chain state
3. Compare on-chain vs DB status (common mismatch: DB says 'funded' but chain says no escrow object)
4. If escrow exists on-chain but DB is wrong → transaction-monitor missed it → check listener status
5. If escrow doesn't exist → tx was never submitted or failed → check transaction_log for tx_hash
```

### `skills/milestone-trace.md`
```
Trigger: "milestone stuck", "milestone not advancing", "milestone state wrong"
Steps:
1. Query milestone by contract_id + sequence
2. Check status vs expected (pending→funded→submitted→approved→released)
3. For 'funded' stuck: was deliverable submitted? Check messages for type='deliverable_submitted'
4. For 'submitted' stuck: was approval given? Check for type='milestone_approved'
5. For 'approved' stuck: was escrow released? Check transaction_log for EscrowFinish tx
6. Verify sequential funding rule: is previous milestone released?
```

### `skills/n8n-wire.md`
```
Trigger: "n8n not firing", "webhook not working", "notification not sent"
Steps:
1. Check N8N_WEBHOOK_URL env var is set
2. Find the fireN8nEvent() call in the relevant API route
3. Verify event name matches n8n webhook path (e.g. 'milestone.released' → /webhook/milestone.released)
4. n8n_webhook_test with sample payload
5. Check n8n execution history for errors
6. Common issue: n8n URL has trailing slash, fireN8nEvent adds one → double slash
```

### `skills/migration-gen.md`
```
Trigger: "new table", "add column", "migration", "schema change"
Steps:
1. db_migration_history → get current migration number (last = 011)
2. New migration = next number (012, 013, etc.)
3. Follow conventions: CREATE TABLE with UUID primary keys, created_at/updated_at timestamps
4. Add RLS policies (enable RLS, create select/insert/update policies)
5. Add indexes on foreign keys and commonly queried columns
6. File: supabase/migrations/0XX_description.sql
7. Update METACONTEXT.md migration numbering section
```

### `skills/mcc-mint-verify.md`
```
Trigger: "MCC not minted", "credential missing", "NFT not showing"
Steps:
1. Query nft_registry by contract_id + milestone_id
2. If DB row exists → check mint_tx_hash → xrpl_tx_lookup
3. If no DB row → check if milestone status reached 'released' (MCC mints on release)
4. For test mode: mock mint writes to nft_registry directly (no on-chain tx)
5. For production: mintWorkCredentialOnRelease() in mint-credential.ts
6. Verify taxon: T1=WorkCredential (creator), T4=ClientCompletion (marketplace)
```

---

## 7. Phased Rollout

### Phase 0 — Immediate (This Week): Hermes Patterns in Current Workflow

No Hermes deployment needed. Adopt the patterns now in your Claude/Cowork sessions:

**Actions:**
- [x] Rename/align `METACONTEXT.md` to also serve as Hermes `MEMORY.md` format (add plumbing state section, active escrow tracking, MCP health check placeholder)
- [ ] Create `docs/hermes-skills/` folder with the 5 skill files above
- [ ] Add `USER.md` to `docs/` with Remy's dev preferences
- [ ] Start every Cowork session by reading METACONTEXT.md + relevant skill files (you already do this — formalize it)

**Value**: Immediate — every future session benefits from structured debugging patterns. Zero deployment cost.

### Phase 1 — Short-term (Week 2–3): MCP Servers for XRPL + Supabase

Build the two most critical MCP servers so Hermes (or any MCP-compatible agent, including Claude) can query infrastructure directly.

**Actions:**
- [ ] Build `xrpl-mcp` server (TypeScript, wraps existing `src/lib/xrpl/` modules)
- [ ] Build `supabase-mcp` server (TypeScript, wraps admin client)
- [ ] Test both with Claude Code / Cowork MCP connections
- [ ] Document MCP server setup in `docs/HERMES_INTEGRATION.md` (this file)

**Architecture decision**: Build MCP servers as standalone packages in a `packages/mcp/` folder at repo root. They import from `src/lib/` but run independently. This way they work with Hermes, Claude Code, Cursor, or any MCP client.

```
packages/
  mcp/
    xrpl-server/
      src/index.ts       ← MCP server entry
      src/tools.ts       ← tool definitions wrapping src/lib/xrpl/*
      package.json
    supabase-server/
      src/index.ts
      src/tools.ts
      package.json
```

**Value**: Any AI copilot (Hermes, Claude, Cursor) can now inspect on-chain state and database during development. Debugging goes from "copy-paste tx hash into explorer" to "ask the agent to trace it."

### Phase 2 — Medium-term (Week 4–6): Deploy Hermes + n8n

Deploy both Hermes and n8n as long-running services. Wire them together.

**Actions:**
- [ ] Deploy n8n instance (Railway or n8n Cloud)
- [ ] Build and deploy `n8n-mcp` server
- [ ] Deploy Hermes agent (self-hosted — Docker or bare Node process)
- [ ] Configure Hermes with all 3 MCP servers + agent profiles
- [ ] Load MEMORY.md, USER.md, and skills into Hermes
- [ ] Set up Hermes on Telegram or Discord for Remy to interact with

**Deployment stack:**
```
Railway:
  ├── n8n (workflow automation)
  ├── hermes-agent (AI copilot)
  └── mcp-servers (xrpl + supabase + n8n)

Vercel:
  └── studioledger (Next.js frontend + API routes)

Supabase:
  └── PostgreSQL (managed)
```

**Value**: Hermes becomes a persistent copilot you can ask "what's the state of contract X?" from your phone via Telegram while riding the bus.

### Phase 3 — Longer-term (Week 8+): Multi-Agent + API Testing

Full multi-agent profiles + automated pipeline testing.

**Actions:**
- [ ] Build `studioledger-api-mcp` server (wraps API routes)
- [ ] Configure all 4 agent profiles (xrpl-ops, db-architect, workflow-builder, api-glue)
- [ ] Set up automated daily health checks (Hermes cron: check balances, listener status, n8n workflow health, escrow expirations)
- [ ] Hermes skill auto-generation: when a new plumbing bug is solved, Hermes saves the debugging pattern as a skill

**Value**: Hermes can run end-to-end contract lifecycle tests, catch issues before users do, and build up a library of debugging skills specific to StudioLedger's architecture.

---

## 8. What Hermes Does NOT Replace

Be clear about boundaries:

| Stays as-is | Why |
|-------------|-----|
| **n8n for production automation** | Hermes is a dev copilot, not a production event processor. n8n handles real user events (notifications, MCC minting queues, escrow watchers). |
| **XRPL transaction listener** | The listener in `src/lib/xrpl/listener.ts` is production infrastructure. Hermes *monitors* it; it doesn't replace it. |
| **Supabase RLS** | Security policies stay in Postgres. Hermes uses the admin client for debugging, never for production queries. |
| **API route logic** | Business logic stays in Next.js API routes. Hermes helps you *write and test* them, doesn't serve them. |
| **METACONTEXT.md** | Still the canonical project state file. Hermes MEMORY.md is structured to align with it, not replace it. |

---

## 9. Cost Estimate

| Service | Free tier | Paid (if needed) |
|---------|-----------|-------------------|
| Hermes agent | Self-hosted (free) | LLM API costs only (~$10-50/mo depending on usage) |
| n8n | Cloud free (5 workflows) | $20/mo for more workflows |
| MCP servers | Self-hosted alongside Hermes | Included in Railway plan |
| Railway | $5/mo hobby plan | $20/mo if multiple services |

**Total estimated**: $15–70/month depending on LLM API usage.

---

## 10. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-02 | Hermes as dev copilot, not production agent | StudioLedger is pre-launch. Need debugging help, not autonomous operations. |
| 2026-04-02 | MCP servers as standalone packages in `packages/mcp/` | Reusable across Hermes, Claude Code, Cursor, any MCP client. |
| 2026-04-02 | Phase 0 starts immediately with pattern adoption | Zero-cost, immediate value. Skills and memory structure benefit every session. |
| 2026-04-02 | n8n and Hermes co-deploy on Railway | Same infra, simple networking, shared secrets via env vars. |
| 2026-04-02 | MEMORY.md aligns with METACONTEXT.md | Don't maintain two separate project state files. One source of truth. |
