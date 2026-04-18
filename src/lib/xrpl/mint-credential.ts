// ============================================
// MCC Minting — Work Credential + Client Completion
// ============================================
// Called server-side after a milestone escrow is released.
// Mints TWO tokens per release:
//   Taxon 1 — Work Credential      → gifted to CREATOR
//   Taxon 4 — Client Completion     → gifted to CLIENT (marketplace)
//
// Uses the PLATFORM wallet to mint both, then creates 0-cost
// sell offers so each party can accept ownership.
//
// Why platform wallet? In Xaman mode we don't have either
// party's private key. Platform mints → offers → party accepts.

import { Wallet } from 'xrpl';
import { MCCtokenMint, MCCtokenCreateOffer } from './nft';
import { MCC_TAXONS } from '@/config/constants';
import type { MCCMetadata, MCCTaxon } from '@/types';

// ─── Parameters ─────────────────────────────────────────────────────────────

export interface MintCredentialParams {
  // Parties
  creatorAddress: string;
  creatorName?: string;
  clientAddress?: string;       // marketplace XRPL address (for taxon 4)
  clientName?: string;

  // Contract context
  contractId: string;
  contractTitle: string;
  contractHash?: string;

  // Milestone context
  milestoneId: string;
  milestoneSequence: number;
  milestoneTitle: string;

  // Deliverable data (captured at submission)
  deliverableHash: string | null;
  deliverableMediaUrl: string | null;   // low-res preview captured at mint
  deliveryDate?: string;                // ISO date

  // Payment
  amount: string;
  currency: string;

  // Escrow
  releaseTxHash: string | null;
  escrowTxHash?: string | null;
  escrowSequence?: number | null;

  // Rating (optional — may be set later)
  rating?: number;
  comment?: string;

  // Work metadata
  workCategory?: string;

  // Delivery document & files (captured at submission)
  deliveryDoc?: string;                   // Full delivery & license summary text
  deliverableFiles?: Array<{
    name: string; format?: string; role?: string; notes?: string;
  }>;
}

// ─── Result ─────────────────────────────────────────────────────────────────

interface MintResult {
  mintTxHash: string;
  nftTokenId: string | null;
  offerTxHash: string | null;
  taxon: MCCTaxon;
  metadata: MCCMetadata;
}

export interface MintCredentialResult {
  creator: MintResult | null;   // Taxon 1 — Work Credential
  client: MintResult | null;    // Taxon 4 — Client Completion Record
}

// ─── Build rich metadata ────────────────────────────────────────────────────
// Both Creator and Client MCCs carry the SAME smart contract data.
// Only name, description, and gradient banner differ (visual identity).

function buildSharedMetadata(p: MintCredentialParams): Omit<MCCMetadata, 'name' | 'description' | 'image'> {
  return {
    work_title: p.contractTitle,
    work_category: p.workCategory,
    deliverable_hash: p.deliverableHash || undefined,
    deliverable_media_url: p.deliverableMediaUrl || undefined,
    delivery_date: p.deliveryDate || new Date().toISOString().slice(0, 10),
    payment_amount: p.amount,
    payment_currency: p.currency,
    escrow_tx_hash: p.escrowTxHash || undefined,
    escrow_sequence: p.escrowSequence || undefined,
    milestone_sequence: p.milestoneSequence,
    contract_hash: p.contractHash || undefined,
    client_name: p.clientName,
    creator_name: p.creatorName,
    creator_address: p.creatorAddress,
    marketplace_rating: p.rating,
    marketplace_comment: p.comment,
    delivery_doc: p.deliveryDoc,
    deliverable_files: p.deliverableFiles,
  };
}

function buildCreatorMetadata(p: MintCredentialParams): MCCMetadata {
  return {
    name: `${p.milestoneTitle} — ${p.contractTitle}`,
    description: `Work Credential for milestone ${p.milestoneSequence} in "${p.contractTitle}". Delivered and escrow released on-chain.`,
    image: 'gradient:orange-red',
    ...buildSharedMetadata(p),
  };
}

function buildClientMetadata(p: MintCredentialParams): MCCMetadata {
  return {
    name: `${p.contractTitle} — Project Completion`,
    description: `Verified record of project completion for "${p.contractTitle}". Work delivered on time, escrow released on-chain.`,
    image: 'gradient:pastel-blue',
    ...buildSharedMetadata(p),
  };
}

// ─── Single token mint helper ───────────────────────────────────────────────

async function mintSingleMCC(
  platformWallet: Wallet,
  taxon: MCCTaxon,
  metadata: MCCMetadata,
  recipientAddress: string,
): Promise<MintResult | null> {
  try {
    // Build inline URI (Phase 2 → IPFS upload)
    const metadataUri = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;

    const mintResult = await MCCtokenMint({
      creatorWallet: platformWallet,
      metadata,
      metadataUri,
      taxon,
    });

    if (!mintResult.nftTokenId) {
      console.error(`[MCC] Could not extract token ID for taxon ${taxon}.`);
      return { mintTxHash: mintResult.txHash, nftTokenId: null, offerTxHash: null, taxon, metadata };
    }

    // Create 0-cost sell offer to recipient
    const offerResult = await MCCtokenCreateOffer({
      signerWallet: platformWallet,
      nftTokenId: mintResult.nftTokenId,
      destinationAddress: recipientAddress,
    });

    console.log(`[MCC] Taxon ${taxon} minted: ${mintResult.nftTokenId} → ${recipientAddress}`);

    return {
      mintTxHash: mintResult.txHash,
      nftTokenId: mintResult.nftTokenId,
      offerTxHash: offerResult.txHash,
      taxon,
      metadata,
    };
  } catch (err: any) {
    console.error(`[MCC] Taxon ${taxon} mint failed:`, err.message);
    return null;
  }
}

// ─── Main entry point ───────────────────────────────────────────────────────

/**
 * Mint both Creator Work Credential (T1) and Client Completion Record (T4)
 * using the platform wallet. Non-blocking — if one fails the other still proceeds.
 */
export async function mintCredentialsOnRelease(
  params: MintCredentialParams
): Promise<MintCredentialResult> {
  const platformSeed = process.env.XRPL_PLATFORM_SECRET;
  if (!platformSeed) {
    console.warn('[MCC] No platform wallet seed configured — skipping credential mint.');
    return { creator: null, client: null };
  }

  const platformWallet = Wallet.fromSeed(platformSeed);

  // Mint both in parallel — each is independent
  const [creator, client] = await Promise.all([
    // T1 — Work Credential → Creator
    mintSingleMCC(
      platformWallet,
      MCC_TAXONS.WORK_CREDENTIAL as MCCTaxon,
      buildCreatorMetadata(params),
      params.creatorAddress,
    ),
    // T4 — Client Completion Record → Client/Marketplace
    params.clientAddress
      ? mintSingleMCC(
          platformWallet,
          MCC_TAXONS.CLIENT_COMPLETION as MCCTaxon,
          buildClientMetadata(params),
          params.clientAddress,
        )
      : Promise.resolve(null),
  ]);

  return { creator, client };
}

// ─── Legacy wrapper (backward compat) ───────────────────────────────────────

/**
 * @deprecated Use mintCredentialsOnRelease() instead.
 * Kept for backward compatibility — mints only the creator credential.
 */
export async function mintWorkCredentialOnRelease(params: {
  creatorAddress: string;
  contractId: string;
  contractTitle: string;
  milestoneSequence: number;
  milestoneTitle: string;
  deliverableHash: string | null;
  amount: string;
  currency: string;
  releaseTxHash: string | null;
}) {
  const result = await mintCredentialsOnRelease({
    ...params,
    milestoneId: '',
    deliverableMediaUrl: null,
  });
  if (!result.creator) return null;
  return {
    mintTxHash: result.creator.mintTxHash,
    nftTokenId: result.creator.nftTokenId,
    offerTxHash: result.creator.offerTxHash,
    metadata: result.creator.metadata,
  };
}
