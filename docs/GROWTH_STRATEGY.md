# StudioLedger — Growth Strategy & Sizing

This document captures **growth phases, revenue model, optional services, and long‑term sizing**. Use it after the **tests phase** to decide priorities (listener, Pro tier, geos, etc.).

---

## 1. Purpose & decision gate

- **Current focus:** Ship and harden core (money flows, XRPL listener, contract dashboard UX). Run tests; fix issues.
- **After tests:** Revisit this doc to decide:
  - When to introduce a **Pro** tier and what’s in it.
  - Which **other services** (instant payout, FX, verification API, white‑label) to roadmap.
  - Whether Phase 2 geo/segment targets stay as-is or shift.

---

## 2. Growth phases (from CLAUDE.md)

| Phase   | Window      | Who                                                                 | Target              |
|--------|-------------|---------------------------------------------------------------------|---------------------|
| **1**  | Months 1–3  | Web3‑native creators (XRPL community, crypto devs/designers)        | 10 creators, 20 jobs |
| **2**  | Months 4–9  | High‑value international creators ($30K–$100K/yr), Eastern Europe, SEA, LatAm, Africa | 100 creators, 500 jobs |
| **3**  | Months 10–18| Mainstream Upwork/Fiverr power users, small agencies, enterprise pilots | 1,000+ creators     |

---

## 3. Revenue model: volume + SaaS‑like

- **Volume (core):** 0.98% per escrow release. No change to the public promise.
- **Early‑stage revenue** = volume fees **plus** optional **Pro** (and later other services).

### 3.1 Volume sanity check (N × V × M)

- **N** = number of active creators  
- **V** = average contract value (all milestones, one deal)  
- **M** = completed contracts per creator per year  

**Formula:** `Volume = N × V × M` → **Revenue from fees ≈ Volume × 0.00985**

| Scenario   | N   | V      | M | Volume   | Fee revenue (0.98%) |
|-----------|-----|--------|---|---------|----------------------|
| Phase 1   | 10  | $5,000 | 2 | $100k   | ~$985                |
| Phase 2   | 100 | $8,000 | 5 | $4M     | ~$39.4k              |
| Phase 3   | 1k  | $10k   | 6 | $60M    | ~$591k               |

So the 0.98% model is **sustainable only with real volume**; Pro and other services reduce dependence on volume alone.

### 3.2 Pro tier (SaaS‑like)

- **Idea:** Pro = more volume (higher limits) + premium features. Price e.g. **$19/mo** or **$199/yr**.
- **Possible Pro features:**
  - Higher limits (more active contracts, more milestones per contract).
  - Public MCC portfolio page (`/c/username`).
  - Export (contracts + MCCs as PDF/CSV).
  - “Pro” badge, priority support, or API access.
- **Decision after tests:** Which 1–2 features to ship first; when to add Stripe (or other) billing.

### 3.3 Other services (future revenue streams)

| Service                    | What it is                                                                 | When to consider      |
|---------------------------|----------------------------------------------------------------------------|------------------------|
| **Instant payout / advance** | Creator gets paid on submit; platform (or partner) advances; fee/spread on release. | When volume and trust are high enough. |
| **FX / multi‑currency**   | Quote conversion (e.g. EUR ↔ USDC); small spread.                          | When multi‑currency usage is significant. |
| **Dispute facilitation**  | Premium: faster review, dedicated mediator, white‑glove evidence.         | When dispute volume justifies it. |
| **MCC / contract verification** | API or “Verify this MCC” for recruiters, clients, other platforms.    | When MCC adoption is visible. |
| **White‑label / embedded** | Other marketplaces or agencies embed your escrow; platform fee or rev share. | When 1–2 partners ask for it. |
| **Templates / legal packs** | Paid SOW, IP transfer, retainer T&C templates.                           | When creators ask for “serious” contracts. |
| **Analytics / tax export** | Revenue by client, accountant‑ready export, 1099‑style summary.          | As a Pro or one‑off add‑on. |

---

## 4. First niche (Phase 1)

- **Who:** Web3‑native creators — XRPL community, crypto devs/designers.
- **Why:** Lowest friction (already understand wallets, escrow, XRPL); natural fit for RLUSD and MCCs; reachable in existing communities.
- **Goal:** Prove one end‑to‑end story (draft → funded → deliver → approve → MCC) and 1–2 disputes handled well; then open Phase 2.

---

## 5. How big can StudioLedger get when mature?

### 5.1 Market context (order of magnitude)

- **Global freelance / gig economy** (pre‑COVID and growth): hundreds of billions USD in GMV; platforms (Upwork, Fiverr, Toptal, etc.) take 5–20% or more.
- **Addressable slice for “escrow + portable proof + low fee”:**
  - Creators and buyers who care about **protection and reputation** more than a huge marketplace discovery engine.
  - **TAM** (total addressable): a fraction of that (e.g. 1–5% of high‑value freelance/creator work) still implies **tens of billions** in volume.
  - **SAM** (serviceable): XRPL‑friendly and multi‑currency‑friendly creators + buyers; could be **hundreds of millions to low single‑digit billions** in volume over many years.
  - **SOM** (serviceable obtainable): what you can realistically capture in 3–5 years with execution and distribution — **tens of millions to low hundreds of millions** in annual volume is a plausible “mature” target if you win a wedge and expand.

### 5.2 Mature scenarios (illustrative)

Assuming **0.59% fee only** (no Pro/other services):

| Annual volume (processed) | Fee revenue (0.59%) | Comment |
|----------------------------|----------------------|--------|
| $10M                       | ~$59k                | Strong Phase 2 / early Phase 3. |
| $50M                       | ~$295k               | Established niche player. |
| $200M                      | ~$1.18M              | Regional or vertical leader. |
| $1B                        | ~$5.9M               | Major platform in “escrow + credentials” space. |

With **Pro + other services**, the same volume can yield **meaningfully more** (e.g. +20–50% from subscriptions and add‑ons), and you’re less dependent on pure volume.

### 5.3 What “mature” means here

- **Product:** Escrow, MCCs, contracts, and (optionally) listener, Pro, verification API, and 1–2 other services are live and stable.
- **Distribution:** Clear wedge (e.g. XRPL/crypto‑native first, then high‑value international, then broader); some organic and some paid/partner.
- **Revenue:** Mix of volume fees + Pro (and possibly instant payout, FX, or white‑label). “Mature” in 5–7 years could mean **low single‑digit millions** in annual revenue if execution and niche choice hold; **tens of millions** in revenue would require scaling into a much larger volume and/or several paid services.

---

## 6. Team scaling triggers (from CLAUDE.md)

- 50 users → Community Manager  
- 100 users → Dispute Supervisor  
- 200 users → Full‑Stack Developer  
- 500 users → Legal / Compliance  
- 1,000 users → Growth / Marketing  

Revisit after tests and Phase 1 results.

---

## 7. Main operating expenses

What you pay to run StudioLedger (infrastructure, services, gas). Use this to plan runway and when to upgrade tiers.

| Category | What | Typical cost (early) | When it grows |
|----------|------|----------------------|----------------|
| **Hosting (frontend)** | Vercel | Free tier | Pro ~$20/mo if you need more builds/bandwidth. |
| **Database + Auth** | Supabase | Free tier | Pro ~$25/mo when you hit DB size or auth limits. |
| **Backend / workers** | Railway (API, n8n if self‑hosted) | ~$5/mo (e.g. one service) | Scales with usage; n8n + API can be ~$15–30/mo. |
| **IPFS (MCC metadata)** | Pinata | Free tier | Paid when storage/requests exceed free limits. |
| **Wallet connect** | Xaman (apps.xaman.dev) | Free (API keys) | Check Xaman’s current policy for high-volume apps. |
| **XRPL (gas)** | Platform wallet | XRP for tx fees (EscrowCreate, Finish, Payment, NFT mint) | Small at low volume; budget a few $/mo in XRP. |
| **Domain** | studioledger.ai (or chosen domain) | ~$10–15/yr | One-off/annual. |
| **Email / comms** | Transactional email (e.g. Resend, SendGrid) | Free tier then ~$10–20/mo | When you send a lot of notifications. |
| **Monitoring / errors** | Sentry, logging | Free tier | Paid when events exceed free tier. |
| **Payments (Pro)** | Stripe (or other) for subscriptions | 2.9% + $0.30 per charge | Only when you add Pro billing. |

**Summary (early / Phase 1):** You can run at **~$0–20/mo** on free tiers (Vercel, Supabase, Pinata) plus domain and a small Railway bill if you run n8n or a separate API. **Main expenses that scale first:** Supabase and Railway as users and data grow; XRPL gas stays low; add Stripe only when you launch Pro.

---

## 8. Next steps (after tests phase)

1. **Lock tests:** Money flows, listener, contract UX — green; no critical bugs.
2. **Revisit this doc:** Decide Pro launch window and first 1–2 Pro features.
3. **Decide “other services” order:** e.g. verification API vs instant payout vs FX, based on early user feedback and volume.
4. **Refine Phase 2:** Confirm geo/segment (Eastern Europe, SEA, LatAm, Africa) and whether positioning stays “high‑value international creators.”
