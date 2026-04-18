# MCC-DESIGN.md — Minted Craft Credential Visual Design Specification

> **Status**: Active design spec. Reference for all MCC-related UI work.
> **Created**: 2026-04-17 (Session 17)
> **Aesthetic**: Federal certificate — institutional authority meets modern craft.

---

## 1. Design Philosophy

MCCs are not generic NFT cards. They are **digital certificates of professional achievement** — closer to a federal bond, a university diploma, or a Swiss watch guarantee card than a JPEG thumbnail.

The visual language draws from:
- **Federal currency engraving** — fine-line guilloche patterns, microprint borders, intaglio-style textures
- **Government-issued credentials** — passport data pages, professional licenses, notary seals
- **Institutional trust signifiers** — embossed seals, serial numbers, watermarks, security features
- **Modern craft** — clean typography, deliberate whitespace, restrained color

The goal: when a creator shows their MCC portfolio, it should feel like opening a leather-bound credential folio — not scrolling a trading card gallery.

---

## 2. Taxon Visual System

Each MCC taxon has a distinct identity within the shared federal aesthetic.

### Taxon 1 — Work Credential (Creator)
- **Purpose**: Proof of completed work, issued to creator on milestone release
- **Color palette**: Deep navy (#0A1628) + gold foil (#C9A84C) + cream parchment (#F5F0E8)
- **Border pattern**: Double-rule with inner guilloche band
- **Seal**: StudioLedger emblem, bottom-right, gold on navy
- **Mood**: Professional achievement — "you built this"

### Taxon 2 — License (Usage Rights)
- **Purpose**: Grants usage rights for delivered assets
- **Color palette**: Forest green (#1A3A2A) + silver (#B8C4C8) + ivory (#FAFAF5)
- **Border pattern**: Single-rule with hash marks (like a legal document margin)
- **Seal**: Lock + key emblem, bottom-right, silver on green
- **Mood**: Legal instrument — "you may use this"

### Taxon 3 — Access Pass (Membership)
- **Purpose**: Membership, loyalty, or access credential
- **Color palette**: Charcoal (#2C2C2C) + copper (#B87333) + warm white (#FDF8F0)
- **Border pattern**: Rounded corners with perforated edge (like a transit pass)
- **Seal**: Gate emblem, bottom-right, copper on charcoal
- **Mood**: Exclusive access — "you belong here"

### Taxon 4 — Client Completion (Marketplace)
- **Purpose**: Proof of successful commission, issued to marketplace/client on milestone release
- **Color palette**: Slate blue (#2D3E50) + rose gold (#B76E79) + off-white (#F8F6F3)
- **Border pattern**: Double-rule with dotted inner border
- **Seal**: Handshake emblem, bottom-right, rose gold on slate
- **Mood**: Partnership record — "you commissioned this"

---

## 3. Credential Card Anatomy

Every MCC card follows this layout regardless of taxon:

```
┌──────────────────────────────────────────┐
│  ┌─ guilloche border ──────────────────┐ │
│  │                                     │ │
│  │  STUDIOLEDGER              [TAXON]  │ │  ← Header: wordmark + taxon badge
│  │  ─────────────────────────────────  │ │
│  │                                     │ │
│  │  ▓▓▓▓▓▓▓▓▓                         │ │  ← Deliverable thumbnail (if media)
│  │  ▓▓▓▓▓▓▓▓▓   Contract Title        │ │     or abstract pattern (if no media)
│  │  ▓▓▓▓▓▓▓▓▓   Milestone: "M1 Name"  │ │
│  │               Amount: 500 RLUSD     │ │
│  │                                     │ │
│  │  ISSUED TO        ISSUED BY         │ │  ← Parties (names, not addresses)
│  │  Creator Name     Client Name       │ │
│  │                                     │ │
│  │  COMPLETED        CREDENTIAL ID     │ │  ← Date + truncated NFTokenID
│  │  17 Apr 2026      ABC1...F8E9       │ │
│  │                                     │ │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │ │  ← Microprint: tx hash (decorative)
│  │                          [SEAL]     │ │  ← Embossed seal, bottom-right
│  └─────────────────────────────────────┘ │
│   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │  ← Security dots (like currency)
└──────────────────────────────────────────┘
```

### Field mapping (DB → Card)

| Card field | Source |
|---|---|
| Contract Title | `contracts.title` |
| Milestone | `milestones.title` + `milestones.sequence` |
| Amount | `milestones.amount` + `milestones.currency` |
| Issued To | `users.display_name` (owner) |
| Issued By | `users.display_name` (counterparty) |
| Completed | `milestones.released_at` |
| Credential ID | `nft_registry.nft_token_id` (first 4 + last 4 chars) |
| Tx Hash (microprint) | `nft_registry.mint_tx_hash` |
| Deliverable thumb | `milestones.deliverable_media_url` (if exists) |
| Taxon badge | `nft_registry.taxon` → mapped to label |

---

## 4. Animated MCC Component — `<MCCCard />`

### Component specification

```
File: src/components/credentials/MCCCard.tsx
```

The card has three animation states triggered by user interaction:

### 4.1 Idle State
- Subtle guilloche shimmer — the border pattern has a slow (8s) CSS gradient animation that gives the illusion of light passing over engraved lines
- The seal pulses very gently (scale 1.0 → 1.02, opacity 0.8 → 1.0, 4s cycle)
- Microprint tx hash scrolls slowly left-to-right (marquee, 20s cycle)

### 4.2 Hover State (200ms transition)
- Card lifts: `translateY(-4px)`, `box-shadow` expands to a warm ambient glow matching the taxon accent color at 15% opacity
- Guilloche border brightens — gradient midpoint shifts, accent color intensifies
- Seal scales to 1.05 with full opacity
- Credential ID fades from truncated to full (still truncated to ~16 chars, but expands from 8)
- Deliverable thumbnail (if present) gets a subtle zoom (scale 1.0 → 1.03)

### 4.3 Flip State (click/tap → 400ms 3D flip)
- `rotateY(180deg)` with `perspective(1200px)` on parent
- **Back face** shows:
  - Full contract metadata (all milestones, total value, contract dates)
  - On-chain verification link (XRPL explorer URL)
  - Deliverable hash (full SHA-256)
  - QR code linking to the on-chain token (future)
  - "Verify on XRPL" button linking to `https://livenet.xrpl.org/nft/{nft_token_id}`
- Back face uses the same color palette but inverted (accent as background, base as text)

### 4.4 Animation implementation notes

All animations use CSS transitions/keyframes — no JS animation libraries. Keeps bundle small and GPU-accelerated.

```css
/* Guilloche shimmer */
@keyframes guilloche-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* Seal pulse */
@keyframes seal-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.02); opacity: 1; }
}

/* Microprint scroll */
@keyframes microprint-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

The 3D flip uses `transform-style: preserve-3d` on the card wrapper with `backface-visibility: hidden` on both faces.

---

## 5. Guilloche Pattern Generation

The border guilloche is not an image — it's generated with SVG `<path>` elements using parametric spirograph equations:

```
x(t) = (R - r) * cos(t) + d * cos((R - r) / r * t)
y(t) = (R - r) * sin(t) - d * sin((R - r) / r * t)
```

Parameters per taxon:

| Taxon | R | r | d | Stroke | Result |
|---|---|---|---|---|---|
| 1 (Work) | 120 | 45 | 38 | Gold 0.5px | Dense, ornate — currency-grade |
| 2 (License) | 100 | 35 | 30 | Silver 0.4px | Open, legal — certificate-grade |
| 3 (Access) | 80 | 55 | 42 | Copper 0.6px | Tight, rhythmic — pass-grade |
| 4 (Client) | 110 | 40 | 35 | Rose gold 0.5px | Balanced — partnership-grade |

The SVG path is computed once at build time (or memoized on first render) and cached. No runtime computation on scroll or animation.

---

## 6. Seal Design

Each taxon seal is an SVG component with three layers:

1. **Outer ring** — circular border with taxon name in small caps, letter-spaced
2. **Inner emblem** — the taxon-specific icon (see §2), line-art style matching guilloche weight
3. **Center mark** — "SL" monogram in the platform's primary typeface

Seals render at 64×64px on card, expandable to 256×256px on the credential detail/print view.

The seal has a CSS `filter: drop-shadow()` matching the taxon accent color at 20% opacity to create an embossed effect on the cream/ivory background.

---

## 7. Typography

| Element | Font | Weight | Size | Tracking |
|---|---|---|---|---|
| Wordmark ("STUDIOLEDGER") | `DM Sans` | 700 | 10px | +0.2em |
| Taxon badge | `DM Sans` | 600 | 8px | +0.15em |
| Contract title | `DM Serif Display` | 400 | 16px | +0.01em |
| Milestone name | `DM Sans` | 500 | 12px | normal |
| Field labels | `DM Sans` | 500 | 8px | +0.12em |
| Field values | `DM Sans` | 400 | 11px | normal |
| Credential ID | `JetBrains Mono` | 400 | 9px | +0.05em |
| Microprint | `JetBrains Mono` | 300 | 5px | +0.02em |

**DM Serif Display** for the title gives the "engraved nameplate" feel. **JetBrains Mono** for technical data (hashes, IDs) signals machine-verifiable precision. **DM Sans** everywhere else — clean, professional, highly legible at small sizes.

All three fonts are Google Fonts — zero licensing cost, tree-shakeable via `next/font`.

---

## 8. Portfolio View — `<MCCPortfolio />`

```
File: src/components/credentials/MCCPortfolio.tsx
```

The portfolio page renders all MCCs owned by the user in a responsive grid.

### Layout
- Desktop: 3 columns, 24px gap
- Tablet: 2 columns
- Mobile: 1 column (card stretches to full width)

### Sorting & filtering
- Default sort: newest first (`released_at DESC`)
- Filter by taxon (tabs: All | Work | License | Access | Client)
- Filter by currency
- Search by contract title or counterparty name

### Empty state
A centered illustration of a blank certificate with dotted outlines and the text:
> "Complete your first milestone to earn your first credential."

### Stagger animation
Cards enter with a staggered fade-up (50ms delay per card, 300ms duration). Uses `IntersectionObserver` for scroll-triggered entry — cards below the fold animate when they enter the viewport.

---

## 9. Print / Export View

MCCs should be exportable as:
1. **PNG** (1200×800px) — for portfolio sites, social sharing
2. **PDF** (A5 landscape) — for formal credential submission
3. **SVG** — for high-resolution print (business cards, portfolio books)

The print view strips all animations and renders the card at 2x resolution with the guilloche pattern at full fidelity. The seal renders at 256×256px. Microprint becomes legible at print resolution.

Export is handled client-side via `html-to-image` (PNG) and a dedicated `<MCCPrintView />` component that renders a static, high-res version.

---

## 10. On-Chain Metadata Structure

The MCC's on-chain metadata (stored via IPFS/Pinata, referenced in the NFToken URI) follows this schema:

```json
{
  "name": "Work Credential — {contract_title}",
  "description": "Proof of completed milestone: {milestone_title}",
  "image": "ipfs://{credential_card_image_cid}",
  "properties": {
    "platform": "StudioLedger",
    "version": "1.0",
    "taxon": 1,
    "taxon_label": "Work Credential",
    "contract_id": "uuid",
    "milestone_id": "uuid",
    "milestone_sequence": 1,
    "milestone_title": "Logo Design v1",
    "amount": "500",
    "currency": "RLUSD",
    "creator_address": "rCreator...",
    "client_address": "rClient...",
    "deliverable_hash": "sha256:abc123...",
    "completed_at": "2026-04-17T12:00:00Z",
    "escrow_tx_hash": "ABCDEF1234...",
    "platform_fee_percent": "0.98"
  }
}
```

The `image` field points to a pre-rendered PNG of the credential card (generated server-side on mint). This ensures the MCC displays correctly in any XRPL wallet or NFT viewer, even without the StudioLedger frontend.

---

## 11. ZK-Ready Privacy Layer (Phase 2–3)

When Boundless (RISC Zero) ZK proofs ship on XRPL mainnet, MCCs gain selective disclosure:

- **Prove completion without revealing amount**: "I completed a design contract worth over $1,000" without showing the exact figure
- **Prove track record without doxxing clients**: "I have 15+ completed contracts" without revealing who commissioned them
- **Prove KYC compliance without identity exposure**: "This credential holder is AUSTRAC-verified" without sharing personal data

The credential card will show a "Verified" badge when ZK proof is available, with a "Verify Claim" button that runs the proof in-browser. Visual treatment: a subtle holographic overlay on the seal (animated rainbow gradient at 5% opacity, CSS only) that appears only on ZK-verified credentials.

---

## 12. Implementation Priority

| Priority | Component | Effort | Dependencies |
|---|---|---|---|
| P0 | `<MCCCard />` — static render with taxon styling | 2 days | Taxon color system, font setup |
| P0 | Portfolio grid with real data from `/api/mccs` | 1 day | MCCCard, existing API |
| P1 | Guilloche SVG generation utility | 1 day | None |
| P1 | Idle animations (shimmer, pulse, scroll) | 0.5 day | MCCCard |
| P1 | Hover + flip animations | 0.5 day | MCCCard |
| P2 | Seal SVG components (4 taxons) | 1 day | Design finalization |
| P2 | Print/export (PNG, PDF, SVG) | 1.5 days | html-to-image, MCCPrintView |
| P3 | On-chain metadata image generation (server-side) | 2 days | Credential card finalized |
| P3 | ZK holographic overlay | 0.5 day | Boundless XRPL integration |

**Total estimate**: ~10 days for full implementation, ~3.5 days for P0 (usable portfolio with styled cards).

---

## 13. Reference — Federal Design Inspirations

- U.S. savings bond (Series EE) — guilloche borders, microprint, engraved typography
- Australian passport data page — clean layout, security features as design elements
- Swiss bank guarantee letters — restrained color, institutional serif headers
- Japanese craftsman certification (伝統工芸士) — seal placement, reverence for the credential itself

The key principle from all of these: **the security features ARE the design**. The guilloche isn't decoration — it's the visual language of trust. The microprint isn't hidden text — it's proof that this document was produced by an authority. The seal isn't a logo — it's an endorsement.

MCCs carry that same weight. Every visual choice should communicate: "this credential was earned, verified, and recorded permanently."
