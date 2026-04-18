// ============================================
// XRPL Escrow — Payment Protection
// ============================================
// This is the HEART of WorkLedger's billing system.
// Escrow locks funds on-chain until the client approves the work.
// Nobody can steal the money — not the freelancer, not us, not even XRPL.

import { Wallet } from 'xrpl';
import type { EscrowCreate, EscrowFinish, EscrowCancel } from 'xrpl';
import { getXrplClient } from './client';
import { RLUSD_ISSUER, RLUSD_CURRENCY } from '@/config/constants';
import * as crypto from 'crypto';

/**
 * Generate a crypto-condition pair for escrow.
 * Pure JavaScript implementation — no native addons needed.
 *
 * Uses PREIMAGE-SHA-256 (crypto-conditions type 0) per RFC draft.
 * This is the only condition type XRPL supports for escrow.
 *
 * How this works (simplified):
 * - We create a secret (preimage) and a lock (condition)
 * - The escrow is created with the lock
 * - To release funds, you need the secret (fulfillment)
 * - Only the party who knows the secret can release
 *
 * Think of it like a combination lock on a safe.
 */
export function generateCondition(): { condition: string; fulfillment: string; preimage: string } {
  // Generate random 32-byte preimage
  const preimage = crypto.randomBytes(32);

  // Build the fulfillment (DER-encoded PreimageSha256)
  // Type: 0 (Preimage-SHA-256), prefix bytes per crypto-conditions spec
  const fulfillmentBuffer = Buffer.concat([
    Buffer.from([0xa0, 0x22, 0x80, 0x20]), // ASN.1: constructed [0], length 34, primitive [0], length 32
    preimage,
  ]);

  // Build the condition per crypto-conditions RFC (draft-thomas-crypto-conditions-04)
  // IMPORTANT: fingerprint = SHA-256(raw preimage), NOT SHA-256(DER fulfillment)
  // Cost = byte length of preimage (32)
  // No subtypes field for PREIMAGE-SHA-256 (only compound conditions use subtypes)
  const hash = crypto.createHash('sha256').update(preimage).digest();
  const conditionBuffer = Buffer.concat([
    Buffer.from([0xa0, 0x25, 0x80, 0x20]), // ASN.1: constructed [0], length 37, primitive [0], length 32
    hash,
    Buffer.from([0x81, 0x01, 0x20]),        // cost tag, length 1, value 32 (preimage length)
  ]);

  return {
    condition: conditionBuffer.toString('hex').toUpperCase(),
    fulfillment: fulfillmentBuffer.toString('hex').toUpperCase(),
    preimage: preimage.toString('hex'),
  };
}

/**
 * Create a Token Escrow (XLS-85).
 * This locks RLUSD (or any token) on-chain.
 *
 * @param clientWallet - The client who is paying
 * @param freelancerAddress - Where funds go when released
 * @param amount - How much to lock (e.g., "500" for 500 RLUSD)
 * @param condition - The crypto-condition (from generateCondition)
 * @param cancelAfterDays - Auto-refund if not released within X days
 * @param finishAfterMinutes - Minimum time before release (prevents instant grab)
 */
export async function createEscrow(params: {
  clientWallet: Wallet;
  freelancerAddress: string;
  amount: string;
  currency?: string;
  issuer?: string;
  condition: string;
  cancelAfterDays?: number;
  finishAfterMinutes?: number;
}) {
  const client = await getXrplClient();

  const {
    clientWallet,
    freelancerAddress,
    amount,
    currency = RLUSD_CURRENCY,
    issuer = RLUSD_ISSUER,
    condition,
    cancelAfterDays = 30,
    finishAfterMinutes = 0,
  } = params;

  // XRPL uses "Ripple Epoch" time (seconds since Jan 1, 2000)
  const rippleEpochOffset = 946684800;
  const now = Math.floor(Date.now() / 1000) - rippleEpochOffset;

  const tx: EscrowCreate = {
    TransactionType: 'EscrowCreate',
    Account: clientWallet.classicAddress,
    Destination: freelancerAddress,
    Amount: {
      currency,
      issuer,
      value: amount,
    } as any, // Token Escrow (XLS-85) extends the Amount field
    Condition: condition,
    CancelAfter: now + (cancelAfterDays * 24 * 60 * 60),
    ...(finishAfterMinutes > 0 && {
      FinishAfter: now + (finishAfterMinutes * 60),
    }),
  };

  const result = await client.submitAndWait(tx, { wallet: clientWallet });

  return {
    txHash: result.result.hash,
    sequence: (result.result as any).tx_json?.Sequence ?? null,
    status: result.result.meta,
  };
}

/**
 * Release funds from escrow (client approves work).
 * Requires the fulfillment (the "secret key" for the condition).
 *
 * In production, this will be part of a Batch Transaction that also:
 * - Takes the platform fee
 * - Mints the MCC (Minted Craft Credential)
 */
export async function finishEscrow(params: {
  signerWallet: Wallet;
  escrowOwner: string;
  escrowSequence: number;
  condition: string;
  fulfillment: string;
}) {
  const client = await getXrplClient();

  const tx: EscrowFinish = {
    TransactionType: 'EscrowFinish',
    Account: params.signerWallet.classicAddress,
    Owner: params.escrowOwner,
    OfferSequence: params.escrowSequence,
    Condition: params.condition,
    Fulfillment: params.fulfillment,
  };

  const result = await client.submitAndWait(tx, { wallet: params.signerWallet });

  return {
    txHash: result.result.hash,
    status: result.result.meta,
  };
}

/**
 * Cancel an escrow (refund to client).
 * Only works after the CancelAfter date has passed,
 * OR via multi-sign dispute resolution.
 */
export async function cancelEscrow(params: {
  signerWallet: Wallet;
  escrowOwner: string;
  escrowSequence: number;
}) {
  const client = await getXrplClient();

  const tx: EscrowCancel = {
    TransactionType: 'EscrowCancel',
    Account: params.signerWallet.classicAddress,
    Owner: params.escrowOwner,
    OfferSequence: params.escrowSequence,
  };

  const result = await client.submitAndWait(tx, { wallet: params.signerWallet });

  return {
    txHash: result.result.hash,
    status: result.result.meta,
  };
}
