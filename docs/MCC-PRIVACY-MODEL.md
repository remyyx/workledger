# MCC Design Specification — Plate Number + ZK Privacy Model

> **Status**: Phase 1.5 (Confidential MPTs rollout, 2026 Q2-Q3)
> **Owner**: Remy Ruozzi
> **Created**: 15 April 2026
> **Purpose**: Define MCC appearance, privacy model, and user experience across public (XRPScan), private (StudioLedger), and regulatory (AUSTRAC) views

---

## 1. MCC on XRPScan — Public Blockchain View

### What the Public Sees

On XRPScan (XRPL block explorer), each MCC displays as a minimal, privacy-preserving record:

**Public Display Card:**
```
Plate Number:        MCC-0001-ABC123
Token ID:            000100001A2B3C4D...
Issuer:              rStudioLedger... [address]
ZK Proof Status:     ✅ VERIFIED
Proof Type:          Zero-Knowledge (Boundless)
Minted:              2026-06-25 14:32:15 UTC
Transaction Hash:    ABC123DEF456...
Metadata:            [Hidden by ZK Proof]
View Full Details:   [Link to StudioLedger.ai]
```

**What is visible:**
- ✅ Plate Number (MCC-0001-ABC123) — unique, non-identifying identifier
- ✅ Token ID — blockchain hash (immutability proof)
- ✅ Issuer wallet — StudioLedger's official XRPL address (proves legitimacy)
- ✅ ZK Proof Status — cryptographic verification checkmark
- ✅ Timestamp — when credential was minted
- ✅ Transaction hash — XRPL audit trail reference

**What is hidden (by ZK proof):**
- ❌ Creator wallet address
- ❌ Client wallet address
- ❌ Work amount/earnings
- ❌ Work description/category
- ❌ Creator name / client name
- ❌ Any transaction details

### How Different Audiences Read XRPScan

**Public eyes (Google, blockchain explorers):**
> "I see MCC-0001-ABC123 exists and is cryptographically valid. But I can't tell who created it, what work was done, or how much they earned. Privacy is protected."

**Savvy users & institutions (blockchain researchers, enterprise platforms):**
> "The ZK proof uses Boundless (RISC Zero). Let me verify the proof signature... ✅ Cryptographically valid. This credential is backed by real work and verified by StudioLedger. The details are hidden by design, which means this creator values privacy. That's a good signal."

**Governments & AUSTRAC (via audit API, not public XRPScan):**
> "Plate Number MCC-0001-ABC123 maps to our database record: Creator Alice, Client Bob, $500 AUD, Logo Design work, completed 2026-06-25. All Travel Rule data verified. The public ledger shows proof of authenticity; our database shows proof of compliance."

---

## 2. MCC for Users — Private View + Toggle Control

### Creator's Private View (Only Creator Sees)

When a creator views their own MCC in their StudioLedger dashboard:

**Full credential card (private, encrypted):**
```
MCC-0001-ABC123

Work Details
├─ Client: Bob Johnson
├─ Project: "Modern Logo Design"
├─ Category: Graphic Design → Logo & Branding
├─ Deliverables: 3 revisions, final files in PNG/SVG
└─ Completion: June 25, 2026

Earnings
├─ Amount: $500 AUD
├─ Payment Method: XRPL (USDT)
├─ Escrow Released: June 25, 2026, 14:32 UTC
└─ Fee: $4.90 (0.98% StudioLedger fee)

Verification
├─ Minted on XRPL: MCC-0001-ABC123
├─ ZK Proof: ✅ Valid
└─ View on XRPScan: [Link]

[SHARE CREDENTIAL] [KEEP PRIVATE] [DOWNLOAD PDF]
```

### Other Users' Public View (If Creator Shares)

When a creator chooses to share their MCC (e.g., on LinkedIn, portfolio, or publicly on StudioLedger marketplace), other users see:

**Shared credential card (polished, minimal):**
```
╔════════════════════════════════════════════════════════╗
║ 🏆 MINTED CRAFT CREDENTIAL                             ║
║    Verified Work Achievement                           ║
├────────────────────────────────────────────────────────┤
║                                                        ║
║ CREATOR:   Alice Chen                                  ║
║ WORK:      Modern Logo Design                          ║
║ CATEGORY:  Graphic Design                              ║
║ CLIENT:    [Visible if creator shared it]              ║
║ EARNINGS:  $500 USD                                    ║
║ COMPLETED: June 25, 2026                               ║
║                                                        ║
║ ✅ VERIFIED ON XRPL                                    ║
║    Plate Number: MCC-0001-ABC123                       ║
║    ZK Proof: Cryptographically Valid                   ║
║                                                        ║
║ CLIENT TESTIMONIAL:                                    ║
║ "Alice delivered exactly what I needed. Professional   ║
║  and on time. Highly recommend!"                       ║
║                                                        ║
║ [VIEW ON STUDIOLEDGER] [VERIFY ON XRPL]               ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

### Toggle Control & User Agency

Each creator has granular control over their MCCs:

| Visibility Level | Creator Controls | Other Users See |
|-----------------|-----------------|-----------------|
| **Private** | Full details (client, amount, work) | Nothing (not listed) |
| **Portfolio** | Full details | Card with all info (above) |
| **Anonymous** | Full details | Card without creator name |
| **Summary** | Full details | Just category + earnings band |
| **Proof Only** | Full details | Plate number + "Verify on XRPL" |

Each creator can set a **default sharing level** (e.g., "Share all MCCs as Portfolio") and **override per-credential** (e.g., "Keep this one private").

### Design Language & Aesthetic

**Visual design principles for MCC cards:**
- **Futuristic federal design**: Clean typography (sans-serif, modern), security badge aesthetics (checkmarks, locks, verification stamps)
- **Trust signaling**: Green verification checkmarks, blockchain logos, "AUSTRAC-Regulated" badge
- **Minimalist layout**: White space, hierarchical information (what matters most at top)
- **Accessibility**: High contrast, readable fonts, mobile-responsive cards
- **Social proof elements**:
  - Creator reputation score (aggregate MCC count, average rating)
  - Client testimonials (1-2 line excerpts)
  - "Verified on XRPL" badge with link
  - AUSTRAC compliance badge ("Registered VASP")
  - "Share to LinkedIn" button

**Aesthetic reference**: Blend of:
- LinkedIn credential card (professional, trustworthy)
- High-security passport design (formal, verifiable)
- Modern crypto UI (Opensea, Rainbow Wallet — clean, not intimidating)

---

## 3. AUSTRAC Monitoring & Creator Reporting

### AUSTRAC Monitoring (Regulatory Use)

**What AUSTRAC does (not public, not tax-related):**

AUSTRAC uses StudioLedger's internal compliance database to monitor for money laundering and terrorism financing risk. This is separate from the public XRPScan view and separate from creator-facing reports.

**AUSTRAC's access:**
- Full Travel Rule records (originator, beneficiary, amount, purpose)
- KYC data (creator identity, verification status, risk profile)
- Transaction history (all escrow releases, MCC mints)
- Red flags (large unusual transfers, sanctions screening hits)
- Audit trail (all system changes, disputes, reversals)

**AUSTRAC does NOT:** Issue tax reports to creators, require creators to file anything with AUSTRAC, or mix compliance monitoring with taxation.

### Creator Accounting Report (Self-Serve Use)

**What creators get (optional, self-serve, non-regulatory):**

Each creator can download a monthly or quarterly **Accounting Report** from their StudioLedger dashboard. This report is:

**Not a tax document** — cannot be filed with the ATO (Australian Tax Office)  
**Not a government requirement** — creators are not obligated to download or use it  
**For their own bookkeeping** — purely for internal accounting, income tracking, and optionally sharing with their accountant

**Creator Accounting Report includes:**
```
STUDIOLEDGER ACCOUNT SUMMARY
Creator: Alice Chen
Period: June 2026

WORK COMPLETED
├─ Total MCCs Minted: 8
├─ Total Earnings (AUD): $4,200
├─ Average per Project: $525
└─ Highest Earner: Bob's Logo Design ($500)

EARNINGS BY CATEGORY
├─ Graphic Design: $3,500 (83%)
├─ Web Design: $700 (17%)

ESCROW & RELEASES
├─ Total Escrow Locked: $4,204.90 (including fees)
├─ Total Released: $4,200 (payments received)
├─ Pending: $0
└─ Disputes: 0

COMPLIANCE STATUS
├─ KYC Verified: ✅ Yes
├─ Sanctions Screening: ✅ Pass
├─ Last Updated: June 15, 2026
└─ Account Status: Active

TRANSACTION DETAILS
├─ June 01: Logo Design ($500) — Minted as MCC-0001-ABC123
├─ June 05: Web Redesign ($700) — Minted as MCC-0002-DEF456
├─ June 25: Summer Brand Kit ($500) — Minted as MCC-0003-GHI789
... [8 transactions total]

EXPORT OPTIONS
├─ Download as PDF
├─ Download as CSV (for spreadsheet/accounting software)
└─ Share with Accountant (via secure link)

IMPORTANT: This is NOT a tax document. Consult your accountant
for tax reporting requirements.
```

### Why Creators Care

**Frictionless income tracking**: No manual reconciliation of crypto transfers or guessing at exchange rates; StudioLedger does that work.

**Easy bookkeeping**: CSV export works with QuickBooks, Xero, Wave, or any accounting software.

**Audit-ready**: If ever audited by the ATO, creators can show "I earned $X from StudioLedger, here's the proof from their official report" without needing to manually reconcile blockchain transfers.

**Peace of mind**: Clear separation between AUSTRAC compliance (happening in background) and creator's own accounting (in their hands).

### Key Distinction

| | AUSTRAC Monitoring | Creator Reporting |
|---|---|---|
| **For whom** | Regulators (AUSTRAC) | Creator (self) |
| **Data visible** | AUSTRAC staff (encrypted) | Only the creator (encrypted) |
| **Purpose** | Money laundering / terrorism financing risk detection | Creator's personal accounting |
| **Tax filing** | NO — not used for tax returns | NO — not a tax document |
| **Required** | YES — mandatory compliance (background) | NO — optional, self-serve |
| **Frequency** | Continuous monitoring | Monthly/quarterly reporting |
| **Creator burden** | Zero (automatic) | Optional (download if needed) |

---

## Summary: Three Layers, Perfect Privacy

| View | Visible To | Shows | Hides |
|------|-----------|-------|-------|
| **XRPScan (public)** | Anyone on internet | Plate number, ZK proof, timestamp | Creator, client, work, amount |
| **StudioLedger (private)** | Creator only | Full details (client, amount, work) | Only hidden if creator chooses "private" |
| **AUSTRAC (audit)** | Regulators only | Travel Rule data, KYC, risk flags | Never exposed publicly |

**Result**: Privacy + Compliance + User Control + Immutability. 

Solves Fiverr's problem (public data exposure) while maintaining regulatory auditability (AUSTRAC has the data, public doesn't).

---

*Last updated: 2026-04-15 | Owner: Remy Ruozzi | Confidential*
