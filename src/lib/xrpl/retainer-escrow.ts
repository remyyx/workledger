// ============================================
// Retainer Escrow Orchestration
// ============================================
// Manages recurring monthly escrow cycles on XRPL.
// Each cycle = 1 EscrowCreate with FinishAfter (period end) + CancelAfter (grace period).
//
// Flow:
// 1. Marketplace funds first cycle → EscrowCreate with FinishAfter = cycle end date
// 2. Cycle ends → creator can release (EscrowFinish) after FinishAfter
// 3. Marketplace funds next cycle → new EscrowCreate for next period
// 4. If creator didn't deliver → marketplace cancels after CancelAfter (grace period)
//
// FinishAfter = "earliest you can release" (work period must complete)
// CancelAfter = "latest before auto-refund" (grace period for disputes)
//
// This is bilateral fairness applied to recurring work:
// - Marketplace: money locked = creator committed to the month
// - Creator: money on-chain = guaranteed payment when cycle completes

import { Wallet } from 'xrpl';
import { createEscrow, finishEscrow, generateCondition } from './escrow';
import { getXrplClient } from './client';
import { PLATFORM, RLUSD_ISSUER, RLUSD_CURRENCY } from '@/config/constants';
import { calcFeeBreakdown, gtZero } from '@/lib/math';

export interface RetainerCycleConfig {
  monthlyAmount: string;
  startDate: string;          // ISO date — when the retainer begins
  durationMonths: number;     // How many cycles (0 = ongoing until cancelled)
  hoursPerMonth?: number;     // Optional: agreed hours per cycle
  currency?: string;
  issuer?: string;
}

export interface RetainerCycleResult {
  cycleNumber: number;
  txHash: string;
  escrowSequence: number | null;
  condition: string;
  fulfillment: string;
  finishAfter: string;   // ISO date — when this cycle can be released
  cancelAfter: string;   // ISO date — when this cycle auto-refunds
}

/**
 * Calculate the FinishAfter and CancelAfter dates for a cycle.
 *
 * FinishAfter = end of the billing period (e.g., 1 month from start)
 * CancelAfter = FinishAfter + grace period (default 14 days)
 *
 * The grace period gives both parties time to:
 * - Review deliverables
 * - Raise disputes if needed
 * - Complete the release process
 */
export function calculateCycleDates(cycleStartDate: string, graceDays: number = 14): {
  finishAfter: Date;
  cancelAfter: Date;
  cycleEndDate: Date;
} {
  const start = new Date(cycleStartDate);

  // Cycle end = 1 month from start
  const cycleEnd = new Date(start);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);

  // FinishAfter = cycle end (earliest release)
  const finishAfter = new Date(cycleEnd);

  // CancelAfter = cycle end + grace period (latest before auto-refund)
  const cancelAfter = new Date(cycleEnd);
  cancelAfter.setDate(cancelAfter.getDate() + graceDays);

  return { finishAfter, cancelAfter, cycleEndDate: cycleEnd };
}

/**
 * Fund a single retainer cycle.
 * Creates an escrow with FinishAfter (time-gated) + crypto-condition.
 *
 * The dual lock means:
 * - Can't release before FinishAfter (time must pass)
 * - Can't release without fulfillment (approval must happen)
 * - Auto-refunds after CancelAfter if neither happens
 */
export async function fundRetainerCycle(params: {
  marketplaceWallet: Wallet;
  creatorAddress: string;
  amount: string;
  cycleNumber: number;
  cycleStartDate: string;
  condition: string;
  graceDays?: number;
  currency?: string;
  issuer?: string;
}): Promise<RetainerCycleResult> {
  const {
    marketplaceWallet,
    creatorAddress,
    amount,
    cycleNumber,
    cycleStartDate,
    condition,
    graceDays = 14,
    currency = RLUSD_CURRENCY,
    issuer = RLUSD_ISSUER,
  } = params;

  const { finishAfter, cancelAfter } = calculateCycleDates(cycleStartDate, graceDays);

  // Calculate FinishAfter in minutes from now
  const finishAfterMinutes = Math.max(1, Math.ceil((finishAfter.getTime() - Date.now()) / (1000 * 60)));

  // Calculate CancelAfter in days from now
  const cancelAfterDays = Math.max(1, Math.ceil((cancelAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const result = await createEscrow({
    clientWallet: marketplaceWallet,
    freelancerAddress: creatorAddress,
    amount,
    currency,
    issuer,
    condition,
    cancelAfterDays,
    finishAfterMinutes,
  });

  return {
    cycleNumber,
    txHash: result.txHash,
    escrowSequence: result.sequence,
    condition,
    fulfillment: '', // Stored in DB, not here
    finishAfter: finishAfter.toISOString(),
    cancelAfter: cancelAfter.toISOString(),
  };
}

/**
 * Fund the initial retainer — first cycle + optionally second cycle (buffer).
 * For retainers, we fund 1 cycle ahead by default (like milestone buffer but simpler).
 */
export async function fundInitialRetainer(params: {
  marketplaceWallet: Wallet;
  creatorAddress: string;
  monthlyAmount: string;
  startDate: string;
  cyclesToPreFund?: number;   // How many cycles to fund upfront (default 1)
  conditions: Array<{ condition: string; fulfillment: string }>;
  graceDays?: number;
  currency?: string;
  issuer?: string;
}): Promise<RetainerCycleResult[]> {
  const {
    marketplaceWallet,
    creatorAddress,
    monthlyAmount,
    startDate,
    cyclesToPreFund = 1,
    conditions,
    graceDays = 14,
    currency = RLUSD_CURRENCY,
    issuer = RLUSD_ISSUER,
  } = params;

  const results: RetainerCycleResult[] = [];

  for (let i = 0; i < cyclesToPreFund && i < conditions.length; i++) {
    // Calculate start date for this cycle
    const cycleStart = new Date(startDate);
    cycleStart.setMonth(cycleStart.getMonth() + i);

    const result = await fundRetainerCycle({
      marketplaceWallet,
      creatorAddress,
      amount: monthlyAmount,
      cycleNumber: i + 1,
      cycleStartDate: cycleStart.toISOString(),
      condition: conditions[i].condition,
      graceDays,
      currency,
      issuer,
    });

    results.push(result);
  }

  return results;
}

/**
 * Release a retainer cycle and fund the next one.
 * Similar to milestone release-and-advance, but simpler:
 *
 * 1. EscrowFinish (release current cycle funds to creator)
 * 2. Payment (platform fee)
 * 3. EscrowCreate (fund next cycle, if contract is ongoing)
 */
export async function releaseRetainerCycle(params: {
  signerWallet: Wallet;
  escrowOwner: string;
  escrowSequence: number;
  condition: string;
  fulfillment: string;
  cycleAmount: string;
  // Next cycle info (if ongoing)
  nextCycle?: {
    freelancerAddress: string;
    cycleNumber: number;
    cycleStartDate: string;
    condition: string;
    graceDays?: number;
  };
  currency?: string;
  issuer?: string;
  platformAddress: string;
}): Promise<{
  releaseTxHash: string;
  feeTxHash: string | null;
  nextCycleTxHash: string | null;
  nextCycleEscrowSequence: number | null;
}> {
  const client = await getXrplClient();
  const {
    signerWallet,
    escrowOwner,
    escrowSequence,
    condition,
    fulfillment,
    cycleAmount,
    nextCycle,
    currency = RLUSD_CURRENCY,
    issuer = RLUSD_ISSUER,
    platformAddress,
  } = params;

  // 1. Release the current cycle escrow
  const releaseResult = await finishEscrow({
    signerWallet,
    escrowOwner,
    escrowSequence,
    condition,
    fulfillment,
  });

  // 2. Send platform fee
  const { platformFee: feeAmount } = calcFeeBreakdown(cycleAmount, PLATFORM.FEE_PERCENT);
  let feeTxHash: string | null = null;

  if (gtZero(feeAmount) && platformAddress) {
    try {
      const feeTx = {
        TransactionType: 'Payment' as const,
        Account: signerWallet.classicAddress,
        Destination: platformAddress,
        Amount: {
          currency,
          issuer,
          value: feeAmount,
        },
      };
      const feeResult = await client.submitAndWait(feeTx, { wallet: signerWallet });
      feeTxHash = feeResult.result.hash;
    } catch (err) {
      console.error('[RetainerEscrow] Fee payment failed:', err);
    }
  }

  // 3. Fund next cycle if ongoing
  let nextCycleTxHash: string | null = null;
  let nextCycleEscrowSequence: number | null = null;

  if (nextCycle) {
    try {
      const nextResult = await fundRetainerCycle({
        marketplaceWallet: signerWallet, // Marketplace signs
        creatorAddress: nextCycle.freelancerAddress,
        amount: cycleAmount,
        cycleNumber: nextCycle.cycleNumber,
        cycleStartDate: nextCycle.cycleStartDate,
        condition: nextCycle.condition,
        graceDays: nextCycle.graceDays ?? 14,
        currency,
        issuer,
      });
      nextCycleTxHash = nextResult.txHash;
      nextCycleEscrowSequence = nextResult.escrowSequence;
    } catch (err) {
      console.error('[RetainerEscrow] Next cycle funding failed:', err);
    }
  }

  return {
    releaseTxHash: releaseResult.txHash,
    feeTxHash,
    nextCycleTxHash,
    nextCycleEscrowSequence,
  };
}

/**
 * Check if a retainer cycle is ready to be released.
 * FinishAfter must have passed AND milestone status must be approved.
 */
export function isCycleReleasable(finishAfter: string, status: string): boolean {
  if (status !== 'approved') return false;
  return new Date(finishAfter).getTime() <= Date.now();
}

/**
 * Calculate the next cycle start date based on the current cycle.
 */
export function getNextCycleStart(currentCycleStart: string): string {
  const next = new Date(currentCycleStart);
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

/**
 * Calculate remaining cycles for a retainer contract.
 * Returns 0 for ongoing (unlimited) retainers.
 */
export function getRemainingCycles(
  totalCycles: number,      // 0 = ongoing
  completedCycles: number
): number {
  if (totalCycles === 0) return -1; // -1 = unlimited
  return Math.max(0, totalCycles - completedCycles);
}
