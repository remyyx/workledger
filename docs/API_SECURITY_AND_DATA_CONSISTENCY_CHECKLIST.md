# StudioLedger — API security and data consistency checklist

This checklist focuses on reducing production risk in API routes and lifecycle state transitions.
Scope includes `src/app/api/**`, `src/lib/supabase/**`, `src/lib/xrpl/**`, and `src/middleware.ts`.

---

## Priority overview

- **P0 (immediate):** prevent unauthorized or invalid state transitions.
- **P1 (stabilization):** remove precision/auth gaps and enforce idempotency.
- **P2 (hardening):** move to resilient, transaction-safe architecture.

---

## P0 — immediate containment (24-72h)

### 1) Validate Xaman payload invariants before any milestone state write

- **Target:** `src/app/api/contracts/[id]/milestones/[seq]/route.ts`
- **Risk:** milestone can be marked funded/released from an unrelated signed payload.
- **Actions:**
  - For `fund` and `release`, verify payload transaction details match expected contract/milestone values:
    - signer account
    - transaction type
    - destination
    - amount/currency/issuer
    - escrow sequence/condition linkage when applicable
  - Reject payloads if any invariant fails.
  - Store verified transaction hash and signer in DB audit columns/log.
- **Acceptance criteria:**
  - API returns `400/403` for signed but mismatched payloads.
  - DB status does not change when validation fails.
  - Regression test exists for forged/replayed payload UUID.

### 2) Disable request-provided wallet seed flows in production

- **Target:** `src/app/api/contracts/[id]/milestones/[seq]/route.ts`
- **Risk:** private seed exposure via request payload/logs.
- **Actions:**
  - Block `walletSeed` mode when `NODE_ENV === 'production'`.
  - Keep direct signing only in explicit local test mode.
  - Redact any seed-like request fields from logs/errors.
- **Acceptance criteria:**
  - Production returns `403` if `walletSeed` is sent.
  - No seed values appear in logs.

### 3) Ensure DB release state cannot succeed after XRPL failure

- **Target:** `src/app/api/contracts/[id]/milestones/[seq]/route.ts`
- **Risk:** DB says `released` while chain release failed.
- **Actions:**
  - Gate milestone `released` status update behind confirmed XRPL success.
  - On XRPL failure, write failure event and return error without state mutation.
- **Acceptance criteria:**
  - Simulated XRPL failure leaves milestone status unchanged.
  - Error response includes traceable failure ID.

### 4) Require cryptographic proof in wallet link endpoint

- **Target:** `src/app/api/user/wallet-link/route.ts`
- **Risk:** user can link wallet they do not own.
- **Actions:**
  - Add signed challenge flow (`address + nonce + expiration`).
  - Verify signature server-side before storing `xrpl_address`.
  - Invalidate nonce after one successful use.
- **Acceptance criteria:**
  - Unsigned or invalid signature requests are rejected.
  - Replay of same nonce fails.

### 5) Fail closed on listener control auth

- **Target:** `src/app/api/listener/route.ts`
- **Risk:** missing secret may allow unauthenticated listener control.
- **Actions:**
  - Require `CRON_SECRET` in non-development runtime.
  - Return `500` at boot or endpoint level when required secret is absent.
- **Acceptance criteria:**
  - Non-dev requests without valid secret are always rejected.
  - Health check clearly reports auth configuration status.

---

## P1 — stabilization (1-2 sprints)

### 6) Standardize money math with decimal-safe helpers

- **Targets:**
  - `src/app/api/contracts/[id]/milestones/[seq]/route.ts`
  - `src/app/api/wallet/send/route.ts`
  - `src/lib/xrpl/milestone-escrow.ts`
  - any route/helper using `parseFloat` for funds/fees
- **Risk:** precision drift in fee and reconciliation logic.
- **Actions:**
  - Create shared helper (string-in/string-out) for:
    - addition/subtraction
    - percentage fee calculation
    - normalization/rounding policy
  - Replace `parseFloat`/`toFixed` in critical money paths.
- **Acceptance criteria:**
  - Unit tests cover boundary cases (small/large/precision-heavy amounts).
  - Financial endpoints return deterministic string amounts.

### 7) Add idempotency for state-changing milestone actions

- **Target:** `src/app/api/contracts/[id]/milestones/[seq]/route.ts`
- **Risk:** duplicate requests/process retries can double-apply transitions.
- **Actions:**
  - Require idempotency key for `fund`, `approve`, `release`.
  - Persist action hash + outcome; return previous result on replay.
- **Acceptance criteria:**
  - Duplicate identical request does not create duplicate side effects.
  - Concurrent retries converge to one final state.

### 8) Tighten message read-receipt writes

- **Target:** `src/app/api/contracts/[id]/messages/route.ts`
- **Risk:** race conditions from read-modify-write pattern on `read_by`.
- **Actions:**
  - Replace per-message async updates with atomic DB operation (RPC or safe merge).
  - Ensure deduplicated `read_by` entries.
- **Acceptance criteria:**
  - Concurrent readers do not lose updates.
  - `read_by` stays unique and consistent.

### 9) Align MCC/NFT ownership key strategy

- **Targets:**
  - `src/app/api/mccs/route.ts`
  - `src/app/api/nfts/route.ts`
  - `nft_registry` query conventions
- **Risk:** inconsistent results due to mixed owner identifiers (user id vs XRPL address).
- **Actions:**
  - Pick one canonical ownership key for reads/writes (recommended: XRPL address for chain-owned assets).
  - Document mapping where app-user ownership views differ from on-chain ownership.
- **Acceptance criteria:**
  - Both endpoints return consistent results for same authenticated user.
  - Schema/query conventions documented in code comments/docs.

---

## P2 — hardening and architecture (2-4 sprints)

### 10) Move lifecycle transitions to atomic state machine boundary

- **Targets:** contract/milestone mutation paths in `src/app/api/contracts/**`
- **Risk:** partial writes and non-atomic transitions across DB + chain side effects.
- **Actions:**
  - Implement DB RPC/service boundary with:
    - precondition checks
    - row-level lock/version check
    - atomic state transition
  - Use outbox/saga style orchestration for XRPL side effects and retries.
- **Acceptance criteria:**
  - Partial failure cannot leave impossible contract/milestone states.
  - Recovery/retry flow is deterministic and auditable.

---

## Testing checklist for this hardening work

- Add route-level tests for:
  - forged or unrelated Xaman payload UUID
  - release failure should not update DB status
  - duplicate idempotency key handling
  - wallet-link signature verification + nonce replay prevention
- Add integration test for full `fund -> submit -> approve -> release` with failure injection.
- Add money precision snapshot tests for fee totals and rounding consistency.

---

## Suggested execution order

1. P0.1, P0.3, P0.2 (protect lifecycle integrity first).
2. P0.4, P0.5 (close auth/control gaps).
3. P1.6 and P1.7 (precision + idempotency).
4. P1.8 and P1.9 (consistency cleanup).
5. P2.10 (state machine and outbox hardening).

