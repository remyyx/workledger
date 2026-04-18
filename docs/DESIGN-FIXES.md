# DESIGN-FIXES.md — UI Bug Fixes & Design Decisions

> Living document. Updated each session that touches the contract detail page or milestone flow UI.
> Read this before making any changes to the contract detail page, milestone components, or activity timeline.

---

## Session: 15 Apr 2026

### Context
Manual testing of full milestone lifecycle on contract detail page (`/dashboard/contracts/[id]`).
Test contract: "Mobile App Prototype" — 3 milestones (fixed_price), RLUSD, CR1 ↔ MK1.

---

## Fixes Applied

### 1. Submit Work pill — non-interactive label (MilestoneRow.tsx)

**Bug:** "Submit Work" in the Escrow bar rendered as a `<button>` with pointer cursor, but clicks did nothing — the parent's `onAction` callback only handled `'fund'`.

**Root cause:** `getActions()` returned `{ label: 'Submit Work', action: 'submit' }` for creator+funded. The page's `onAction` handler in the Escrow block only routed `'fund'` to the modal. Submit is handled via the Actions block button instead.

**Fix:** Removed `'submit'` from `getActions()`. Added a non-interactive `<span>` pill with `cursor: default` and `select-none` for creator+funded milestones. The actual "Submit Deliverable" button lives in the Actions block and works correctly.

**File:** `src/components/ui/MilestoneRow.tsx`

---

### 2. Sequential funding — M2 FUND only after M1 released (page.tsx)

**Bug:** FUND button appeared on M2 while M1 was still in submitted/approved state. User said: "we are solving milestone 1 first, it's less confusing for the client."

**Root cause:** `nextFundableId = sorted.find(m => m.status === 'pending')?.id` found the first pending milestone regardless of whether earlier milestones were still in progress.

**Fix:** Changed to: find the first non-released milestone. Only allow funding if that milestone is pending.
```javascript
const firstNonReleased = sorted.find(m => m.status !== 'released');
const nextFundableId = firstNonReleased?.status === 'pending' ? firstNonReleased.id : null;
```
Applied in **both** the Escrow block and the Actions block.

**File:** `src/app/dashboard/contracts/[id]/page.tsx` (two locations)

---

### 3. Activity Timeline messages missing (contract-messages.ts + API routes)

**Bug:** "No activity yet" on every action — fund, submit, approve, release. No messages ever appeared.

**Root cause (two layers):**

1. **Test routes fire-and-forget:** `/api/test/milestones/fund` and `/api/test/milestones/release` (the routes actually used in dev mode) called `createSystemMessage({...}).catch(() => {})`. The response returned before the insert completed. Frontend refetched and got nothing.

2. **Silent Supabase errors:** All message functions (`createSystemMessage`, `createDeliverableMessage`, `createApprovalMessage`, `createReleaseMessage`, `createRevisionMessage`) didn't check the Supabase `{ error }` return. Supabase doesn't throw on insert failure — it returns an error object. The catch blocks never fired.

**Fix:**
- All message creation calls changed from fire-and-forget to `await`ed across **all** routes:
  - `src/app/api/contracts/[id]/milestones/[seq]/route.ts` (7 calls)
  - `src/app/api/test/milestones/fund/route.ts` (1 call)
  - `src/app/api/test/milestones/release/route.ts` (2 calls)
  - `src/app/api/contracts/route.ts` (2 calls — contract_created + invitation_sent)
- All message functions now check `{ error }` and log with context: `console.error('[contract-messages] ... insert error:', error.message, '| contractId:', ...)`

**Files:** `src/lib/contract-messages.ts`, all API routes listed above

---

### 4. Cross-user auto-refresh (use-contract-detail.ts)

**Bug:** CR1 view didn't update after MK1 performed actions (fund, approve, release) — required manual page refresh.

**Root cause:** `useContractDetail` had no polling interval. Cross-user updates relied on Supabase Realtime (set up for messages only, not contract data).

**Fix:** Added `refetchInterval: 2 * 1000` (2-second polling) to `useContractDetail`. Near-instant cross-user updates.

**File:** `src/hooks/use-contract-detail.ts`

---

### 5. Auto-advance to next milestone (page.tsx)

**Bug:** After releasing M1, the Actions and Review Deliverable blocks stayed focused on M1 instead of advancing to M2.

**Root cause:** `activeMilestoneId` was set once via `useEffect` that only ran when `activeMilestoneId` was null. Once set to M1, it never updated.

**Fix:** Changed the `useEffect` to always track the first non-released milestone:
```javascript
useEffect(() => {
  if (!data?.contract) return;
  const sorted = [...data.contract.milestones].sort((a, b) => a.sequence - b.sequence);
  const firstIncomplete = sorted.find((m) => m.status !== 'released');
  const target = firstIncomplete?.id ?? sorted[sorted.length - 1]?.id ?? null;
  if (target && target !== activeMilestoneId) {
    setActiveMilestoneId(target);
  }
}, [data?.contract]);
```

**File:** `src/app/dashboard/contracts/[id]/page.tsx`

---

### 6. Request Changes button not functional (page.tsx)

**Bug:** Request Changes button was visible and styled correctly but clicking it did nothing visible.

**Root cause:** The `RevisionRequestForm` rendered conditionally on `submissions.length > 0`, where `submissions` came from filtering messages by type `'deliverable_submit'`. Since messages weren't inserting (bug #3), the form never appeared even when `showRevisionForm` was `true`.

**Fix:** Changed the condition to also check milestone submission status:
```javascript
{activeMilestone && (hasSubmission || submissions.length > 0) && (
```
Where `hasSubmission` checks for hash, URLs, or milestone status being submitted/approved/released.

**File:** `src/app/dashboard/contracts/[id]/page.tsx`

---

### 7. Review Deliverable shows "No deliverable" after local file upload (page.tsx)

**Bug:** After uploading an RTF file as deliverable, Review section showed "No deliverable submitted yet."

**Root cause:** The section only checked for `mediaUrl`. Local file uploads only produce a SHA-256 hash (no URL) because file storage (R2/S3) isn't built yet.

**Fix:** Added a third state between "has media preview" and "nothing submitted":
- If `mediaUrl` exists → show media player/preview
- If `hasSubmission` (hash, URL, or submitted status) → show "Deliverable submitted" card with notes and hash
- Otherwise → show "No deliverable submitted yet"

**File:** `src/app/dashboard/contracts/[id]/page.tsx`

---

### 8. Revision details inline in Actions card (page.tsx)

**Request:** User wants the revision request (severity, issues, changes needed) visible immediately — Actions card is the "present status" everyone looks at first.

**Fix:** Actions card now pulls the latest `revision_request` message from the timeline for the active milestone and renders it as an amber-bordered card with severity, issues, and details. Shows for both CR1 (submit context) and MK1 (waiting context) when `changes_requested_at` is set.

**Future:** Move revision details into the Review Deliverable card instead — that's the natural review context. Not yet — parking for later.

**File:** `src/app/dashboard/contracts/[id]/page.tsx`

---

### 9. Unknown sender name in chat (messages route)

**Bug:** Chat messages showed "? Unknown" for sender name.

**Root cause:** Sender enrichment query only fetched `display_name` which was null for test users. No fallback.

**Fix:** Added `email` to the sender query. Fallback chain: `display_name || email || 'User'`. Also added error logging on sender lookup and safety net for IDs not found in DB.

**File:** `src/app/api/contracts/[id]/messages/route.ts`

---

### 10. Messages polling too slow for cross-user (use-contract-messages.ts)

**Bug:** Revision request messages took up to 30s to appear on CR1.

**Fix:** Reduced `refetchInterval` from 30s to 2s, `staleTime` from 10s to 1s. Matches contract detail polling.

**File:** `src/hooks/use-contract-messages.ts`

---

### 11. System messages + sender names broken — admin client JWT invalid (contract-messages.ts + all routes)

**Bug:** Two symptoms with one root cause:
1. System messages (fund, approve, release, request_changes) never appeared in the Activity Timeline — "No activity yet" on every action.
2. Sender names showed "? Unknown" on all chat messages.

Both persisted through all M1–M3 testing despite the await + error-checking fixes in bug #3.

**Root cause:** `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is `<sb_secret_...>` — not a valid JWT (PostgREST expects 3 dot-separated base64url parts; this has 1). The `createAdminSupabase()` singleton created a client that silently failed every query with `Expected 3 parts in JWT; got 1`.

This affected two independent code paths:
1. **`contract-messages.ts`** — all 5 message functions called `createAdminSupabase()` to insert into `contract_messages`. Every insert silently failed. The error logging from bug #3 never fired because the Supabase client returned `{ error }` which WAS logged, but the error was on the JWT validation, not the insert itself.
2. **`messages/route.ts` GET** — sender enrichment created a separate `createAdminSupabase()` client to query `users`. Same JWT failure → all senders mapped to `{ display_name: 'User' }` fallback (showed as "Unknown" in earlier sessions before the email fallback was added in bug #9).

**Why `getSessionOrDev()` still worked:** It also calls `createAdminSupabase()`, but the Supabase client creation doesn't validate the key — only the actual HTTP request does. When the admin query failed in dev mode, `getSessionOrDev()` logged a warning and fell through. The app worked because the user had an active Google OAuth session from a previous session, so the real session path (line 29) returned before ever hitting the dev-mode admin fallback.

**Fix — pass the route's working client through instead of creating a broken one:**

All 5 message functions now accept an optional `supabaseClient` parameter:
```javascript
export async function createSystemMessage(params: SystemMessageParams, supabaseClient?: SupabaseClient)
```

A `getClient()` helper uses the provided client if available, otherwise falls back to `createAdminSupabase()`:
```javascript
function getClient(provided?: SupabaseClient): SupabaseClient {
  if (provided) return provided;
  return createAdminSupabase();
}
```

All API routes now pass their `supabase` client (from `getSessionOrDev()`) as the second argument:
```javascript
await createSystemMessage({ contractId, ... }, supabase);
```

The messages GET route was changed to use the route's `supabase` client directly for sender lookup, removing the `createAdminSupabase` import entirely.

**Files modified:**
- `src/lib/contract-messages.ts` — added optional `supabaseClient` param to all 5 functions + `getClient()` helper
- `src/app/api/contracts/[id]/milestones/[seq]/route.ts` — 7 calls pass `supabase`
- `src/app/api/test/milestones/fund/route.ts` — 1 call passes `supabase`
- `src/app/api/test/milestones/release/route.ts` — 2 calls pass `supabase`
- `src/app/api/contracts/route.ts` — 2 calls pass `supabase`
- `src/app/api/contracts/[id]/messages/route.ts` — sender lookup uses route's `supabase` client, removed `createAdminSupabase` import

**Note:** The `.env.local` service role key is still malformed. This fix routes around it in dev mode. For production, the key must be a real JWT from `supabase status` or the Supabase dashboard.

---

### 12. Resubmit after revision nulls deliverable data + stale revision flag (milestones route)

**Bug (two issues):**

1. **Deliverable data wiped on resubmit:** When creator resubmits after a revision request without re-uploading the original file, `deliverable_hash`, `deliverable_media_url`, and `deliverable_doc_url` were set to `null`. The original proof was destroyed. On release, `mintCredentialsOnRelease()` would mint an MCC with no deliverable reference — the chain of proof from submission → approval → release → MCC was broken.

2. **Stale `changes_requested_at`:** The revision timestamp was never cleared on resubmit. After the creator submitted fresh work, the Actions card still showed the old "CRITICAL — CHANGES REQUESTED" amber box with outdated issues. Misleading for the marketplace reviewer.

**Root cause:** The submit action unconditionally overwrote all deliverable fields:
```javascript
deliverable_hash: deliverableHash || null,      // ← nulls if empty
deliverable_media_url: deliverableMediaUrl || null,
deliverable_doc_url: deliverableDocUrl || null,
```
And never touched `changes_requested_at`.

**Fix:** Conditional update — only overwrite deliverable fields when new values are provided. Clear the revision flag on every resubmit:
```javascript
const submitUpdate: Record<string, unknown> = {
  status: 'submitted',
  submitted_at: new Date().toISOString(),
  changes_requested_at: null, // Clear revision flag
};
if (deliverableHash) submitUpdate.deliverable_hash = deliverableHash;
if (deliverableNotes?.trim()) submitUpdate.deliverable_notes = deliverableNotes.trim();
if (deliverableMediaUrl?.trim()) submitUpdate.deliverable_media_url = deliverableMediaUrl.trim();
if (deliverableDocUrl?.trim()) submitUpdate.deliverable_doc_url = deliverableDocUrl.trim();
```

**Impact:** Permanent fix. Protects MCC integrity — the deliverable proof chain (hash → approval → release → on-chain credential) is preserved across revision cycles.

**File:** `src/app/api/contracts/[id]/milestones/[seq]/route.ts`

---

### 13. License document preview too tall (page.tsx)

**Bug:** Raw RTF content in the license metadata card rendered at full height (~1,444px), blowing out the layout. RTF formatting codes (`eftab720tightenfactor0`) displayed as-is.

**Fix (quick):** Capped `maxHeight` to `589px` with `overflow-y: auto` for inner scroll. Proper RTF parsing deferred to Phase 2.

**File:** `src/app/dashboard/contracts/[id]/page.tsx` (`SourceDocBlock` component)

---

### 14. Mock-mint MCC skipped for test users without XRPL address (test release route + MCCs API)

**Bug:** After releasing M1 and M2 via the test route, no new MCCs appeared in Credential Assets. Only old demo/seed data visible (dates from 2025).

**Root cause:** Two guards blocked the flow:
1. **Test release route:** `if (creatorUser?.xrpl_address)` — test users had no `xrpl_address` set, so the entire mock-mint block was silently skipped. No error logged, no insert attempted.
2. **MCCs API (dev mode):** `if (ownerAddress)` — same guard on the read side. Even if MCCs were minted, the query would never find them for walletless users.

**Fix:**
1. **Test release route:** Removed the `if (xrpl_address)` guard. Uses placeholder addresses (`rTEST_CREATOR_NO_WALLET` / `rTEST_CLIENT_NO_WALLET`) when users have no wallet. Both Creator (Taxon 1) and Client (Taxon 4) MCCs always mint in test mode.
2. **MCCs API (dev mode):** Query now matches by both real XRPL address AND the test placeholder using `.in('owner', ownerAddresses)`.

**Impact analysis — no consequential risk:**
- Placeholder addresses only written by `test/milestones/release` — the real release route (`milestones/[seq]`) still uses `mintCredentialsOnRelease()` with real XRPL addresses
- Placeholder query only in the dev-mode branch of MCCs API (`if (isDevMode)`)
- Production path untouched — still requires real `xrpl_address`
- Minor cosmetic: XRPL explorer links would show dead link for placeholder addresses in dev mode. Not an issue.
- When moving to testnet with real wallets, the real release route and production MCCs query work as-is. Clean separation.

**Replaces at testnet:** When test users get real XRPL addresses (testnet phase), the placeholder fallback becomes inactive — real addresses take priority.

**Files:**
- `src/app/api/test/milestones/release/route.ts` — removed guards, added placeholder addresses
- `src/app/api/mccs/route.ts` — dev mode query includes placeholder addresses

---

## Known Limitations (Not Bugs)

### M1 media preview not visible after release
The geisha picture uploaded as M1's deliverable isn't previewable because there's no cloud file storage yet. The SHA-256 hash is recorded and passed to MCC metadata. Preview requires R2/S3 integration (Phase 2).

### Deliverable data persists to MCC minting
Confirmed: `deliverable_hash`, `deliverable_media_url`, and submission metadata are stored on the milestone record and passed to `mintCredentialsOnRelease()`. The chain from submission → approval → release → MCC mint is intact.

### Dashboard stats nft_registry query uses UUID instead of XRPL address
`/api/dashboard/stats` queries `nft_registry.owner` with the user's UUID, but `owner` stores XRPL addresses. Pre-existing — stats MCC count will always be 0. Needs fixing when dashboard stats are revisited.

---

## Design Decisions (User Preferences)

### Sequential milestone funding is strict
User preference: "we are solving milestone 1 first, it's less confusing for the client." Only the **next** milestone can be funded, and only after **all** previous milestones are released. No parallel funding.

### Inactive milestone design — don't touch
User said: "not sure about the inactive milestone design yet, don't touch it though." Leave the pending/inactive milestone styling as-is until the user decides.

### 2-second polling for cross-user refresh
User requested faster than 10s. Set to 2s. Acceptable for dev/beta with low user count. May need to increase for production scale.

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `src/components/ui/MilestoneRow.tsx` | Submit Work → non-interactive span |
| `src/app/dashboard/contracts/[id]/page.tsx` | Sequential funding, auto-advance, Request Changes, Review Deliverable, hasSubmission |
| `src/lib/contract-messages.ts` | Error checking on all 5 insert functions; optional `supabaseClient` param on all 5 functions + `getClient()` helper |
| `src/hooks/use-contract-detail.ts` | 2s polling interval |
| `src/hooks/use-contract-messages.ts` | 2s polling, 1s staleTime |
| `src/app/api/contracts/[id]/milestones/[seq]/route.ts` | await all 7 message calls; pass `supabase` to all; preserve deliverable data on resubmit; clear `changes_requested_at` |
| `src/app/api/test/milestones/fund/route.ts` | await message call; pass `supabase` |
| `src/app/api/test/milestones/release/route.ts` | await 2 message calls; pass `supabase`; placeholder XRPL address for mock-mint |
| `src/app/api/contracts/route.ts` | await 2 message calls; pass `supabase` |
| `src/app/api/contracts/[id]/messages/route.ts` | Sender lookup uses route's `supabase` client; removed `createAdminSupabase` import; email fallback chain |
| `src/app/api/mccs/route.ts` | Dev mode query includes test placeholder addresses |

---

## Session: 17 Apr 2026 (Compound Audit — Uncommitted Work)

### Context
Catalogued ~12,900 insertions across 102 modified/new files. Changes landed between sessions 20–22 (across multiple tools/sessions). This section documents design-relevant changes only.

---

### 15. Full NFT→MCC rebrand (types, constants, hooks, components)

**Change:** Every reference to NFT in the codebase replaced with MCC (Minted Craft Credential). Taxon 4 (Client Completion Record) added.

**Scope:**
- Types: `NFTRecord→MCCRecord`, `NFTMetadata→MCCMetadata`, `NFTTaxon→MCCTaxon`
- Constants: `NFT_TAXONS→MCC_TAXONS`, `NFT_MINT_FEE→MCC_MINT_FEE`
- Hooks: `useNFTs→useMCCs`, `use-nfts.ts` deleted → `use-mccs.ts`
- Components: `NFTCard.tsx` deleted → `MCCCard.tsx`, `MCCRow.tsx`, `MCCMiniPreview.tsx`
- XRPL: `mintProofOfWork→MCCtokenMint`, `mint-credential.ts` rewritten for dual-token (T1+T4)

**Files:** `src/types/index.ts`, `src/config/constants.ts`, `src/hooks/`, `src/components/ui/`, `src/lib/xrpl/nft.ts`, `src/lib/xrpl/mint-credential.ts`

---

### 16. Design system overhaul — CSS variables + fonts + tailwind

**Change:** Complete replacement of CSS variable system and font stack.

**Old:** `--brand-primary`, `--bg-primary`, `--bg-surface`, `--border-color`, `--text-primary`, `--text-secondary`. Font: Inter.
**New:** Semantic tokens — `--bg`, `--bg-surface`, `--bg-elevated`, `--bg-inset`, `--text`, `--text-secondary`, `--text-tertiary`, `--text-muted`, `--border`, `--separator`, `--hover`, `--active`, `--escrow`, `--status-*`, `--accent-*`, `--marketmaker`. Fonts: Outfit (display), DM Sans (body), JetBrains Mono (code).

**Dark/light:** Both themes defined. `:root` = light, `[data-theme="dark"]` = dark. ThemeProvider + localStorage persistence.

**Tailwind:** Removed old brand/navy/surface/accent/status color objects. Added gray scale (50–950), `font-display` family, fadeIn/slideIn animations. Old glow/gradient backgrounds removed.

**Files:** `src/app/globals.css`, `tailwind.config.ts`, `src/app/layout.tsx`

---

### 17. TopBar redesign — breadcrumbs + role badge + command palette

**Change:** TopBar completely rewritten.

**New features:**
- Breadcrumb navigation (replaces flat title)
- Role badge: Creator (blue + radius glow) / Marketmaker (green + `--marketmaker-glow`)
- Theme toggle (Sun/Moon icons)
- Cmd+K trigger for Command Palette
- Uses `TOPBAR_ROLE` constants

**File:** `src/components/layout/TopBar.tsx`

---

### 18. Dashboard → Command Center layout

**Change:** Dashboard redesigned through 3 iterations: Bento Grid → Card Stack → Command Center.

**Current:** Horizontal stats strip, vertical escrow bar, S logo branding. `h-screen overflow-hidden` on layout (no body scroll). `CommandPaletteProvider` wrapping.

**Files:** `src/app/dashboard/page.tsx`, `src/app/dashboard/layout.tsx`

---

### 19. Credential Assets — split-panel layout

**Change:** Assets page (`/dashboard/nfts`) redesigned from simple gallery to split-panel.

**Layout:** Left panel = category filters + scrollable MCCRow list. Right panel = MCCCard detail (inline, no modal). Role-aware: Creator sees T1/T2/T3, Marketplace sees T4/T2.

**Files:** `src/app/dashboard/nfts/page.tsx`, `src/components/ui/MCCCard.tsx`, `src/components/ui/MCCRow.tsx`

---

### 20. Profile page — identity card + SLPN + privacy

**Change:** Profile page overhauled across 6 commits.

**New features:**
- Identity card with image uploads (portrait, logo, 4-sample gallery)
- SLPN plate number (deterministic from userId: `SLPN{5digits}{2letters}`)
- Privacy toggles per field (email, XRPL address, bio, skills, payout, business number)
- Membership box
- "Hire" button
- "Creator Account" label

**File:** `src/app/dashboard/profile/page.tsx`

---

### 21. Contracts → "Smart Contracts" rename

**Change:** Sidebar label changed from "Contracts" to "Smart Contracts". Contracts list page now shows 3 contract type explainers (Fixed Price, Milestone, Retainer) with icons and descriptions.

**Files:** `src/components/layout/Sidebar.tsx`, `src/app/dashboard/contracts/page.tsx`

---

### 22. Escrow crypto-conditions — correctness fix

**Bug:** `generateCondition()` computed fingerprint as SHA-256(DER fulfillment) instead of SHA-256(raw preimage). ASN.1 encoding had wrong tag length (0x27 vs 0x25), wrong cost value (3 vs 32), and included subtypes field (only for compound conditions).

**Impact:** Old encoding would fail validation on XRPL mainnet. Testnet may have been more lenient.

**Fix:** fingerprint = SHA-256(raw preimage). Cost = 32 (preimage byte length). No subtypes field.

**File:** `src/lib/xrpl/escrow.ts`

---

### 23. Contract creation — role-aware counterparty + fee calculation

**Change:** Contract creation form now role-aware (Creator sees "Marketplace Buyer Email", Marketmaker sees "Creator Email"). Uses `calculatePlatformFee()` from `lib/fees.ts` instead of inline math.

**File:** `src/app/dashboard/contracts/new/page.tsx`

---

## Design Constants Added (config/constants.ts)

| Constant | Purpose |
|----------|---------|
| `MCC_UI_COLORS` | Per-taxon UI colors: `.CREDENTIAL` (magenta), `.MEMBERSHIP` (true purple #7f3ac6), card bg/border/text |
| `RADIAN_BADGE` | Status badges with radial halo. `GLOW_PX: [4, 10, 20]`. Statuses: active, funded, completed, draft |
| `TOPBAR_ROLE` | Creator / Marketmaker labels for TopBar badge |
| `STATIC_EXCHANGE_RATES` | Placeholder USD→currency rates (XRP, EUR, GBP, AUD, JPY) |
| `assertRlusdIssuerReady()` | Runtime guard — throws if mainnet + placeholder RLUSD issuer |

---

## Test Coverage
216 tests across 12 suites — all passing after changes. No new type errors introduced.
