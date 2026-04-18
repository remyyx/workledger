# STRATEGY.md — StudioLedger Internal Strategy

> **Status**: Internal only. Not for external docs, regulatory filings, or pitch decks without review.
> **Last updated**: 2026-04-14 (added skill taxonomy, collectives/consortiums, B2B2C pivot strategy)
> **Supersedes**: `GROWTH_STRATEGY.md` and `MARKETING.md` (both now legacy — this is the single source of truth for strategy and positioning).

---

## 1. Origin & Vision

StudioLedger was born from a simple idea: generate smart contracts and ownership NFTs on the XRPL the moment it became technically feasible. The freelance economy turned out to be the perfect fit — escrow was the natural bridge between contract and payment, and from there, the concept grew into a full platform.

StudioLedger aims to become the trust-proof platform for qualified creatives and high-ticket projects — without excluding beginners or everyday users. We're building top-tier Web3 standards behind an effortless Web2 experience: any user can walk in, no wallet required, no jargon. We start with graphic designers and visual creatives — shaping the product around their workflow first — then expand across industries from there.

---

## 2. Market Position

StudioLedger is its own ecosystem — contract infrastructure with wallet, escrow, credentials, licensing, and dispute resolution built in. We offer a set of services that form a self-contained ecosystem and will rise from there.

The fee comparison (0.98% vs Upwork's 10–13% vs Fiverr's 20–25%) speaks for itself in the Fee Schedule. We don't need to name targets. The numbers do the talking.

**External document rules**:
- Regulatory and legal documents: describe what StudioLedger does, never who it's coming for. AUSTRAC doesn't need competitive ambitions. Lawyers don't need market-share projections.
- Pitch decks and grant applications: the competitor table is useful as landscape context (it shows the fee gap is real), but frame it as "here's where the industry sits" not "here's who we'll displace."
- Never position as an "Upwork killer" or claim we'll capture incumbent market share. That framing is premature and reads as posturing. Let the product and the numbers speak.

---

## 3. Positioning Pillars

1. **Trust-proof, not trustless** — "trustless" sounds negative to Web2 users. "Trust-proof" means the system eliminates the need for trust by design. Escrow, on-chain settlement, MCC credentials — every layer removes a trust dependency.

2. **Service intelligence** — the platform adapts to how each creative works. Not a one-size-fits-all form. The goal is to understand the user's craft and shape the contract, milestones, and deliverable structure around it. (Define concretely before using in external copy.)

3. **Web3 engine, Web2 door** — chain-agnostic at the door, XRPL-native at the core. No wallet required to start. No crypto jargon in the UI. The blockchain is infrastructure, not interface.

4. **The protection IS the product** — at 0.98%, nobody leaves to avoid fees. They stay because escrow protection is worth more than 0.98% of any contract. The fee is so low it's never the reason to leave.

5. **Ecosystem, not marketplace** — StudioLedger isn't a job board. It's contract infrastructure. The marketplace is one surface; the ecosystem is the product.

6. **Ledger-first reliability** — all payments, escrows, and MCC mints live on XRPL first. StudioLedger only mirrors what's already on the ledger. If the servers go down, money and history don't. When back online, events replay from XRPL — no transaction or credential is ever lost.

---

## 4. Go-to-Market: Start Narrow, Expand Wide

### Phase 1 — Graphic designers & visual creatives (Months 1–3)
- Target: 10 creators, 20 completed jobs
- Highest pain point: deliverable theft, scope creep, late payment
- Clearest deliverable format: files with visual proof (mockups, final assets)
- Natural fit for MCC credentials (portfolio proof of completed work)
- Community is vocal, connected, and early-adopter friendly
- Also includes Web3-native creators (XRPL community, crypto devs/designers) — lowest friction, already understand wallets and escrow
- **Goal**: prove one end-to-end story (draft → funded → deliver → approve → MCC) and 1–2 disputes handled well

### Phase 2 — Adjacent creative industries + international (Months 4–9)
- Target: 100 creators, 500 completed jobs
- Motion/video, audio/music, photography, UI/UX
- High-value international creators ($30K–$100K/yr) in Eastern Europe, SEA, LatAm, Africa
- Each vertical gets workflow adaptations (deliverable types, milestone structures, license templates)

### Phase 3 — Beyond creative (Months 10–18)
- Target: 1,000+ creators
- Development, consulting, professional services
- Enterprise pilots for high-value contracts
- International expansion (Japan first — highest language barrier, precision culture, captive market)
- Mainstream power users from incumbent platforms, small agencies

### Phase 4+ — Payment Infrastructure / B2B2C Pivot (Future)
- Shift from direct marketplace to payment rails for other platforms
- API/white-label partnerships with existing marketplaces (TIES, Upwork alternatives, indie platforms)
- See Section 4.5 (B2B2C Pivot) for detailed strategy

---

## 4.5 Product Features Roadmap

### Phase 2: Skill Taxonomy & Discovery

**Granular skill categorization** — Move from flat "Creator" profiles to deep taxonomies by industry/specialty.

Example structure:
```
Designer
  ├─ Graphic Design
  │   ├─ Logo & Branding
  │   ├─ Print Design
  │   └─ Social Media Graphics
  ├─ UI/UX Design
  │   ├─ Web Design
  │   ├─ Mobile App Design
  │   └─ Design Systems
  ├─ Motion Design
  │   ├─ 2D Animation
  │   ├─ 3D Animation
  │   └─ Motion Graphics
  └─ Illustration
      ├─ Character Design
      ├─ Concept Art
      └─ Comic/Storyboard
```

**Benefits**:
- Clients find specialists, not generalists
- Creators own their specialty (reduces search noise)
- Enables industry-specific contract templates (wedding photography ≠ product photography)
- Supports skill-based discovery browsing

**Implementation**:
- Add `skill_category` and `skill_specialty` columns to creator profiles (migration)
- Create skill taxonomy table with standardized naming (prevents "photographer" vs "photography" fragmentation)
- Update profile form: role → category → specialty → tags
- Implement discovery filters by category/specialty/experience_level
- Update MCC metadata to include skill classification

### Phase 2: Collectives, Consortiums & Team Features

**Creator collectives** — Allow multiple creators to form formal teams/agencies with shared escrow, reputation, and marketplace presence.

**What this enables**:
- A designer + developer + copywriter form a "Brand Studio" collective
- One marketplace listing, one team wallet, shared MCC portfolio
- Team member contributions tracked separately (for tax/payment purposes)
- Clients hire "the team" not individuals
- Revenue splits automatically on escrow release (configurable per project)

**Team benefits**:
- Bundled proposals ("branding + web design + copywriting" = higher value, less sales friction)
- Shared reputation (stronger collective than solo)
- Cross-promotion on each member's portfolio
- Simplified hiring (one contract, one escrow, multiple deliverables/owners)

**Complementary matching** — When a contract milestone is submitted:
- System suggests related services ("This designer might benefit from a copywriter for Phase 2")
- One-click "invite to team" → new milestone tier added to escrow
- Team consent required; payment remains under single escrow

**Implementation**:
- New `creator_collectives` table (name, slug, members, shared_wallet_id, escrow_split_config)
- New `collective_members` junction (role, revenue_share, start_date)
- Update contract detail: "Add team members to this contract" workflow
- New collective profile page: `/collective/studio-name` with shared portfolio + member bios
- New collective reputation score (average of members + team-specific achievements)
- Update escrow release: auto-split to collective member wallets per agreement

**Regulatory note**: Collective wallet is a shared entity; AUSTRAC treats it as a single user account with multiple signatories (covered under Philosophy A). Platform manages the wallet; each member accesses via their OAuth login.

### Phase 3+: B2B2C Payment Infrastructure Pivot

**Strategic pivot** — Transition from direct-to-creator marketplace to **payment rails for other creator platforms**.

**Why this matters**:
- TIES, Upwork, and indie platforms all need escrow but can't easily get AUSTRAC registration
- Regulatory moat: StudioLedger is the only VASP-registered player in this space
- Network effects: creators using StudioLedger payment layer see the StudioLedger marketplace (potential future usage)
- Higher margins: charge platforms 2.5–3.5% (vs direct 0.98%) for white-label/API access

**Model**:
- **Direct creators**: 0.98% (as now)
- **Platform partners**: 2.5–3.5% (StudioLedger keeps 1.5–2.5%, platform rebrands or integrates via API)
- **Licensing**: white-label escrow for platforms that want to brand it as their own payment guarantee

**What we provide to partners**:
- Escrow API (REST + webhooks)
- Creator directory (optional: let creators sync StudioLedger wallet to partner marketplace)
- MCC minting on their behalf (partner-branded or StudioLedger-native)
- Dispute arbitration (platform can use StudioLedger's community panel or manage own)
- Compliance/AUSTRAC (StudioLedger's registration covers the transaction)
- Multi-currency support (XRPL settlement)

**Example partnerships**:
- TIES uses StudioLedger escrow API → "Guaranteed Payments by StudioLedger"
- Fiverr adds XRPL payment option → white-labeled StudioLedger backend
- Podia (all-in-one creator platform) embeds escrow checkout
- Mighty Networks (community platform) adds escrow for paid gigs within communities
- Indie creator platforms (e.g., Patreon competitors) embed payment guarantee layer

**Revenue projection** (Phase 3 maturity):
- 10 partner platforms, avg $5M annual volume each = $50M total volume
- At 2% platform margin = ~$1M annual revenue
- Direct marketplace (1,000 creators, $60M volume) = ~$588K
- **Combined**: ~$1.6M annual from platform + direct

**GTM approach** (Phase 3):
1. Prove direct marketplace works (Phase 1–2)
2. Approach 2–3 "early partner" platforms with API integration offer (free for first 6 months, then 2% margin split)
3. Document partnership via case study + integration guide
4. Approach larger platforms (Upwork, Fiverr, TIES) with partnership proposal (3.5% to them, 0.5% to StudioLedger, balanced value)

**Competitive advantage**:
- AUSTRAC registration is a moat. Competitors can't easily replicate.
- Escrow on XRPL is transparent and auditable. Hard to compete on security.
- 0.98% direct fee + partnership margins = sustainable unit economics without needing high volume.

**Risk mitigation**:
- Don't deprioritize direct marketplace while pursuing partnerships. Phase 1–2 proves concept and builds credibility with partners.
- Partnerships can't be the only revenue (platform dependency risk). Keep direct marketplace as anchor.
- White-label doesn't dilute StudioLedger brand if positioned as "the infrastructure they use, not the brand they see."

---

## 5. Revenue Model

### 5.1 Volume (core)
- **0.98% per escrow release** — the public promise, no change
- **0.1% on DEX swaps**
- **5% arbitration fee** from losing party in disputes

### 5.2 Volume sanity check (N × V × M)
- **N** = active creators, **V** = average contract value, **M** = contracts per creator per year
- Formula: `Revenue ≈ N × V × M × 0.0098`

| Scenario | N | V | M | Volume | Fee revenue (0.98%) |
|----------|---|---|---|--------|---------------------|
| Phase 1 | 10 | $5,000 | 2 | $100K | ~$980 |
| Phase 2 | 100 | $8,000 | 5 | $4M | ~$39.2K |
| Phase 3 | 1,000 | $10,000 | 6 | $60M | ~$588K |

The 0.98% model is sustainable only with real volume. Pro tier and additional services reduce dependence on volume alone.

### 5.3 Tier Structure

Three tiers, built around two wallet philosophies:

- **Philosophy A (Platform-managed)**: StudioLedger creates and manages the user's XRPL account behind the scenes. User never sees crypto jargon. Funds in/out via card or bank transfer. Platform holds escrow preimage and wallet seed. Maximum UX simplicity. Full compliance control (AUSTRAC can freeze assets, platform resolves disputes unilaterally).
- **Philosophy B (Self-custody + multi-sign)**: User brings their own wallet (Xaman, GemWallet, Crossmark, MetaMask, Phantom). Escrow release requires 2-of-3 multi-sign (creator + marketmaker + platform). No single party can move funds alone. User funds are never trapped by platform failure. Transparent, auditable, sovereign.

**Philosophy A is the default at every tier.** Philosophy B is an opt-in security upgrade at the Enterprise tier.

| | **Free** | **Pro** | **Enterprise** |
|---|---|---|---|
| **Wallet** | Philosophy A (platform-managed) | Philosophy A (platform-managed) | Philosophy A default + Philosophy B opt-in (self-custody, multi-sign) |
| **Escrow fee** | 0.98% | 0.98% | 0.98% |
| **Subscription** | $0 | $29–$49/mo (or ~$299–$499/yr) | Custom pricing |
| **Contract limit** | Up to $10K per contract | Up to $50K per contract | Up to $250K+ per contract |
| **KYC** | Basic (ID + selfie) | Enhanced (+ proof of address, source of funds) | Enhanced + ongoing monitoring |
| **Dispute resolution** | Platform-mediated | Priority dispute resolution | Dedicated support, custom SLAs |
| **Features** | Core escrow, MCC minting, marketplace access | + advanced analytics, PDF/CSV export, public MCC portfolio (`/c/username`), "Pro" badge, API access, multiple active contracts, team members | + multi-sign security, on-chain verification dashboard, compliance reporting, white-glove onboarding |

**Why Philosophy B is Enterprise-only**: multi-sign requires wallet setup, trust line configuration, and co-signer approval — friction that makes sense when $50K–$250K is on the line but kills conversion for a $2K logo job. Enterprise users understand and value the security trade-off. Free/Pro users want Upwork-level simplicity with escrow protection underneath.

**Regulatory alignment**: Free and Pro tiers stay under Philosophy A where AUSTRAC compliance control is strongest. Enterprise Philosophy B users accept shared control via multi-sign — the platform remains a co-signer and can refuse to sign if compliance requires it (not a full freeze, but blocks platform-involved releases). This is a known trade-off documented in the AML/CTF program.

**Revenue model**: the 0.98% applies across all tiers — consistent, transparent, never changes. Subscription revenue stacks on top. At Phase 2 volume (100 creators, $4M annual volume), Pro subscriptions alone could add $15K–$30K/yr alongside ~$39K in escrow fees.

**Decision gate**: which 1–2 Pro features to ship first, when to add billing (Stripe or equivalent). Pro tier launches after Phase 1 tests confirm demand.

### 5.4 StudioLedger Lite — Non-Custodial Side Project (Philosophy B)

A lightweight, internationally-available companion product that operates on a pure Philosophy B model. No custody, no KYC, no AUSTRAC dependency. Ships fast, occupies the competitive angle before someone else does.

**Core features (MVP):**
- Xaman/GemWallet wallet-connect (user brings their own XRPL wallet)
- P2P escrow via XRPL native EscrowCreate — client signs directly, platform never touches funds
- MCC minting to user's own wallet address (same taxon system: T1–T4)
- Public credential portfolio page — reads MCCs from on-chain, zero DB dependency

**What it does NOT have:** fiat on-ramp, balance management, currency conversion, wallet creation, KYC. The user handles all of that through their own wallet.

**Revenue model:**
- Flat minting fee per MCC (2–5 XRP, paid on-chain at mint)
- Optional premium subscription (advanced portfolio, analytics, verified badge)
- Referral program

**Regulatory position:** Non-custodial, no money transmission, no stored value. Likely falls outside AUSTRAC VASP scope — confirm with Chamberlains. Can operate internationally from day one without KYC since users already passed their wallet provider's checks.

**Strategic value:**
- Captures global crypto-native freelancers who won't sign up for custodial KYC'd platform
- Funnel to StudioLedger proper when users want fiat settlement, dispute resolution, compliance
- Credentials (MCCs) are the same NFTs on the same ledger — portfolio spans both products
- Gives Ripple a second product to point at: XRPL infrastructure, not just a single dApp
- Defensive: occupies the "non-custodial freelancer escrow" niche before competitors do

**Build estimate:** 2–3 weeks MVP. Reuses existing escrow condition generation, MCC minting code, XRPL client, NFT registry. Main new work: wallet-connect integration + simplified UI.

**Status:** Approved as side project (April 2026). Build after StudioLedger testnet demo is clean.

### 5.5 Future revenue streams (both products)

| Service | What | When |
|---------|------|------|
| Instant payout / advance | Creator paid on submit; platform advances; fee on release | When volume and trust are high |
| FX / multi-currency | Conversion spread (EUR ↔ USDC etc.) | When multi-currency usage is significant |
| Premium dispute facilitation | Faster review, dedicated mediator, white-glove evidence | When dispute volume justifies it |
| MCC / contract verification API | "Verify this MCC" for recruiters, clients, platforms | When MCC adoption is visible |
| White-label / embedded escrow | Other marketplaces embed our escrow; rev share | When 1–2 partners ask |
| Templates / legal packs | Paid SOW, IP transfer, retainer templates | When creators ask for "serious" contracts |
| Analytics / tax export | Revenue by client, accountant-ready reports | As Pro or one-off add-on |
| AI contract assist | Auto-fill scope, milestones, deliverables from plain-language input (Claude API) | Phase 2 — free tier basic, Pro tier advanced |
| AI brief improvement | Flag ambiguous scope, suggest milestones, reduce pre-dispute friction | Phase 2 — Pro feature |
| AI dispute summarisation | One-page evidence brief for admin/arbitrator review | When dispute volume justifies it |

### 5.6 Mature scenarios (illustrative)

| Annual volume | Fee revenue (0.98%) | Stage |
|---------------|---------------------|-------|
| $10M | ~$98K | Strong Phase 2 / early Phase 3 |
| $50M | ~$490K | Established niche player |
| $200M | ~$1.96M | Regional or vertical leader |
| $1B | ~$9.8M | Major platform in escrow + credentials space |

With Pro + other services, the same volume can yield +20–50% from subscriptions and add-ons.

---

## 6. Operating Expenses (Early Stage)

| Category | Service | Early cost | When it scales |
|----------|---------|------------|----------------|
| Hosting (frontend) | Vercel | Free tier | Pro ~$20/mo at higher builds/bandwidth |
| Database + Auth | Supabase | Free tier | Pro ~$25/mo at DB size or auth limits |
| Backend / workers | Railway (API, n8n) | ~$5/mo | ~$15–30/mo with n8n + API |
| IPFS (MCC metadata) | Pinata | Free tier | Paid at storage/request limits |
| Wallet connect | Xaman | Free (API keys) | Check policy for high-volume |
| XRPL gas | Platform wallet | XRP for tx fees | A few $/mo at low volume |
| Domain | studioledger.ai (Cloudflare) | $180 AUD / 2 yrs ($90/yr) | Annual renewal |
| Email | Proton Mail (custom domain) | ~$8 AUD/mo | Scales with mailboxes |
| Monitoring | Sentry | Free tier | Paid at event limits |
| Payments (Pro) | Stripe | 2.9% + $0.30/charge | Only when Pro billing launches |

**Phase 1 burn: ~$0–20/mo** on free tiers plus domain. Main costs that scale first: Supabase and Railway as users grow. XRPL gas stays low. Add Stripe only when Pro launches.

---

## 7. Team Scaling Triggers

| Threshold | Hire |
|-----------|------|
| 50 users | Community Manager (first hire) |
| 100 users | Dispute Supervisor |
| 200 users | Full-Stack Developer |
| 500 users | Legal / Compliance |
| 1,000 users | Growth / Marketing |

Revisit after Phase 1 results.

---

## 8. Marketing Copy & Positioning Language

### One-liners
- **Primary**: "A creator studio wallet that bills, protects, and proves your work — all on XRPL."
- **Extended**: A creator studio wallet with escrow-protected billing, smart contracts, and MCC-verified work receipts. 0.98% fees per release, instant settlement, and portable reputation you can take anywhere.

### Core value props (for landing pages)
- **Escrow protection (XRPL-native)**: Funds locked on-chain in XRPL escrow, not in StudioLedger's bank account. Buyers can't ghost you after you deliver.
- **Radically low, transparent fees**: 0.98% per escrow release. No hidden spreads, no "processing" delays. Keep 99% of what you earn.
- **Portable reputation (MCCs)**: Every completed job mints a Minted Craft Credential — a verified work receipt with scope, amount, and delivery details. Your track record goes with you.
- **Multi-currency, XRPL settlement**: Multiple currencies (XRP, RLUSD, USD, EUR, USDC, USDT). Settlement always clears on XRPL, with instant finality.
- **Ledger-first reliability**: If our servers go down, your money and history don't. Every escrow and payment lives on XRPL first.

### Dispute resolution story
- 3-tier: direct resolution (7 days) → platform-mediated review → community arbitration (MCC-holding peers)
- 5% arbitration fee to losing party. Evidence stored via IPFS hash.
- Copy: "Decisions based on verifiable work history and on-chain facts, not opaque support tickets."

### Ready-made lines (hero blocks, ads, cards)
- "Bill, protect, and prove your work — all on XRPL."
- "0.98% fees, on-chain escrow, portable credentials."
- "If we go down, your money and history don't. XRPL is the source of truth."
- "Every completed job mints a Minted Craft Credential — a verified receipt you own."
- "Keep 99% of what you earn on every release."

### Fee positioning
- "0.98% per escrow release, 0.1% on swaps. That's it."
- The Fee Schedule has the competitor comparison table (Upwork 13.4% total cost, Fiverr 25.5% total cost, StudioLedger 0.98%). Use for context in grant/pitch decks, not in regulatory docs.

---

## 9. Terminology (Marketing-Safe)

- **Roles**: creator (service provider) and marketmaker/client (buyer). "Marketplace" refers to the place where offers and projects are listed — never to the buyer role. Avoid "freelancer" in new copy.
- **MCC**: Always introduce as **Minted Craft Credential (MCC)** on first use. In copy, describe as "verified work receipt" or "on-chain credential" — **never** "proof of work" (that's Bitcoin's consensus mechanism). Preferred brand term is MCC, not "NFT credential."
- **MCC categories**: Taxon 1 = Work Credential (portfolio proof), Taxon 2 = Usage Right License (what buyer can do with work), Taxon 3 = Membership Access Token (ongoing access/loyalty).
- **Color associations**: Credential icon = magenta/pink (`--accent-purple`), Membership icon = true purple (`#7f3ac6`). Do not swap.
- **"Marketmaker"**: UI label for the buyer role in TopBar. One word, capital M.

---

## 10. Target Jurisdictions & Free Advertising Channels

> **Last updated**: 2026-04-15

### 10.1 Jurisdictional Targeting Map

StudioLedger's AUSTRAC registration regulates the operator, not the user's origin. Users from most countries can be served from day one, provided sanctions screening is in place and the ToS reflects any exclusions.

**Green — advertise freely now**

| Region | Countries | Why |
|--------|-----------|-----|
| Home base | **Australia** | AUSTRAC-registered, ABN/ACN in place, fully legal. Start here for credibility and first case studies |
| UK | **United Kingdom** | Crypto-friendly, FCA clear guidance, large freelance/creator market |
| EU / EEA | **Germany, Netherlands, France, Portugal, Estonia** | MiCA settled, big creator economy, EUR currency already supported |
| Asia-Pacific | **Singapore** | Crypto hub, English-speaking, MAS regulated. Phase 2–3 expansion target |
| Asia-Pacific | **Japan** | i18n priority #1. High language barrier = sticky once in. FSA-regulated, crypto widely adopted |
| Asia-Pacific | **South Korea** | Huge crypto adoption, massive creator economy (K-content) |
| Middle East | **UAE / Dubai** | VARA-regulated, crypto-welcoming, high-value contracts, English widely spoken |
| North America | **Canada** | Crypto-legal, strong freelance market, no US-level regulatory complexity |
| Southeast Asia | **Philippines, Vietnam, Indonesia** | Enormous creator populations, high crypto adoption, 0.98% fee radically appealing vs 20% platforms |
| Eastern Europe | **Ukraine, Georgia, Poland, Romania** | Strong dev/design talent pools, crypto-savvy. Phase 2 target |
| Latin America | **Brazil, Argentina, Colombia, Mexico** | Creator boom, currency instability makes RLUSD settlement genuinely attractive |
| Africa | **Nigeria, Kenya, South Africa, Ghana** | Fast-growing creator economies, mobile-first, cross-border payment pain is real |

**Yellow — proceed with caution**

| Region | Countries | Why |
|--------|-----------|-----|
| Asia | **India** | Huge market but crypto taxation punitive (30% flat tax, 1% TDS). Don't block, don't target |
| Eastern Europe | **Russia** | Sanctions complexity. Target Russian-speaking creators in non-sanctioned countries only (Ukraine, Georgia, Kazakhstan, Armenia) |

**Red — block or exclude**

| Region | Countries | Why |
|--------|-----------|-----|
| North America | **USA** | Requires FinCEN MSB + state money transmitter licenses. Add ToS exclusion. Revisit Phase 3+ |
| Asia | **China** | Crypto officially banned, Great Firewall. Diaspora markets only (Singapore, Canada, Australia) |
| Sanctioned | **North Korea, Iran, Syria, Cuba, Crimea** | OFAC + AUSTRAC sanctioned. Hard block in sanctions screening |

**Targeting order:**
1. Australia + XRPL global community (now — warmest audience, fastest feedback)
2. SEA + LatAm creator communities (cheap attention, real pain point with cross-border payments)
3. UK + EU (credibility markets, MiCA-clear)
4. Japan (once i18n is ready — highest lock-in potential)

### 10.2 Free Advertising Channels

All channels below are zero-cost. Ordered by priority for Phase 1.

**Tier 1 — Start immediately**

| Channel | What to do | Why it works |
|---------|------------|--------------|
| **XRPL Discord & Twitter/X** | Post progress updates, escrow flow screenshots, MCC mints. Tag XRPL Labs, Ripple, RLUSD accounts | Home community, tight-knit, actively supports builders. Phase 1 users live here |
| **Twitter/X (building in public)** | Thread format: "I built an escrow protocol for creators on XRPL — here's why" with real transaction screenshots | Free, high reach, organic traction. Building-in-public gets engagement without feeling like an ad |
| **Xaman community** | Share integration progress — StudioLedger uses their SDK, they amplify ecosystem projects | Already integrated, warm relationship by default |
| **LinkedIn (personal profile)** | Post founder journey: building StudioLedger, AUSTRAC registration story, regulatory decisions | Attracts Marketmaker side (buyers who hire creatives). Professional credibility |

**Tier 2 — Once landing page is live**

| Channel | What to do | Why it works |
|---------|------------|--------------|
| **Hacker News (Show HN)** | Single post: "Show HN: StudioLedger — escrow settlement protocol for creative work on XRPL." Lead with the protocol story, not "freelance platform" | High-quality tech audience, drives thousands of visits + backlinks (solves SEO problem). One shot — save for when landing page is polished. See note below |
| **Product Hunt** | Launch page with screenshots, demo video, founder story | Good for one burst of visibility. Only get one launch, so timing matters |
| **Reddit** | r/XRP, r/Ripple, r/cryptocurrency, r/freelance, r/web3, r/australia, r/AusFinance | Post as builder sharing progress, not as ad. Reddit kills obvious self-promotion but rewards transparency |

**Tier 3 — Phase 2 expansion**

| Channel | What to do | Why it works |
|---------|------------|--------------|
| **Creator communities** | Behance forums, Dribbble, design/dev Discords, freelance Slack groups | Where actual users hang out. Lead with escrow protection angle, not crypto angle. Creators care about getting paid |
| **XRPL Grants community** | Engage before and during grant application process | Visibility as active builder strengthens grant application |
| **Crypto media** | Pitch to CoinDesk, The Block, Decrypt for coverage once there's a real story (first completed escrow, AUSTRAC registration) | Free PR if the story is good enough |

**What to avoid for now:**
- Facebook/Instagram ads (costs money, wrong audience for Phase 1)
- US-targeted anything (until ToS exclusion sorted)
- Broad "freelance platform" positioning (drown next to Upwork/Fiverr — lead with protocol story)

### 10.3 About Hacker News

Hacker News (news.ycombinator.com) is a tech community run by Y Combinator. It's where developers, founders, and investors share and discuss tech projects. The "Show HN" format is specifically for creators to present something they've built — exactly what Uaryn did to launch (their post got traction the same week we checked).

**How it works:** You submit a post titled "Show HN: StudioLedger — [one-line pitch]" with a link to studioledger.ai. The community upvotes and comments. A good Show HN can drive 5,000–20,000 visits in 24 hours and creates permanent backlinks (major SEO boost).

**Rules:** Must be something you built. No marketing fluff — the community values technical substance and honest founder stories. Be in the comments answering questions. One launch per project (don't waste it on a half-finished landing page).

**When to use it:** After the landing page is live with real copy and ideally one or two completed escrow cycles you can reference. This is a single-use weapon — make it count.

---

## 11. Next Steps (After Tests Phase)

### Phase 1 completion (MVP)
1. Lock tests: money flows, XRPL listener, contract UX — green, no critical bugs
2. Enable Google OAuth in Supabase (user configuration)
3. Test full signup flow E2E (Google → callback → register → dashboard)
4. Test "Make an offer" and contract lifecycle end-to-end
5. Seed test users and run 3–5 manual contract cycles to validate escrow + milestone + MCC flow

### Phase 2 planning
1. **Skill taxonomy**: Define categories/specialties for Phase 2 launch. Build migration + UI for creator profile updates.
2. **Collectives**: Design collective wallet flow, revenue split logic, complementary matching algorithm. Evaluate if Phase 2 or Phase 3.
3. **Pro tier**: Decide launch window (Phase 2 start or Phase 2 end). Pick first 1–2 features (analytics, team members, public portfolio).
4. **Geo/segment targeting**: Based on Phase 1 results, refine Phase 2 priorities (which creative verticals, which regions).
5. **Industry templates**: Research 3–5 creative verticals (wedding photography, product design, motion graphics, music production, web development). Define milestone structures + deliverable types for each.

### Phase 3+ planning
1. **B2B2C partnerships**: Document StudioLedger API spec (escrow, MCC, settlement). Prepare 1-page partnership proposal for indie platforms.
2. **Regulatory timeline**: After AUSTRAC Tranche 2 enrolment (31 Mar–29 Jul 2026), revisit partnership approach. Emphasize VASP registration as moat for early partners.
3. **Future services prioritization**: Based on Phase 1–2 volume, decide order (verification API, instant payout, FX, premium dispute facilitation).

---

## Footer (Mainnet)

```
StudioLedger Pty Ltd | ACN 696 549 809 | ABN 31 696 549 809  www.studioledger.ai
```

---

*This document is internal strategy. See CLAUDE.md for project architecture, METACONTEXT.md for current build state, FOUNDER.md for personal/founder context.*
