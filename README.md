# StudioLedger

**A creator studio wallet that bills, protects, and proves your work — all on XRPL.**

StudioLedger is a creator platform built natively on the XRP Ledger. It combines a multi-currency wallet, escrow-protected billing, template-generated smart contracts, and NFT-based work credentials, called MCCs (Minted Craft Credential) into a single application for creators (freelancers) and marketmakers (clients).

## Why StudioLedger?

Creators face two persistent problems: getting paid on time, and proving their track record. StudioLedger solves both using XRPL's on-chain escrow and NFT capabilities.

- **Escrow-protected payments** — Marketplace funds are locked on-chain via XRPL Token Escrow (XLS-85). Nobody can touch the money until work is approved. No chargebacks, no disputes over payment.
- **Work Credential NFTs** — When a milestone is completed, StudioLedger mints a non-transferable NFT credential containing the work hash, payment proof, and marketplace rating. Creators build a portable, verifiable portfolio on-chain.
- **Multi-currency wallet** — Support for XRP, RLUSD, USD, EUR, USDC, and USDT via GateHub trust lines. Creators choose how they get paid.
- **Smart contract templates** — Fixed-price, milestone, retainer, and more. Contracts are generated from templates with built-in escrow logic.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS |
| State | Zustand, TanStack React Query |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth + XRPL wallet signature (Xaman) |
| Blockchain | XRPL via xrpl.js, five-bells-condition (crypto-conditions) |
| NFT Storage | IPFS via Pinata |
| Deployment | Vercel (frontend), Supabase (database) |

## Getting Started

### Prerequisites

- Node.js 20 LTS
- A Supabase account (free tier)
- Git

### Installation

```bash
git clone https://github.com/remyyx/studioledger.git
cd studioledger
npm install
```

### Environment Setup

Copy the example env file and fill in your values:

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
| `NEXT_PUBLIC_XRPL_WSS` | XRPL WebSocket URL |

### Database Setup

Run the migration in the Supabase SQL Editor:

```bash
# Or use the Supabase CLI
npm run db:migrate
```

The migration creates 7 tables: `users`, `contracts`, `milestones`, `nft_registry`, `transaction_log`, `disputes`, and `dispute_evidence` — with RLS policies, indexes, and auto-update triggers.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    (auth)/               # Login & registration
    dashboard/            # Dashboard, wallet, contracts, NFTs, profile, settings
    api/                  # API routes (contracts, milestones, wallet, auth)
  components/
    layout/               # Sidebar, TopBar
    ui/                   # StatCard, ContractCard, NFTCard, MilestoneRow, etc.
  config/
    constants.ts          # XRPL config, fees, currencies, NFT taxons
  hooks/                  # React Query hooks for data fetching
  lib/
    xrpl/                 # XRPL client, wallet, escrow, NFT modules
    supabase/             # Browser & server Supabase clients
  stores/                 # Zustand stores (wallet, auth)
  types/                  # TypeScript type definitions
```

## XRPL Features Used

- **Token Escrow (XLS-85)** — Lock RLUSD/tokens on-chain with crypto-conditions
- **NFTs (XLS-20)** — Three taxon types: Work Credential (1), License (2), Access Pass (3)
- **Trust Lines** — Multi-currency support via GateHub issuers
- **Crypto-Conditions** — five-bells-condition for escrow lock/release

## Fee Model

| Fee | Rate | When |
|-----|------|------|
| Platform fee | 0.98% | On each escrow release |
| NFT mint fee | 0.1 RLUSD | Per NFT minted |
| DEX swap fee | 0.1% | On currency swaps |
| Arbitration fee | 5% | From losing party in disputes |

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run db:migrate # Push database migrations
npm run db:reset   # Reset database
npm run db:types   # Generate TypeScript types from DB
```

## Roadmap

- [x] XRPL client, wallet, escrow, NFT modules
- [x] Database schema with RLS
- [x] Dashboard with contracts, wallet, NFT views
- [x] Contract creation and milestone state machine
- [x] Xaman wallet connect (primary auth)
- [ ] Google OAuth (Web2 onboarding)
- [ ] IPFS/Pinata upload for NFT metadata
- [ ] Deliverable file hashing
- [ ] Real XRPL escrow execution via Xaman signing
- [ ] Web3 dark theme dashboard
- [ ] PWA support for mobile
- [ ] Public profiles and reputation scoring
- [ ] Mainnet deployment

## License

All rights reserved. Copyright StudioLedger Pty Ltd (Remy Ruozzi).

---

Built by **StudioLedger Pty Ltd** — remy.ruozzi@gmail.com
