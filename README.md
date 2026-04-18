# StudioLedger

**A creator studio wallet that bills, protects, and proves your work — all on XRPL.**

StudioLedger is a creator platform built natively on the XRP Ledger. It combines a multi-currency wallet, escrow-protected billing, template-generated smart contracts, and Minted Craft Credentials (MCCs) into a single application for creators and marketmakers.

## The Problem

Creators face two persistent problems: getting paid on time, and proving their track record. Traditional platforms charge 10–20% and offer no real payment protection. StudioLedger solves both using XRPL's on-chain escrow and NFT capabilities — at 0.98%.

## How It Works

- **Escrow-protected payments** — Funds are locked on-chain via XRPL Token Escrow (XLS-85) with crypto-conditions. Nobody can touch the money until work is approved. No chargebacks, no payment disputes.
- **Minted Craft Credentials (MCC)** — On milestone completion, StudioLedger mints a verifiable on-chain credential containing the work hash, contract terms, and completion proof. Creators build a portable, tamper-proof portfolio.
- **Multi-currency wallet** — XRP, RLUSD, USD, EUR, USDC, USDT via trust lines. Creators choose how they get paid.
- **Smart contract templates** — Fixed-price, milestone, retainer, and more. Contracts are generated from templates with built-in escrow logic.
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
- **Trust Lines** — Multi-currency support via GateHub issuers
- **Crypto-Conditions** — five-bells-condition for escrow lock/release

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
- [ ] Google OAuth end-to-end flow
- [ ] IPFS/Pinata upload for MCC metadata
- [ ] Testnet deployment
- [ ] Public profiles and reputation scoring
- [ ] Community arbitration panels
- [ ] Asset marketplace (creator storefronts)
- [ ] Mainnet deployment

## Regulatory

StudioLedger Pty Ltd (ACN 696 549 809) is enrolled with AUSTRAC as a Virtual Asset Service Provider under the AML/CTF Amendment Act 2024. AML/CTF Program v1.2 drafted and under legal review.

## License

All rights reserved. Copyright StudioLedger Pty Ltd.

---

Built by **StudioLedger Pty Ltd** — [studioledger.ai](https://studioledger.ai)
