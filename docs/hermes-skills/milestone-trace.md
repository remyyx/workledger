# Skill: Milestone Trace

**Trigger**: "milestone stuck", "milestone not advancing", "milestone state wrong", "contract stuck"

## Context
Milestone state machine: `pending → funded → submitted → approved → released | disputed`
Sequential funding rule: only one milestone funded at a time, previous must be released before next can be funded.
On release: MCC auto-mint (T1 for creator, T4 for marketplace), platform fee deduction, n8n event fire.

## Trace Steps

1. **Load the full contract state**
   - Query `contracts` table by `id` → get status, parties, template, currency
   - Query `milestones` table by `contract_id` ordered by `sequence`
   - This gives the full pipeline view

2. **Identify where the pipeline is stuck**

   | Current status | Expected next action | Check |
   |---------------|---------------------|-------|
   | `pending` | Fund escrow | Is this the first unfunded milestone? Is the previous one released? |
   | `funded` | Creator submits deliverable | Check messages for `deliverable_submitted` type |
   | `submitted` | Marketplace approves or requests changes | Check messages for `milestone_approved` or `changes_requested` |
   | `approved` | Escrow release (EscrowFinish) | Check transaction_log for EscrowFinish tx |
   | `released` | Next milestone becomes fundable / contract completes | Is the contract status updated? Was MCC minted? |

3. **Check sequential funding rule**
   - If milestone N is `pending` and N-1 is not `released` → funding is blocked by design
   - API route `/api/test/milestones/fund` enforces this
   - UI only shows FUND button on the first `pending` milestone

4. **Check for missing side effects on release**
   - Was `n8n.milestoneReleased()` called? Check server logs for `[n8n] Skipped` (means N8N_WEBHOOK_URL not set)
   - Was MCC minted? Check `nft_registry` for rows matching this milestone_id
   - Was contract completion checked? If this was the last milestone, contract status should be `completed`
   - `isContractComplete()` in `milestone-escrow.ts` checks if all milestones are `released`

5. **Check message trail**
   - Query `contract_messages` by contract_id, ordered by created_at
   - System messages document every state transition
   - `createSystemMessage()` takes params object: `{ contractId, milestoneId, action, content, metadata }`
   - **Common bug**: calling with positional args instead of object → message not created, no error thrown

6. **Common failure modes**
   - **Stuck at `funded`**: Creator hasn't submitted yet, or submission API call failed
   - **Stuck at `submitted`**: Marketplace hasn't reviewed, or approval endpoint errored
   - **Stuck at `approved`**: EscrowFinish not triggered — check if test mode vs production mode mismatch
   - **Contract stays `active` after last release**: `isContractComplete()` not called, or returned false because a milestone was skipped

## Resolution Patterns
- Manual state correction: `db_update` on milestones table (dev only, never production)
- Re-trigger side effects: call the relevant API endpoint again with the same params
- For test mode: use `/api/test/milestones/release` which handles the full flow including mock MCC mint
