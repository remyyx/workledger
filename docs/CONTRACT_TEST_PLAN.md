# StudioLedger — Contract test plan (all 6 templates)

This doc describes how to test **all six contract types** start-to-end. You need **at least 1 creator and 1 client (marketplace)**. The seed script creates **4 permanent virtual testers** (2 creators, 2 marketplace) and an optional script seeds **6 draft contracts** (one per type) for virtual testing.

---

## All contract / job types (overview)

Every contract or job on StudioLedger uses one of these six templates:

| # | Type | Description |
|---|------|--------------|
| 1 | **Fixed price** | Single deliverable, one payment. One milestone; fund once, deliver once, release once. |
| 2 | **Milestone** | Multiple deliverables with staged payments. Several milestones; fund in buffer (e.g. first 2); release one by one; next milestone funds on release. |
| 3 | **Retainer** | Recurring monthly work. Set monthly amount and start date; fund and release per cycle (e.g. monthly); can be fixed duration or ongoing. |
| 4 | **Pay per use** | Payment per usage event or unit (e.g. per download, per API call). Escrow/lifecycle TBD. |
| 5 | **License deal** | Rights-based: license terms (territory, duration, exclusivity, royalties). Stored with contract; escrow flow TBD. |
| 6 | **Subscription** | Recurring access or recurring deliverable (e.g. monthly content). Recurring billing flow TBD. |

**Implemented end-to-end today:** fixed price, milestone, retainer.  
**Defined and creatable via API (lifecycle TBD):** pay per use, license deal, subscription.

---

## Job configurations (3 per contract type)

Use these as reference when creating or testing each contract type. Three representative job setups per type:

| Type | Job configuration 1 | Job configuration 2 | Job configuration 3 |
|------|---------------------|----------------------|----------------------|
| **Fixed price** | Logo design — single deliverable, one payment | One-off video edit — single deliverable, one payment | Single consultation or audit — one session, one payment |
| **Milestone** | Website build — design → build → launch (3 milestones) | Brand identity — concept → guidelines → asset pack (3 milestones) | Album / EP production — demos → production → mix/master (3 milestones) |
| **Retainer** | Monthly social content — fixed hours/month, recurring | Ongoing dev or design support — monthly retainer, ongoing | Content or community management — monthly retainer, fixed duration |
| **Pay per use** | Per track licensed — payment per track used | Per API call or per 1k calls — usage-based | Per download or per asset — payment per unit |
| **License deal** | Music sync license — territory, term, exclusivity, royalty | Stock photo / asset license — rights, modifications, sublicensing | Font or template license — usage rights, embedding, revocability |
| **Subscription** | Monthly template or preset pack — recurring access to assets | SaaS or tool subscription — recurring access to product | Recurring content pack (e.g. monthly stems, samples) — recurring deliverable |

---

## 1. Prerequisites: 4 permanent virtual testers (2 creators, 2 marketplace)

- **Creator**: User who creates the contract (service provider). Must have `creator_id` in DB and an XRPL address for escrow payouts.
- **Marketplace (client)**: User who funds escrow and approves work (buyer). Referenced as `marketplace_id` in contracts.

### Option A — Seed script (recommended)

Run the seed script to create **4 permanent virtual testers**:

```bash
npm run seed:test-users
```

or

```bash
node --env-file=.env.local scripts/seed-test-users.mjs
```

This creates:

| Role        | Email | Display name | Password (change in prod) |
|------------|--------|--------------|----------------------------|
| Creator 1  | `creator1@test.studioledger.local` | Creator 1 (virtual tester) | `TestCreator1!` |
| Creator 2  | `creator2@test.studioledger.local` | Creator 2 (virtual tester) | `TestCreator2!` |
| Marketplace 1 | `marketplace1@test.studioledger.local` | Marketplace 1 (virtual tester) | `TestMarketplace1!` |
| Marketplace 2 | `marketplace2@test.studioledger.local` | Marketplace 2 (virtual tester) | `TestMarketplace2!` |

Use these accounts to log in and run the flows below. Optionally run **seed virtual contracts** to create 6 draft contracts (one per type) for creator1 and marketplace1:

```bash
npm run seed:virtual-contracts
```

(or `node --env-file=.env.local scripts/seed-virtual-contracts.mjs`). Run after `seed:test-users`.

### Option B — Manual

1. Register four accounts (or at least two: one creator, one marketplace) in the app (e.g. via `/register` or Google OAuth).
2. Use two as **creators** and two as **marketplace** (funds and approves).
3. When creating a contract as creator, set the marketplace email to the client user’s email.

---

## 2. The six contract templates

| # | Template       | UI (new contract) | API create | Escrow / lifecycle | Notes |
|---|----------------|--------------------|------------|--------------------|-------|
| 1 | **fixed_price** | ✅                 | ✅         | ✅ (single milestone) | One deliverable, one payment. |
| 2 | **milestone**   | ✅                 | ✅         | ✅ (buffer system)  | Multiple deliverables, staged payments. |
| 3 | **retainer**    | ✅                 | ✅         | ✅ (cycles)         | Recurring monthly; cycle fund/release. |
| 4 | **pay_per_use** | ❌                 | ✅         | ⚠️ TBD              | Create via API; escrow flow not yet wired. |
| 5 | **license_deal**| ❌                 | ✅         | ⚠️ TBD              | Create via API; license terms stored. |
| 6 | **subscription**| ❌                 | ✅         | ⚠️ TBD              | Create via API; recurring flow TBD. |

**Fully testable start-to-end today:** **fixed_price**, **milestone**, **retainer** (create in UI → fund as marketplace → submit/approve/release as creator/marketplace).

**API-only (no UI, escrow not fully wired):** **pay_per_use**, **license_deal**, **subscription**. You can create drafts via `POST /api/contracts` with the right payload; full funding/release flows may need implementation.

---

## 3. End-to-end flow (fixed_price, milestone, retainer)

For each of the three implemented types, the lifecycle is:

1. **Creator** logs in → creates contract (title, marketplace email = client, template, amounts, milestones or retainer terms).
2. **Marketplace** logs in → opens contract → **funds** (first milestone(s) or first retainer cycle). For milestone, buffer funds M1 (+ M2); for retainer, first cycle.
3. **Creator** → marks deliverable **submitted** for the funded milestone/cycle.
4. **Marketplace** → **approves** the submitted work.
5. **Creator or system** → **releases** (EscrowFinish + payment to creator + fee; for milestone, next milestone may auto-fund).
6. Repeat 3–5 for further milestones/cycles until contract is **completed** (and optionally MCC minted on final release).

### fixed_price

- One milestone. Create as creator with marketplace email = client. Client funds → creator submits → client approves → release. Done.

### milestone

- Two or more milestones. Creator creates with multiple milestones; client funds first 2 (buffer). Release M1 → M3 funds; release M2 → then M3; release M3 → contract complete.

### retainer

- Monthly cycles. Creator creates with retainer terms (monthly amount, start date, duration or ongoing). Client funds first cycle (and optionally second). Submit/approve/release per cycle; next cycle funds on release.

---

## 4. How to test (checklist)

- [ ] **Seed users**: Run `npm run seed:test-users` (4 virtual testers). Optionally run `npm run seed:virtual-contracts` for 6 draft contracts.
- [ ] **fixed_price**: Create as creator → fund as marketplace → submit → approve → release. Contract status = completed.
- [ ] **milestone**: Create with ≥2 milestones → fund M1+M2 as marketplace → submit M1 → approve M1 → release M1 (M3 funds) → submit M2 → approve M2 → release M2 → submit M3 → approve M3 → release M3. Contract completed.
- [ ] **retainer**: Create with monthly amount + start date → fund cycle 1 (and 2 if implemented) as marketplace → submit/approve/release cycle 1. Optionally repeat for cycle 2.
- [ ] **pay_per_use / license_deal / subscription**: Create via `POST /api/contracts` with correct `template` and payload; verify draft in DB. Document or implement funding/release when ready.
- [ ] **Seed virtual contracts** (optional): Run `npm run seed:virtual-contracts` after seed users to create 6 draft contracts (one per type) for creator1 ↔ marketplace1.

---

## 5. API quick reference

**Create contract (creator session)**

- `POST /api/contracts`
- Body: `title`, `description`, `template`, `marketplaceEmail`, `currency`, `totalAmount`, `milestones` (array of `{ title, description?, amount, deadline? }`), optional `retainer`, optional `licenseTerms`.
- Returns contract + milestones (with `condition`; `fulfillment` is server-only).

**Milestone actions (per milestone)**

- `PATCH /api/contracts/[id]/milestones/[seq]?action=fund|submit|approve|release|dispute`
- **fund**: marketplace only (Xaman or seed). **submit**: creator. **approve**: marketplace. **release**: creator or system (with fulfillment). **dispute**: either party.

Use these with the seeded creator and marketplace accounts to run through each contract type start to end.

---

## 6. API examples for Postman (create contract)

Log in as **creator1** (or creator2) in the app first, then in Postman set the request to your app base URL (e.g. `http://localhost:3000` or your Vercel URL). Send the session cookie from the browser (DevTools → Application → Cookies → copy the `sb-<project>-auth-token` value into Postman as a Cookie header), or use your auth setup. Method: **POST**, URL: **`/api/contracts`**, Body: **raw JSON**. Replace `marketplace1@test.studioledger.local` with the client email if needed.

### 1. Fixed price (e.g. logo design)

```json
{
  "title": "Logo design — brand mark",
  "description": "Single deliverable: final logo files (SVG, PNG).",
  "template": "fixed_price",
  "marketplaceEmail": "marketplace1@test.studioledger.local",
  "currency": "RLUSD",
  "totalAmount": 500,
  "milestones": [
    { "title": "Final logo delivery", "description": "SVG + PNG pack", "amount": 500, "deadline": "2025-04-30" }
  ]
}
```

### 2. Milestone (e.g. website build)

```json
{
  "title": "Website build — 3 phases",
  "description": "Design, build, launch.",
  "template": "milestone",
  "marketplaceEmail": "marketplace1@test.studioledger.local",
  "currency": "RLUSD",
  "totalAmount": 6000,
  "milestones": [
    { "title": "Design", "amount": 2000, "deadline": "2025-04-15" },
    { "title": "Build", "amount": 2500, "deadline": "2025-05-15" },
    { "title": "Launch", "amount": 1500, "deadline": "2025-06-01" }
  ]
}
```

### 3. Retainer (e.g. monthly social content)

```json
{
  "title": "Monthly social content",
  "description": "8 posts/month, copy + visuals.",
  "template": "retainer",
  "marketplaceEmail": "marketplace1@test.studioledger.local",
  "currency": "RLUSD",
  "totalAmount": 1200,
  "milestones": [
    { "title": "Cycle 1", "amount": 1200, "deadline": "2025-04-30" }
  ],
  "retainer": {
    "monthlyAmount": 1200,
    "startDate": "2025-04-01",
    "durationMonths": 0,
    "hoursPerMonth": 20
  }
}
```

### 4. Pay per use (API-only; lifecycle TBD)

```json
{
  "title": "Per-track license",
  "description": "Payment per track licensed.",
  "template": "pay_per_use",
  "marketplaceEmail": "marketplace1@test.studioledger.local",
  "currency": "RLUSD",
  "totalAmount": 100,
  "milestones": [
    { "title": "Per unit", "amount": 100, "deadline": null }
  ]
}
```

### 5. License deal (API-only; lifecycle TBD)

```json
{
  "title": "Music sync license",
  "description": "Non-exclusive sync for campaign.",
  "template": "license_deal",
  "marketplaceEmail": "marketplace1@test.studioledger.local",
  "currency": "RLUSD",
  "totalAmount": 2000,
  "milestones": [
    { "title": "License fee", "amount": 2000, "deadline": null }
  ],
  "licenseTerms": {
    "rights": "Sync, broadcast, digital",
    "territory": "World",
    "duration": "2 years",
    "exclusivity": "non-exclusive",
    "modifications_allowed": true,
    "sublicensing": false,
    "transferable": false,
    "royalty_percent": 0,
    "revocation_conditions": "None"
  }
}
```

### 6. Subscription (API-only; lifecycle TBD)

```json
{
  "title": "Monthly template pack",
  "description": "Recurring access to preset pack.",
  "template": "subscription",
  "marketplaceEmail": "marketplace1@test.studioledger.local",
  "currency": "RLUSD",
  "totalAmount": 29,
  "milestones": [
    { "title": "Month 1", "amount": 29, "deadline": "2025-04-30" }
  ]
}
```
