# StudioLedger

**A creator studio wallet that bills, protects, and proves your work — all on XRPL.**

StudioLedger is a creator platform built natively on the XRP Ledger. It combines a multi-currency wallet, escrow-protected billing, template-generated smart contracts, and Minted Craft Credentials (MCCs) into a single application for creators and marketmakers.

## The Problem

Creators face two persistent problems: getting paid on time, and proving their track record. Traditional platforms charge 10–20% and offer no real payment protection. StudioLedger solves both using XRPL's on-chain escrow and NFT capabilities — at 0.98%.

## Philosophy

StudioLedger is a **contract transaction facilitator, not a financial institution**. The blockchain IS the settlement layer — no intermediaries, no float, no counterparty risk. We're chain-agnostic at the door (connect Xaman, MetaMask, Phantom, GemWallet, Crossmark) but XRPL-native at the core. Settlement always runs on XRPL.

We embrace regulation as a competitive moat. StudioLedger is architected as a VASP (Virtual Asset Service Provider) from day one — AUSTRAC-enrolled, KYC-ready, Travel Rule compliant. The protection IS the product: at 0.98%, nobody leaves to avoid fees.

## How It Works

- **Escrow-protected payments** — Funds are locked on-chain via XRPL Token Escrow (XLS-85) with crypto-conditions. Nobody can touch the money until work is approved. No chargebacks, no payment disputes.
- **Minted Craft Credentials (MCC)** — On milestone completion, StudioLedger mints a verifiable on-chain credential containing the work hash, contract terms, and completion proof. Creators build a portable, tamper-proof portfolio.
- **Fiat + crypto wallet** — Unified wallet supporting XRP (native), RLUSD (Ripple's stablecoin), USD, EUR, USDC, and USDT via GateHub-issued trust lines. Creators and marketmakers on-ramp in fiat or crypto — StudioLedger handles the plumbing.
- **KYC & compliance** — Identity verification built into the onboarding flow. Required before any transaction, per AUSTRAC Tranche 2 obligations and the Travel Rule (no minimum threshold for virtual asset transfers).
- **Smart contract templates** — Fixed-price, milestone, retainer, and more. Contracts are generated from templates with built-in escrow logic. RLUSD-only for escrow (eliminates volatility risk). XRP accepted for instant asset sales.
- **Marketplace** — Marketmakers post briefs, creators submit proposals, negotiate terms, and convert agreements into funded escrow contracts in one click.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS |
| State | Zustand, TanStack React Query |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Supabase |
| Auth | Google OAuth + Supabase Auth + XRPL wallet signature (Xaman) |
| Blockchain | XRPL via xrpl.js, five-bells-condition (crypto-conditions) |
| Wallet Connect | Xaman SDK — QR code + deep link signing |
| Automation | n8n (contract lifecycle, notifications, XRPL event listeners) |
| Deployment | Vercel (frontend), Supabase (database) |

## Getting Started

### Prerequisites

- Node.js 20 LTS
- A Supabase account (free tier)
- Git

### Installation

```bash
git clone https://github.com/remyyx/workledger.git
cd workledger
npm install
```

### Environment Setup

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_XRPL_NETWORK` | `testnet` or `mainnet` |
| `XAMAN_API_KEY` | Xaman wallet connect API key |

### Database Setup

```bash
npm run db:migrate
```

15 migrations covering: users, contracts, milestones, MCC registry, transaction log, disputes, dispute evidence, dispute events, proposals, briefs, admin accounts (5 roles), audit log, and permission matrix.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    (auth)/               # Login & registration
    dashboard/            # Dashboard, wallet, contracts, MCCs, marketplace, profile
    api/                  # API routes (contracts, milestones, wallet, auth, proposals)
  components/
    layout/               # Sidebar, TopBar
    ui/                   # Cards, modals, status badges, milestone rows
    wallet/               # Send & receive payment flows
    marketplace/          # Creator cards, offer modals
  config/
    constants.ts          # XRPL config, fees, currencies, MCC taxons
  hooks/                  # React Query hooks (balances, contracts, MCCs, disputes)
  lib/
    xrpl/                 # XRPL client, wallet, escrow, MCC minting, listener
    xaman/                # Xaman SDK wrapper (QR sign, auth, transaction payloads)
    supabase/             # Browser & server clients, dev session management
    crypto/               # Encryption for wallet keys and escrow preimages
    n8n/                  # Webhook client for workflow automation
  stores/                 # Zustand stores (wallet, auth)
  types/                  # TypeScript type definitions
```

## XRPL Features

- **Token Escrow (XLS-85)** — Lock RLUSD/tokens on-chain with crypto-conditions
- **NFTs (XLS-20)** — Three MCC taxons: Work Credential (1), License (2), Access Pass (3)
- **Trust Lines** — Multi-currency support: RLUSD (Ripple, NYDFS-regulated), USD, EUR, USDC, USDT via GateHub issuers
- **Crypto-Conditions** — five-bells-condition for escrow lock/release
- **Planned** — AMM (XLS-30), Batch Transactions, Payment Channels, Multi-Sign (2-of-3)
- **ZK Privacy (watching)** — XRPL Commons + Boundless (RISC Zero) announced ZK proof verification on XRPL testnet (Apr 2026). Phase 1 enables private compliant transactions (~Oct 2026). Phase 2 brings Confidential Multi-Purpose Tokens for RWAs. Game changer for MCC privacy — creators prove credential ownership without exposing contract terms or payment amounts on-chain.

## Fee Model

| Fee | Rate | When |
|-----|------|------|
| Platform fee | 0.98% | On each escrow release |
| MCC mint fee | 0.1 RLUSD | Per credential minted |
| DEX swap fee | 0.1% | On currency swaps |
| Arbitration fee | 5% | From losing party in disputes |

## Tests

216 passing tests across 12 suites covering escrow operations, fee calculations, contract lifecycle, milestone state machine, proposal flow, and MCC minting.

```bash
npm test
```

## Roadmap

- [x] XRPL client, wallet, escrow, MCC modules
- [x] Database schema with RLS (15 migrations)
- [x] Dashboard with contracts, wallet, MCC portfolio
- [x] Contract creation and milestone state machine
- [x] Xaman wallet connect (QR + deep link + WebSocket)
- [x] Marketplace with briefs, proposals, and negotiation
- [x] Platform fee deduction (0.98% on escrow release)
- [x] Wallet and preimage encryption
- [x] Admin system (5 roles, audit log, permission matrix)
- [x] 216 tests passing
- [x] Google OAuth end-to-end flow
- [ ] IPFS/Pinata upload for MCC metadata
- [ ] Testnet deployment
- [ ] Public profiles and reputation scoring
- [ ] Community arbitration panels
- [ ] Asset marketplace (creator storefronts)
- [ ] Mainnet deployment

## Regulatory & Compliance

StudioLedger Pty Ltd (ACN 696 549 809) is enrolled with AUSTRAC as a Virtual Asset Service Provider under the AML/CTF Amendment Act 2024 (Tranche 2).

- **VASP architecture from day one** — not retrofitted. Compliance is a design principle, not an afterthought.
- **AML/CTF Program v1.2** — drafted covering risk assessment, transaction monitoring, KYC/CDD procedures, proliferation financing controls, sanctions screening, escrow custody controls, and incident response.
- **Travel Rule compliant** — no minimum threshold for virtual asset transfers per AUSTRAC requirements.
- **KYC** — identity verification required before any on-chain transaction.
- **Platform-managed wallets** — classified as custodial wallet services. Acknowledged and built into the compliance framework.
- **RLUSD position** — Ripple bears compliance burden as issuer (NYDFS trust charter). StudioLedger is the facilitator, not the issuer.

## License

All rights reserved. Copyright StudioLedger Pty Ltd.

---

Built by **StudioLedger Pty Ltd** — [studioledger.ai](https://studioledger.ai)
