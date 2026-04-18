// ============================================
// Milestone Escrow Orchestration
// ============================================
// Manages the lifecycle of milestone-based contracts on XRPL.
// Implements the "buffer system": always one milestone ahead.
//
// Flow:
// 1. Contract created → EscrowCreate for M1 + M2 (buffer)
// 2. M1 approved → EscrowFinish M1 + Payment (fee) + EscrowCreate M3
// 3. M2 approved → EscrowFinish M2 + Payment (fee) + EscrowCreate M4
// 4. ... continues until all milestones released
// 5. Final milestone → EscrowFinish + Payment (fee) + NFTokenMint (PoW)

import { Wallet } from 'xrpl';
import { createEscrow, finishEscrow, generateCondition } from './escrow';
import { getXrplClient } from './client';
import { PLATFORM, RLUSD_ISSUER, RLUSD_CURRENCY } from '@/config/constants';
import { calcFeeBreakdown, gtZero } from '@/lib/math';
import { decryptWalletSeed } from '@/lib/crypto';

// How many milestones to pre-fund at contract start
const BUFFER_SIZE = 2;

export interface MilestoneEscrowResult {
  milestoneSequence: number;
  txHash: string;
  escrowSequence: number | null;
  condition: string;
  fulfillment: string;
}

/**
 * Fund the initial buffer milestones when a contract starts.
 * Creates escrows for the first BUFFER_SIZE milestones.
 *
 * Called when: Marketplace clicks "Fund Contract"
 * XRPL txs: Up to BUFFER_SIZE × EscrowCreate
 */
export async function fundInitialMilestones(params: {
  marketplaceWallet: Wallet;
  creatorAddress: string;
  milestones: Array<{
    sequence: number;
    amount: string;
    condition: string;
    deadline?: string | null;
  }>;
  currency?: string;
  issuer?: string;
}): Promise<MilestoneEscrowResult[]> {
  const {
    marketplaceWallet,
    creatorAddress,
    milestones,
    currency = RLUSD_CURRENCY,
    issuer = RLUSD_ISSUER,
  } = params;

  // Fund first BUFFER_SIZE milestones (or all if fewer)
  const toFund = milestones.slice(0, BUFFER_SIZE);
  const results: MilestoneEscrowResult[] = [];

  for (const ms of toFund) {
    // Calculate cancel-after: use milestone deadline or default 30 days
    const cancelAfterDays = ms.deadline
      ? Math.max(7, Math.ceil((new Date(ms.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + 7)
      : 30;

    const result = await createEscrow({
      clientWallet: marketplaceWallet,
      freelancerAddress: creatorAddress,
      amount: ms.amount,
      currency,
      issuer,
      condition: ms.condition,
      cancelAfterDays,
    });

    results.push({
      milestoneSequence: ms.sequence,
      txHash: result.txHash,
      escrowSequence: result.sequence,
      condition: ms.condition,
      fulfillment: '', // Stored separately in DB, not returned here
    });
  }

  return results;
}

/**
 * Release a completed milestone and fund the next one in the buffer.
 *
 * Called when: Marketplace approves a milestone delivery
 * XRPL txs:
 *   1 × EscrowFinish — release escrow to creator
 *   1 × Payment (0.98% fee) — deducted from creator's balance, sent to platform
 *   1 × EscrowCreate (next buffer) — optional, if more milestones exist
 *
 * Philosophy A: Creator's wallet seed is encrypted in the DB.
 * Platform decrypts and signs the fee Payment on behalf of the creator.
 */
export async function releaseMilestoneAndAdvance(params: {
  signerWallet: Wallet;
  escrowOwner: string;
  escrowSequence: number;
  condition: string;
  fulfillment: string;
  milestoneAmount: string;
  // Next milestone to fund (if any)
  nextMilestone?: {
    freelancerAddress: string;
    amount: string;
    condition: string;
    deadline?: string | null;
  };
  currency?: string;
  issuer?: string;
  platformAddress: string;
  creatorEncryptedSeed?: string; // Philosophy A: encrypted wallet seed for fee deduction
}): Promise<{
  releaseTxHash: string;
  feeTxHash: string | null;
  nextEscrowTxHash: string | null;
  nextEscrowSequence: number | null;
}> {
  const client = await getXrplClient();
  const {
    signerWallet,
    escrowOwner,
    escrowSequence,
    condition,
    fulfillment,
    milestoneAmount,
    nextMilestone,
    currency = RLUSD_CURRENCY,
    issuer = RLUSD_ISSUER,
    platformAddress,
    creatorEncryptedSeed,
  } = params;

  // 1. Release the escrow (full amount to creator)
  const releaseResult = await finishEscrow({
    signerWallet,
    escrowOwner,
    escrowSequence,
    condition,
    fulfillment,
  });

  // 2. Deduct 0.98% platform fee — sent from creator to platform
  const { platformFee: feeAmount } = calcFeeBreakdown(milestoneAmount, PLATFORM.FEE_PERCENT);
  let feeTxHash: string | null = null;

  if (gtZero(feeAmount) && creatorEncryptedSeed) {
    try {
      // Decrypt creator's wallet seed and sign fee payment on their behalf (Philosophy A)
      const creatorSeed = decryptWalletSeed(creatorEncryptedSeed);
      const creatorWallet = Wallet.fromSeed(creatorSeed);

      const feeTx = {
        TransactionType: 'Payment' as const,
        Account: creatorWallet.classicAddress,
        Destination: platformAddress,
        Amount: {
          currency,
          issuer,
          value: feeAmount,
        },
      };
      const feeResult = await client.submitAndWait(feeTx, { wallet: creatorWallet });
      feeTxHash = feeResult.result.hash;
    } catch (err) {
      // Fee payment failed — log but don't block the release
      // Milestone is released; fees can be reconciled separately
      console.error('[MilestoneEscrow] Fee payment failed:', err);
    }
  } else if (gtZero(feeAmount) && !creatorEncryptedSeed) {
    // Philosophy B or external wallet — no encrypted seed available
    // Fee handling deferred to manual reconciliation
    console.warn('[MilestoneEscrow] No creator seed for fee deduction. Manual reconciliation required.');
  }

  // 3. Fund next milestone in buffer (if there is one)
  let nextEscrowTxHash: string | null = null;
  let nextEscrowSequence: number | null = null;

  if (nextMilestone) {
    const cancelAfterDays = nextMilestone.deadline
      ? Math.max(7, Math.ceil((new Date(nextMilestone.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + 7)
      : 30;

    // Need the client wallet to create the escrow
    // In production, this would be triggered via Xaman signing
    // For now, the signer must be the client
    try {
      const nextResult = await createEscrow({
        clientWallet: signerWallet, // Marketplace signs the next escrow
        freelancerAddress: nextMilestone.freelancerAddress,
        amount: nextMilestone.amount,
        currency,
        issuer,
        condition: nextMilestone.condition,
        cancelAfterDays,
      });
      nextEscrowTxHash = nextResult.txHash;
      nextEscrowSequence = nextResult.sequence;
    } catch (err) {
      // Next escrow creation failed — the buffer is depleted
      // The client will need to manually fund it
      console.error('[MilestoneEscrow] Next escrow creation failed:', err);
    }
  }

  return {
    releaseTxHash: releaseResult.txHash,
    feeTxHash,
    nextEscrowTxHash,
    nextEscrowSequence,
  };
}

/**
 * Calculate how many milestones need funding to maintain the buffer.
 * Returns the milestone sequences that should be funded next.
 */
export function getMilestonesToFund(milestones: Array<{
  sequence: number;
  status: string;
}>): number[] {
  const funded = milestones.filter((m) =>
    m.status === 'funded' || m.status === 'submitted' || m.status === 'approved'
  );
  const pending = milestones.filter((m) => m.status === 'pending');

  // How many more do we need to hit the buffer size?
  const deficit = BUFFER_SIZE - funded.length;
  if (deficit <= 0) return [];

  // Fund the next N pending milestones
  return pending
    .sort((a, b) => a.sequence - b.sequence)
    .slice(0, deficit)
    .map((m) => m.sequence);
}

/**
 * Check if a milestone contract is fully completed.
 * All milestones must be in 'released' status.
 */
export function isContractComplete(milestones: Array<{ status: string }>): boolean {
  return milestones.length > 0 && milestones.every((m) => m.status === 'released');
}

/**
 * Get the current active milestone (the one the creator should be working on).
 */
export function getActiveMilestone(milestones: Array<{
  sequence: number;
  status: string;
}>): number | null {
  // Active = the first funded or submitted milestone
  const active = milestones
    .filter((m) => m.status === 'funded' || m.status === 'submitted')
    .sort((a, b) => a.sequence - b.sequence);
  return active.length > 0 ? active[0].sequence : null;
}
