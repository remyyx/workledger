## StudioLedger — Marketing Notes

This document captures **positioning, language, and differentiators** we want to keep consistent across landing pages, decks, and campaigns.

---

## 1. One‑liner & elevator pitch

- **One‑liner**:  
  **StudioLedger is a creator wallet that bills, protects, and proves your work — all on XRPL.**

- **Slightly longer**:  
  A creator studio wallet with escrow‑protected billing, smart contracts, and MCC‑based proof of work. 0.98% fees per release, instant settlement, and portable reputation you can take anywhere.

---

## 2. Core value props (for landing pages)

- **Escrow protection (XRPL‑native)**  
  Funds are locked on‑chain in XRPL escrow, not in StudioLedger’s bank account. Buyers can’t ghost you after you deliver; disputes happen against a transparent ledger.

- **Radically low, transparent fees**  
  0.98% per escrow release. No hidden spreads, no “processing” delays. The fee is so low that nobody leaves to avoid it — the protection is the product.

- **Portable reputation (MCCs)**  
  Every completed job mints a **Minted Craft Credential (MCC)**: an NFT‑backed proof of work with scope, amount, and delivery details. If you ever leave StudioLedger, your track record goes with you.

- **Multi‑currency, XRPL settlement**  
  Creators and marketplaces can use multiple currencies (XRP, RLUSD, USD, EUR, USDC, USDT). Settlement always clears on XRPL, with instant finality.

---

## 3. Ledger‑first reliability (very marketable)

This is a key story we want to highlight in marketing:

- **Ledger‑first design**  
  All payments, escrows, and MCC mints live on XRPL first. studioledger.ai only mirrors what’s already on the ledger.

- **Listener + transaction log**  
  A dedicated XRPL listener (or n8n workflow) watches the ledger for EscrowCreate, EscrowFinish, Payment, and MCC mint events and writes them into a `transaction_log` table. Updates to contracts and milestones are **idempotent**: replaying the same tx hash is safe.

- **What to say in marketing copy**:
  > **If our servers go down, your money and history don’t.**  
  > Every escrow and payment lives on XRPL first. Our listener just mirrors the ledger into the platform. When we’re back online, we replay events from XRPL so no transaction or credential is ever lost.

This should appear in:
- Landing page “How it works” / “Reliability” section  
- Pitch decks as “Ledger‑first reliability” or “No single point of failure”

---

## 4. Terminology & naming (marketing‑safe)

- **Roles**  
  - Use **creator** (service provider) and **marketplace** (buyer).  
  - Avoid “freelancer” and “client” in new copy (legacy DB columns are fine).

- **MCC — Minted Craft Credential**  
  - Always introduce as **Minted Craft Credential (MCC)** on first use.  
  - In copy, MCCs can be described as “NFT‑backed proof of work” but the preferred brand term is **MCC**, not “NFT credential”.

- **MCC categories (Taxons)**  
  - **Taxon 1 — Work Credential**: Portfolio tokens that prove completed jobs.  
  - **Taxon 2 — Usage Right License**: Licenses that encode what a buyer can do with the work (territory, duration, exclusivity, royalties…).  
  - **Taxon 3 — Membership Access Token**: Ongoing access / loyalty tokens (retainers, memberships, clubs).

- **Color associations (for marketing visuals)**  
  - **Credential icon color**: **magenta/pink** (`--accent-purple`). Represents *Work Credentials / portfolio*.  
  - **Membership icon color**: **true purple** (`#7f3ac6`, `MCC_UI_COLORS.MEMBERSHIP`). Represents *Membership / access tokens*.  
  - Do not swap those meanings; the colors are part of the mental model.

---

## 5. Fee model (for positioning vs. marketplaces)

- **Escrow release fee**: `PLATFORM.FEE_PERCENT = 0.98%` per escrow release.  
- **Swap fee**: `SWAP_FEE_PERCENT = 0.1%` on DEX swaps.  
- **Arbitration fee**: `ARBITRATION_FEE_PERCENT = 5%` from the losing party in disputes.

Suggested copy:

- “Keep **99.41%** of what you earn on each release. No 10–20% platform tax.”
- “0.98% per escrow release, 0.1% on swaps. That’s it.”

---

## 6. Dispute resolution (story for trust)

- **3‑tier dispute flow**  
  1. Direct resolution between creator and marketplace (7‑day window).  
  2. Platform‑mediated review by StudioLedger admin.  
  3. Community arbitration by a panel of MCC‑holding peers.

- **Arbitration economics**  
  - 5% arbitration fee charged to the losing party.  
  - Evidence (deliverables, communication, contract terms) is stored via IPFS hash.

Suggested copy:

- “When things go wrong, decisions are based on verifiable work history and on‑chain facts, not opaque support tickets.”

---

## 7. Product pillars vs incumbents (Upwork/Fiverr)

Use this skeleton when comparing to Upwork/Fiverr etc:

- **Everything Upwork does, without the 20% tax.**
  - Decentralized escrow (XRPL).  
  - 0.98% per release, not 10–20% per job.  
  - On‑chain proof of work (MCCs) you can take anywhere.

- **Why creators care**  
  - Keep more of each invoice.  
  - Don’t get trapped by a single platform — your reputation is portable.  
  - Escrow rules are transparent and enforced by XRPL, not by a black‑box account system.

---

## 8. Short bullets for ads / hero blocks

Use these as ready‑made lines for hero sections, cards, or paid campaigns:

- **Bill, protect, and prove your work — all on XRPL.**
- **0.98% fees, on‑chain escrow, portable credentials.**
- **If we go down, your money and history don’t. XRPL is the source of truth.**
- **Every completed job mints a Minted Craft Credential (MCC) — an NFT‑backed proof of work.**
- **Everything Upwork does, without the 20% tax.**

---

## 9. Competitive positioning — protocol vs tool

**Observation (April 2026):** Competitors like Uaryn (smart invoicing + adaptive payment reminders) solve the "getting paid" problem by automating the chase — smarter reminder emails. StudioLedger eliminates the chase entirely because funds are already locked in escrow before work starts. This is a category-level difference.

**The framing:**
- Invoicing tools automate nagging. StudioLedger makes nagging impossible.
- Freelance marketplaces are matchmaking apps with fees. StudioLedger is a **settlement protocol for creative work** — the contract, the escrow, the proof of completion, and the credential all live on-chain.
- StudioLedger is closer to financial infrastructure than a SaaS tool. The contract is the escrow. The credential is the receipt. The ledger is the settlement layer. No intermediary.

**Lines to use:**
- "Other platforms help you chase payments. StudioLedger makes chasing impossible."
- "No bank, no float, no chasing."
- "We're not a freelance marketplace. We're a settlement protocol for creative work."
- "The contract IS the escrow. The credential IS the proof. The ledger IS the settlement."

**Big-ticket perception:** When pitching to grants (XRPL Grants, Innovate Tasmania) or investors, lean into protocol language — settlement layer, on-chain credentials, AUSTRAC-registered compliance, multi-currency trust lines. This positions StudioLedger as infrastructure, not another Upwork clone.

**What to learn from simpler tools:** Their onboarding is frictionless (invoice in minutes, zero setup). StudioLedger's escrow flow is more powerful but higher friction. The AI contract generation assist (Phase 2) needs to close that gap — "describe your project, click go, escrow is live."

---

## 10. Protocol identity — why StudioLedger is infrastructure, not a feature set

StudioLedger is structurally closer to a protocol than a SaaS tool. Escrow settlement on XRPL, verifiable credentials (MCCs), crypto-conditions, multi-currency trust lines, community arbitration — that's infrastructure, not a feature set.

**The category ladder:**
- Uaryn = reminder bot (automates chasing invoices)
- Upwork/Fiverr = matchmaking marketplace with fees (takes 10–20%, black-box dispute resolution)
- StudioLedger = **settlement protocol for creative work** (the contract, the escrow, the proof of completion, and the credential all live on-chain — a fundamentally different thing)

**What makes it feel like a protocol to the outside world:**
- XRPL-native settlement (no intermediary)
- Escrow-protected milestones (funds locked before work starts)
- MCCs as portable proof of work (not locked inside a platform)
- 0.98% transparent fee (no hidden markup)
- AUSTRAC-registered compliance (regulatory moat, not overhead)
- Multi-currency trust lines (chain-agnostic at the door, XRPL-native at the core)

**The gap to close:** The risk is looking too early-stage to be taken seriously at protocol level. What closes the gap:
- A clean landing page that reads like a fintech, not a startup weekend project
- AUSTRAC registration as social proof (we chose regulation, not avoidance)
- One or two real case studies once beta users complete jobs
- Grant applications (XRPL Grants especially) framing StudioLedger as protocol-level infrastructure

**The bottom line:** StudioLedger is building the rails. Everyone else is building apps on top of rails that don't protect anyone.

---

## 11. Pre-launch SEO & discoverability (ACTION NEEDED)

**Status (April 2026):** Searching "studioledger.ai" on Brave returns zero results for StudioLedger. Search engines confuse it with "Ledger AI" (corporate governance AI, Uniswap token) and list every Australian company with "Ledger" in the name for the Pty Ltd search. The brand currently exists only in internal docs.

**The "Ledger" keyword is crowded:** Ledger (hardware wallet), Ledger AI, Standard Ledger, Liquid Ledger. However "StudioLedger" as a compound is unique — once there's indexable content it should own that term quickly since nobody else uses it.

**What needs to happen before sending the URL to anyone:**
- Landing page live at studioledger.ai with real copy (use Section 10 protocol positioning as foundation)
- Structured data (JSON-LD) on landing page: organization schema with name, description, founder, logo
- At least one external mention: Show HN post, blog post, or XRPL community post to give search engines a backlink
- ABN/ACN lookup will surface the Pty Ltd entity automatically once ASIC indexes it

**Nice to have for grant applications:**
- Open Graph meta tags (title, description, image) so links look professional when shared
- A `/about` or `/company` page with the AUSTRAC registration status as credibility signal
- Blog or changelog page (even one post) to signal the site is active and maintained

