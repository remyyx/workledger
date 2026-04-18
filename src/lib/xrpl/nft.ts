// ============================================
// XRPL MCC — Minted Craft Credentials, Licensing & Access
// ============================================
// Three token types, each with a purpose:
// Taxon 1 = MCC / Minted Craft Credential (your portable resume)
// Taxon 2 = License (rights management)
// Taxon 3 = Access Pass (membership/loyalty)
//
// MCCs are StudioLedger's on-chain copyright tokens — verifiable proof
// of work completed, rights licensed, or access granted. Built on XRPL's
// XLS-20 standard. Protocol types (NFTokenMint, etc.) are XRPL SDK names
// we can't change; our code uses MCC terminology everywhere else.

import { Wallet, convertStringToHex } from 'xrpl';
import type { NFTokenMint, NFTokenCreateOffer } from 'xrpl';
import { getXrplClient } from './client';
import { MCC_TAXONS } from '@/config/constants';
import type { MCCMetadata, MCCTaxon } from '@/types';

// MCC Flags (bitwise — maps to XRPL NFToken flags)
const MCC_FLAGS = {
  BURNABLE: 1,        // Issuer can burn (revoke)
  ONLY_XRP: 2,        // Can only be traded for XRP
  TRANSFERABLE: 8,    // Can be transferred/sold
};

/**
 * Mint a Minted Craft Credential (Taxon 1).
 * Auto-called when a milestone is released.
 *
 * This token proves: "I did this work, on this date, for this marketplace."
 * It travels with the creator's wallet forever — portable craft history.
 */
export async function MCCtokenMint(params: {
  creatorWallet: Wallet;
  metadata: MCCMetadata;
  metadataUri: string; // IPFS URI
  taxon?: number;      // Defaults to WORK_CREDENTIAL (1)
}) {
  const client = await getXrplClient();

  const tx: NFTokenMint = {
    TransactionType: 'NFTokenMint',
    Account: params.creatorWallet.classicAddress,
    NFTokenTaxon: params.taxon ?? MCC_TAXONS.WORK_CREDENTIAL,
    Flags: MCC_FLAGS.TRANSFERABLE, // Creator can show it anywhere
    TransferFee: 0,                // No royalty — it's a credential
    URI: convertStringToHex(params.metadataUri),
    // Memos for on-chain indexing (no need to hit IPFS for basic info)
    Memos: [
      {
        Memo: {
          MemoType: convertStringToHex('work_type'),
          MemoData: convertStringToHex(params.metadata.work_category || 'general'),
        },
      },
      {
        Memo: {
          MemoType: convertStringToHex('deliverable_hash'),
          MemoData: convertStringToHex(params.metadata.deliverable_hash || ''),
        },
      },
    ],
  };

  const result = await client.submitAndWait(tx, { wallet: params.creatorWallet });

  return {
    txHash: result.result.hash,
    // Extract the token ID from the transaction metadata
    nftTokenId: extractTokenId(result.result.meta),
  };
}

/**
 * Mint a License token (Taxon 2).
 * Created on final milestone release — grants usage rights.
 */
export async function mintLicense(params: {
  creatorWallet: Wallet;
  metadata: MCCMetadata;
  metadataUri: string;
  transferable: boolean;
  royaltyPercent: number; // 0-50
}) {
  const client = await getXrplClient();

  // Transfer fee is in 1/100000 units (50000 = 50%)
  const transferFee = Math.min(params.royaltyPercent * 1000, 50000);

  let flags = MCC_FLAGS.BURNABLE; // Issuer can revoke if terms violated
  if (params.transferable) {
    flags |= MCC_FLAGS.TRANSFERABLE;
  }

  const tx: NFTokenMint = {
    TransactionType: 'NFTokenMint',
    Account: params.creatorWallet.classicAddress,
    NFTokenTaxon: MCC_TAXONS.LICENSE,
    Flags: flags,
    TransferFee: params.transferable ? transferFee : 0,
    URI: convertStringToHex(params.metadataUri),
  };

  const result = await client.submitAndWait(tx, { wallet: params.creatorWallet });

  return {
    txHash: result.result.hash,
    nftTokenId: extractTokenId(result.result.meta),
  };
}

/**
 * Mint an Access Pass token (Taxon 3).
 * Purchased by marketplace participants for perks (priority booking, discounts, etc.).
 */
export async function mintAccessPass(params: {
  creatorWallet: Wallet;
  metadata: MCCMetadata;
  metadataUri: string;
  transferable: boolean;
}) {
  const client = await getXrplClient();

  const tx: NFTokenMint = {
    TransactionType: 'NFTokenMint',
    Account: params.creatorWallet.classicAddress,
    NFTokenTaxon: MCC_TAXONS.ACCESS_PASS,
    Flags: params.transferable
      ? MCC_FLAGS.TRANSFERABLE | MCC_FLAGS.BURNABLE
      : MCC_FLAGS.BURNABLE,
    TransferFee: 0,
    URI: convertStringToHex(params.metadataUri),
  };

  const result = await client.submitAndWait(tx, { wallet: params.creatorWallet });

  return {
    txHash: result.result.hash,
    nftTokenId: extractTokenId(result.result.meta),
  };
}

/**
 * Create a sell offer for an MCC token to a destination.
 * Used to gift a minted credential to the creator after milestone release.
 */
export async function MCCtokenCreateOffer(params: {
  signerWallet: Wallet;
  nftTokenId: string;
  destinationAddress: string;
  amount?: string; // defaults to '0' (free gift)
}) {
  const client = await getXrplClient();

  const tx: NFTokenCreateOffer = {
    TransactionType: 'NFTokenCreateOffer',
    Account: params.signerWallet.classicAddress,
    NFTokenID: params.nftTokenId,
    Amount: params.amount || '0', // Free — it's a credential, not commerce
    Destination: params.destinationAddress,
    Flags: 1, // tfSellNFToken
  };

  const result = await client.submitAndWait(tx, { wallet: params.signerWallet });

  return {
    txHash: result.result.hash,
    offerResult: result.result.meta,
  };
}

/**
 * Get all MCC tokens owned by an address.
 * Uses the XRPL account_nfts command (protocol name — not ours).
 */
export async function getMCCs(address: string) {
  const client = await getXrplClient();

  const result = await client.request({
    command: 'account_nfts',
    account: address,
    ledger_index: 'validated',
  });

  return result.result.account_nfts;
}

/**
 * Helper: Extract token ID from XRPL transaction metadata.
 * Looks through AffectedNodes for the newly created token page entry.
 */
function extractTokenId(meta: any): string | null {
  if (!meta || typeof meta === 'string') return null;

  const affectedNodes = meta.AffectedNodes || [];
  for (const node of affectedNodes) {
    const created = node.CreatedNode;
    if (created?.LedgerEntryType === 'NFTokenPage') {
      const tokens = created.NewFields?.NFTokens || [];
      if (tokens.length > 0) {
        return tokens[tokens.length - 1].NFToken?.NFTokenID || null;
      }
    }
  }
  return null;
}
