# StudioLedger — Phase 1 Sprint Plan (MVP)

**Duration:** 12 weeks (3 months)
**Goal:** 10 creators, 20 completed jobs on testnet → mainnet launch
**Owner:** StudioLedger Pty Ltd (Remy Ruozzi)
**Build approach:** Claude Code assisted development

---

## Sprint Overview

| Sprint | Weeks | Focus | Deliverable |
|--------|-------|-------|-------------|
| Sprint 1 | 1-2 | Foundation | Dev environment, XRPL testnet connection, DB setup |
| Sprint 2 | 3-4 | Auth & Wallet | User registration, wallet creation, balance display |
| Sprint 3 | 5-6 | Contracts & Escrow | Fixed-price template, escrow create/release |
| Sprint 4 | 7-8 | NFTs & Proof | PoW NFT minting, deliverable hashing, portfolio view |
| Sprint 5 | 9-10 | Dashboard & Polish | Full dashboard, notifications, public profiles |
| Sprint 6 | 11-12 | Testing & Launch | End-to-end testing, mainnet deployment, first users |

---

## Sprint 1: Foundation (Weeks 1-2)

**Goal:** Working dev environment with XRPL testnet connection and database.

### Week 1: Environment Setup

**What you'll learn:** How a modern web app is structured, how to run it locally, and how to talk to a blockchain.

| Task | Description | Tool/Guide |
|------|-------------|------------|
| Install Node.js | Runtime that executes JavaScript outside the browser | nodejs.org → download LTS version |
| Install VS Code | Code editor (you'll live here) | code.visualstudio.com |
| Install Git | Version control (saves your work history) | git-scm.com |
| Clone project | Copy the StudioLedger folder structure we created | `git init` in project folder |
| Run `npm install` | Downloads all libraries listed in package.json | Terminal: `npm install` |
| Start dev server | Launches app at localhost:3000 | Terminal: `npm run dev` |
| See landing page | Confirm the app loads in your browser | Visit http://localhost:3000 |

**Checkpoint:** You should see the StudioLedger landing page in your browser.

### Week 2: Backend Foundation

| Task | Description | Details |
|------|-------------|---------|
| Create Supabase project | Free hosted PostgreSQL database | supabase.com → New Project |
| Run migration | Creates all database tables | Copy SQL from `supabase/migrations/001_initial_schema.sql` |
| Configure `.env.local` | Set your Supabase URL and keys | Copy from `.env.local.example`, fill in values |
| XRPL testnet connection | Verify the app talks to the blockchain | Run test script that calls `getXrplClient()` |
| Get testnet XRP | Free test tokens from XRPL faucet | faucet.altnet.rippletest.net |
| Create test wallet | Generate a wallet and see it on XRPL explorer | Run `generateWallet()`, check explorer |

**Checkpoint:** Database has tables. App connects to XRPL testnet. You have a test wallet with XRP.

---

## Sprint 2: Auth & Wallet (Weeks 3-4)

**Goal:** Users can register, log in, and see their wallet balance.

### Week 3: Authentication

| Task | Description | Files |
|------|-------------|-------|
| Supabase Auth setup | Enable email/password auth in Supabase dashboard | Supabase console |
| Registration page | Form: email, password, display name, role (creator/marketplace/both) | `src/app/(auth)/register/page.tsx` |
| Login page | Form: email, password | `src/app/(auth)/login/page.tsx` |
| Auth middleware | Protect dashboard routes (redirect if not logged in) | `src/middleware.ts` |
| On registration: create XRPL wallet | When user signs up, generate keypair and save address | `src/app/api/auth/register/route.ts` |
| Store encrypted seed | Encrypt the wallet seed before saving | Use `crypto.createCipheriv` |

**Checkpoint:** Can register, log in, and see dashboard. Each user has an XRPL address.

### Week 4: Wallet Display

| Task | Description | Files |
|------|-------------|-------|
| Wallet page | Show all balances (XRP + tokens) | `src/app/(dashboard)/wallet/page.tsx` |
| Balance component | Fetches from XRPL, displays in chosen currency | `src/components/wallet/BalanceCard.tsx` |
| Trust line setup | Auto-set trust lines on first login | `src/lib/xrpl/wallet.ts` → `setupTrustLines()` |
| Currency display toggle | User picks display currency (EUR/USD/XRP) | `src/stores/wallet-store.ts` |
| Transaction history | List recent transactions from XRPL | `src/components/wallet/TransactionList.tsx` |
| Xaman wallet connect | Allow existing XRPL wallet holders to link | `src/lib/xrpl/xaman.ts` (new file) |

**Checkpoint:** Users see wallet balance. Can toggle display currency. Trust lines are set.

---

## Sprint 3: Contracts & Escrow (Weeks 5-6)

**Goal:** Fixed-price contract creation and escrow funding/release.

### Week 5: Contract Creation

| Task | Description | Files |
|------|-------------|-------|
| Contract templates page | Show available templates (fixed price first) | `src/app/(dashboard)/contracts/new/page.tsx` |
| Fixed-price form | Title, description, amount, currency, deadline | `src/components/contracts/FixedPriceForm.tsx` |
| Contract generation engine | Convert form input → XRPL transaction parameters | `src/lib/contracts/generator.ts` (new) |
| Save to database | Store contract in Supabase with "draft" status | `src/app/api/contracts/route.ts` |
| Contract detail page | View contract status, milestones, parties | `src/app/(dashboard)/contracts/[id]/page.tsx` |
| Invite marketplace | Share link for marketplace to fund the contract | Email or copy-link button |

**Checkpoint:** Creator can create a fixed-price contract and share it with a marketplace.

### Week 6: Escrow Flow

| Task | Description | Files |
|------|-------------|-------|
| Marketplace funds escrow | Marketplace signs EscrowCreate → RLUSD locked on-chain | `src/lib/xrpl/escrow.ts` → `createEscrow()` |
| Escrow confirmation | WebSocket listener confirms funding, updates DB | `src/lib/xrpl/listener.ts` (new) |
| Creator submits work | Upload deliverable, SHA-256 hash stored | `src/app/api/milestones/submit/route.ts` |
| Marketplace approves | Marketplace signs → EscrowFinish releases funds | `src/lib/xrpl/escrow.ts` → `finishEscrow()` |
| Platform fee deduction | 0.98% taken on release (separate Payment tx) | Include in release flow |
| Status updates | Contract/milestone status changes reflected in UI | Real-time via Supabase subscriptions |

**Checkpoint:** Complete job cycle works: create → fund → deliver → approve → pay. On testnet.

---

## Sprint 4: NFTs & Proof (Weeks 7-8)

**Goal:** PoW NFT auto-mints on approval. Freelancer has a portfolio.

### Week 7: NFT Minting

| Task | Description | Files |
|------|-------------|-------|
| IPFS metadata upload | Upload NFT metadata JSON to Pinata | `src/lib/ipfs/pinata.ts` (new) |
| Auto-mint on approval | When escrow releases, mint Work Credential NFT in same flow | Modify release flow in escrow.ts |
| NFT metadata structure | Work title, hash, payment proof, rating | `src/types/index.ts` → NFTMetadata |
| Deliverable hashing | SHA-256 hash of uploaded files for proof | `src/lib/utils/hash.ts` (new) |
| Store NFT in registry | Save NFT token ID, metadata in database | `src/app/api/nfts/route.ts` |

**Checkpoint:** When a milestone is approved, a Work Credential NFT is minted with work proof.

### Week 8: Portfolio & Reputation

| Task | Description | Files |
|------|-------------|-------|
| NFT portfolio page | Grid view of all Work Credential NFTs with metadata | `src/app/(dashboard)/nfts/page.tsx` |
| NFT detail view | Full metadata, XRPL explorer link, IPFS link | `src/components/nfts/NFTCard.tsx` |
| Public profile page | View any user's profile + their Work Credential NFTs | `src/app/(dashboard)/profile/page.tsx` |
| Reputation score | Calculate from on-chain data (avg rating, job count) | `src/lib/reputation.ts` (new) |
| Marketplace rating flow | After approval, marketplace rates 1-5 stars + comment | `src/components/contracts/RatingForm.tsx` |

**Checkpoint:** Creators have a public portfolio of verified work credentials.

---

## Sprint 5: Dashboard & Polish (Weeks 9-10)

**Goal:** Full dashboard with all features accessible. Clean UX.

### Week 9: Dashboard

| Task | Description | Files |
|------|-------------|-------|
| Dashboard home | Overview: active contracts, recent earnings, NFT count | `src/app/(dashboard)/dashboard/page.tsx` |
| Sidebar navigation | Links to all sections (wallet, contracts, NFTs, etc.) | `src/components/layout/Sidebar.tsx` |
| Earnings chart | Visual graph of earnings over time | `src/components/dashboard/EarningsChart.tsx` |
| Active contracts list | Cards showing status, amount, deadline | `src/components/contracts/ContractList.tsx` |
| Quick actions | "New Contract", "View Wallet", "My NFTs" buttons | Dashboard home page |
| Responsive design | Works on tablet + mobile (not just desktop) | Tailwind responsive classes |

**Checkpoint:** Full dashboard with navigation, overview stats, and responsive layout.

### Week 10: Notifications & Settings

| Task | Description | Files |
|------|-------------|-------|
| Email notifications | Escrow funded, work submitted, milestone approved | `src/lib/notifications.ts` (new) |
| In-app notifications | Bell icon with notification dropdown | `src/components/layout/NotificationBell.tsx` |
| Settings page | Display name, avatar, bio, skills, payout config | `src/app/(dashboard)/settings/page.tsx` |
| Payout configuration | Strategy picker (single/split/stack) | `src/components/wallet/PayoutConfig.tsx` |
| Error handling | Graceful error states throughout the app | All components |
| Loading states | Skeleton screens while data loads | All pages |

**Checkpoint:** Polished app with notifications, settings, and proper error handling.

---

## Sprint 6: Testing & Launch (Weeks 11-12)

**Goal:** End-to-end testing, bug fixes, mainnet deployment.

### Week 11: Testing

| Task | Description | Details |
|------|-------------|---------|
| End-to-end test | Complete job lifecycle with 2 test accounts | Create → Fund → Deliver → Approve → NFT |
| Edge case testing | What happens if escrow expires? Client cancels? | Test all status transitions |
| Security review | Check key storage, auth flow, API authorization | Review all API routes |
| Performance check | Page load times, XRPL response times | Chrome DevTools |
| Cross-browser test | Chrome, Firefox, Safari, mobile | Manual testing |
| Fix bugs | Address everything found in testing | As needed |

### Week 12: Deploy & Launch

| Task | Description | Details |
|------|-------------|---------|
| Deploy frontend | Push to Vercel (free tier) | `vercel deploy` |
| Deploy backend | If separate, push to Railway ($5/mo) | Railway dashboard |
| Mainnet switch | Change XRPL network to mainnet | Update `.env` to mainnet WSS |
| Fund platform wallet | Send XRP to platform address for gas sponsoring | Manual transfer |
| Domain setup | Point studioledger.io (or chosen domain) to Vercel | DNS settings |
| Invite first 10 creators | Personal outreach to target users | Email + social |
| Monitor | Watch XRPL explorer, Supabase logs, Sentry errors | First 48 hours |

**Checkpoint:** StudioLedger is live. First 10 creators are onboarding.

---

## Weekly Rhythm

Every week follows this pattern:

| Day | Activity |
|-----|----------|
| Monday | Plan the week's tasks, review what's needed |
| Tue-Thu | Build features (Claude Code sessions) |
| Friday | Test what you built, fix bugs |
| Weekend | (Optional) Read docs, plan next week |

**Tip for Remy:** Each coding session with Claude Code, start by saying "Let's continue with Sprint X, Task Y" and paste the relevant section from this plan. Claude Code will have the full context from CLAUDE.md and project documentation.

---

## Tools You'll Need (Install Before Sprint 1)

| Tool | What it does | Where to get it |
|------|-------------|-----------------|
| Node.js (v20 LTS) | Runs JavaScript | nodejs.org |
| VS Code | Code editor | code.visualstudio.com |
| Git | Version control | git-scm.com |
| Chrome | Testing | Already have it |
| Supabase account | Database + Auth | supabase.com (free) |
| Pinata account | IPFS storage for NFTs | pinata.cloud (free) |
| Vercel account | Hosting | vercel.com (free) |
| XRPL Testnet faucet | Free test XRP | faucet.altnet.rippletest.net |
| Claude Pro/Max | AI coding assistant | claude.ai |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| XRPL Token Escrow issues | Test extensively on testnet; fallback to XRP-native escrow |
| Xaman SDK integration delays | Build with manual wallet connect first; add Xaman later |
| Supabase free tier limits | Monitor usage; upgrade only if approaching limits |
| User onboarding friction | Build detailed onboarding flow with tooltips |
| Key management security | Multi-sign from Sprint 2; never store unencrypted seeds |

---

## Success Metrics (End of Phase 1)

- [ ] 10 registered creators
- [ ] 20 completed jobs (escrow create → release)
- [ ] 20+ Work Credential NFTs minted
- [ ] < 3 second page load time
- [ ] Zero lost funds or security incidents
- [ ] Working on XRPL mainnet
