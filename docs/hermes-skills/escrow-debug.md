# Skill: Escrow Debug

**Trigger**: "escrow failed", "escrow stuck", "escrow not confirming", "funds locked"

## Context
StudioLedger uses XRPL Token Escrow (XLS-85) with crypto-conditions (five-bells-condition).
Escrow lifecycle: create → fund (lock on-chain) → finish (release with fulfillment) → cancel (refund after CancelAfter).
Each milestone has its own escrow with a unique condition/fulfillment pair stored in the milestones table.

## Debug Steps

1. **Get the contract and milestone**
   - Query `milestones` table by `contract_id` + `sequence`
   - Collect: `escrow_sequence`, `escrow_condition`, `escrow_fulfillment`, `fund_tx_hash`, `status`

2. **Check on-chain escrow state**
   - `account_objects` for the escrow owner (marketplace user's XRPL address)
   - Filter for `Escrow` objects matching the sequence number
   - If escrow object exists → funds are still locked on-chain
   - If no escrow object → either finished (released), cancelled, or never created

3. **Cross-reference DB vs chain**
   - DB says `funded` + escrow exists on-chain → normal state, waiting for deliverable
   - DB says `funded` + NO escrow on-chain → **BUG**: transaction-monitor missed the cancel, or escrow was never created
   - DB says `released` + escrow exists on-chain → **BUG**: DB updated but EscrowFinish never submitted
   - DB says `pending` + escrow exists on-chain → **BUG**: fund confirmed on-chain but DB wasn't updated

4. **Check transaction_log**
   - Query `transaction_log` by `milestone_id` for tx type `EscrowCreate` or `EscrowFinish`
   - Status should be `confirmed` — if `pending`, the listener hasn't caught the confirmation yet
   - If `failed`, check the `error` field for the XRPL error code

5. **Check the listener**
   - Is the XRPL transaction listener running? (`getListenerStatus()`)
   - Is it subscribed to the correct accounts?
   - If listener is down, transactions confirm on-chain but our DB never hears about it

6. **Common failure modes**
   - **tecNO_LINE**: Escrow destination doesn't have a trust line for RLUSD → run `setupTrustLines()`
   - **tecNO_PERMISSION**: Wrong account trying to finish the escrow
   - **tecCRYPTO_CONDITION_ERROR**: Fulfillment doesn't match the condition stored on the escrow object
   - **tecINSUF_RESERVE_LINE**: Destination can't receive because of XRPL reserve requirements
   - **Condition mismatch**: `generateCondition()` returns {condition, fulfillment, preimage}. The condition goes on-chain at create time. The fulfillment is used at finish time. If they don't match, the escrow can never be finished. Check that we're storing the right pair in the DB.

## Resolution Patterns
- If chain is ahead of DB: manually run `handleConfirmedTransaction()` with the tx event
- If DB is ahead of chain: transaction was never submitted or failed silently — resubmit
- If listener is down: restart it, then backfill any missed transactions from ledger history
- If condition/fulfillment mismatch: escrow is unfinishable — must wait for CancelAfter date to cancel and refund
