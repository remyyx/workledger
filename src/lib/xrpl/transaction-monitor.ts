// ============================================
// XRPL Transaction Monitor
// ============================================
// Processes confirmed XRPL transactions and updates our database.
// This is the "brain" that translates on-chain events into
// StudioLedger state changes.
//
// When the listener catches a confirmed transaction:
// 1. Check if we're tracking it (match tx_hash in transaction_log)
// 2. Update transaction_log status to 'confirmed' with ledger_index
// 3. Auto-update milestone status based on transaction type
// 4. Update contract status if all milestones are released
//
// Uses the Supabase admin client (service role) because this runs
// outside of any user session / request context.

import { createAdminSupabase } from '@/lib/supabase/admin';
import { n8n } from '@/lib/n8n';
import { isContractComplete } from './milestone-escrow';
import type { TransactionStreamEvent } from './listener';
import { extractEscrowSequence } from './listener';

// No generated Supabase DB types yet — admin client returns untyped rows.
// We use explicit `Record<string, any>` for query results until we generate types.
type DbRow = Record<string, any>;

// Helper: cast admin client to `any` so .from().update() etc. accept our objects.
// This is safe because we have no generated DB types — everything is untyped anyway.
// Once we run `supabase gen types`, we can remove this and get real type safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAdmin(): any {
  return createAdminSupabase();
}

/**
 * Handle a confirmed XRPL transaction.
 * Called by the listener for every successful tx involving our tracked accounts.
 *
 * Flow:
 * 1. Look up tx_hash in transaction_log (is this one of ours?)
 * 2. If found with status 'pending' → update to 'confirmed'
 * 3. Based on tx_type, auto-advance the milestone state machine
 * 4. Check if contract is now complete
 */
export async function handleConfirmedTransaction(
  event: TransactionStreamEvent
): Promise<void> {
  const txHash = event.transaction?.hash;
  if (!txHash) return;

  const supabase = getAdmin();

  // ── Step 1: Check if we're tracking this transaction ──
  const { data, error: lookupError } = await supabase
    .from('transaction_log')
    .select('*')
    .eq('tx_hash', txHash)
    .single();

  const txRecord = data as DbRow | null;

  if (lookupError || !txRecord) {
    // Not one of ours — could be a regular account payment.
    // Check if it's an untracked escrow we should know about.
    await handleUntrackedTransaction(event, supabase);
    return;
  }

  // Already confirmed? Skip.
  if (txRecord.status === 'confirmed') return;

  const ledgerIndex = event.ledger_index || null;

  // ── Step 2: Update transaction_log to confirmed ──
  await supabase
    .from('transaction_log')
    .update({
      status: 'confirmed',
      ledger_index: ledgerIndex,
    })
    .eq('id', txRecord.id);

  console.log(
    `[TX Monitor] Confirmed: ${txRecord.tx_type} ${txHash} (ledger ${ledgerIndex})`
  );

  // ── Step 3: Auto-advance milestone state machine ──
  if (txRecord.milestone_id) {
    await advanceMilestoneState(txRecord, event, supabase);
  }
}

/**
 * Advance milestone status based on the confirmed transaction type.
 * This is the auto-update logic that replaces the frontend PATCH call
 * as the reliability backstop.
 */
async function advanceMilestoneState(
  txRecord: DbRow,
  event: TransactionStreamEvent,
  supabase: any
): Promise<void> {
  // Fetch current milestone state
  const { data } = await supabase
    .from('milestones')
    .select('*')
    .eq('id', txRecord.milestone_id)
    .single();

  const milestone = data as DbRow | null;
  if (!milestone) return;

  switch (txRecord.tx_type) {
    // ── EscrowCreate confirmed → milestone funded ──
    case 'EscrowCreate': {
      // Only advance if still pending (frontend might have already updated)
      if (milestone.status !== 'pending') {
        console.log(
          `[TX Monitor] Milestone ${milestone.id} already ${milestone.status}, skipping EscrowCreate advance.`
        );
        return;
      }

      // Extract escrow sequence from the confirmed transaction
      const escrowSequence = extractEscrowSequence(event);

      await supabase
        .from('milestones')
        .update({
          status: 'funded',
          escrow_tx_hash: event.transaction.hash,
          ...(escrowSequence !== null && { escrow_sequence: escrowSequence }),
        })
        .eq('id', milestone.id);

      console.log(
        `[TX Monitor] Milestone ${milestone.sequence} auto-advanced: pending → funded`
      );

      // If the contract is still in 'draft', move to 'funded'
      if (txRecord.contract_id) {
        const { data: contractData } = await supabase
          .from('contracts')
          .select('status')
          .eq('id', txRecord.contract_id)
          .single();

        const contract = contractData as DbRow | null;

        if (contract?.status === 'draft') {
          await supabase
            .from('contracts')
            .update({ status: 'funded' })
            .eq('id', txRecord.contract_id);

          console.log(
            `[TX Monitor] Contract ${txRecord.contract_id} auto-advanced: draft → funded`
          );
        }
      }
      break;
    }

    // ── EscrowFinish confirmed → milestone released ──
    case 'EscrowFinish': {
      // Only advance if approved (the expected pre-state for release)
      if (milestone.status !== 'approved') {
        console.log(
          `[TX Monitor] Milestone ${milestone.id} is ${milestone.status}, skipping EscrowFinish advance.`
        );
        return;
      }

      await supabase
        .from('milestones')
        .update({
          status: 'released',
          release_tx_hash: event.transaction.hash,
          released_at: new Date().toISOString(),
        })
        .eq('id', milestone.id);

      console.log(
        `[TX Monitor] Milestone ${milestone.sequence} auto-advanced: approved → released`
      );

      // Check if the whole contract is now complete
      if (txRecord.contract_id) {
        await checkContractCompletion(txRecord.contract_id, supabase);
      }
      break;
    }

    // Platform fee Payment — just log, no state change needed
    case 'Payment': {
      console.log(
        `[TX Monitor] Platform fee confirmed: ${event.transaction.hash}`
      );
      break;
    }
  }
}

/**
 * Check if all milestones in a contract are released.
 * If so, mark the contract as completed.
 */
async function checkContractCompletion(
  contractId: string,
  supabase: any
): Promise<void> {
  const { data } = await supabase
    .from('milestones')
    .select('status')
    .eq('contract_id', contractId);

  const milestones = (data as DbRow[] | null);
  if (!milestones) return;

  if (isContractComplete(milestones as Array<{ status: string }>)) {
    await supabase
      .from('contracts')
      .update({ status: 'completed' })
      .eq('id', contractId);

    console.log(`[TX Monitor] Contract ${contractId} completed — all milestones released.`);

    // Fetch contract details for n8n notification
    const { data: contractDetail } = await supabase
      .from('contracts')
      .select('creator_id, marketplace_id, amount, currency')
      .eq('id', contractId)
      .single();

    if (contractDetail) {
      n8n.contractCompleted({
        contractId,
        creatorId: (contractDetail as DbRow).creator_id,
        marketplaceId: (contractDetail as DbRow).marketplace_id,
        totalAmount: String((contractDetail as DbRow).amount || '0'),
        currency: (contractDetail as DbRow).currency || 'RLUSD',
        milestoneCount: milestones.length,
      });
    }
  }
}

/**
 * Handle transactions we're not tracking yet.
 *
 * This catches the edge case where:
 * - A user signs an EscrowCreate in Xaman
 * - Their browser crashes before the frontend PATCH call
 * - The tx confirms on XRPL but our DB never recorded it
 *
 * We match by: Account + Destination + Amount + Condition
 * against milestones that are still 'pending' with matching conditions.
 */
async function handleUntrackedTransaction(
  event: TransactionStreamEvent,
  supabase: any
): Promise<void> {
  const tx = event.transaction;
  if (!tx?.hash) return;

  // Only handle EscrowCreate and EscrowFinish
  if (tx.TransactionType === 'EscrowCreate' && tx.Condition) {
    // Look for a pending milestone with this exact condition
    const { data } = await supabase
      .from('milestones')
      .select('*, contracts!inner(creator_id, marketplace_id, currency)')
      .eq('condition', tx.Condition)
      .eq('status', 'pending');

    const milestones = data as DbRow[] | null;

    if (milestones && milestones.length > 0) {
      const milestone = milestones[0];
      const escrowSequence = extractEscrowSequence(event);

      // Update the milestone
      await supabase
        .from('milestones')
        .update({
          status: 'funded',
          escrow_tx_hash: tx.hash,
          ...(escrowSequence !== null && { escrow_sequence: escrowSequence }),
        })
        .eq('id', milestone.id);

      // Log the transaction
      await supabase.from('transaction_log').insert({
        contract_id: milestone.contract_id,
        milestone_id: milestone.id,
        tx_type: 'EscrowCreate',
        tx_hash: tx.hash,
        from_address: tx.Account,
        to_address: tx.Destination || '',
        status: 'confirmed',
        ledger_index: event.ledger_index,
        amount: typeof tx.Amount === 'string' ? tx.Amount : tx.Amount?.value,
        currency: typeof tx.Amount === 'string' ? 'XRP' : tx.Amount?.currency,
      });

      console.log(
        `[TX Monitor] Recovered untracked EscrowCreate for milestone ${milestone.id}: ${tx.hash}`
      );
    }
  }

  if (tx.TransactionType === 'EscrowFinish' && tx.Owner && tx.OfferSequence != null) {
    // Look for a funded/approved milestone with matching escrow_sequence
    const { data } = await supabase
      .from('milestones')
      .select('*')
      .eq('escrow_sequence', tx.OfferSequence)
      .in('status', ['funded', 'submitted', 'approved']);

    const milestones = data as DbRow[] | null;

    if (milestones && milestones.length > 0) {
      const milestone = milestones[0];

      await supabase
        .from('milestones')
        .update({
          status: 'released',
          release_tx_hash: tx.hash,
          released_at: new Date().toISOString(),
        })
        .eq('id', milestone.id);

      await supabase.from('transaction_log').insert({
        contract_id: milestone.contract_id,
        milestone_id: milestone.id,
        tx_type: 'EscrowFinish',
        tx_hash: tx.hash,
        from_address: tx.Account,
        to_address: tx.Owner,
        status: 'confirmed',
        ledger_index: event.ledger_index,
      });

      console.log(
        `[TX Monitor] Recovered untracked EscrowFinish for milestone ${milestone.id}: ${tx.hash}`
      );

      // Check contract completion
      if (milestone.contract_id) {
        await checkContractCompletion(milestone.contract_id, supabase);
      }
    }
  }
}
