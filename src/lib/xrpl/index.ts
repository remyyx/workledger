// ============================================
// XRPL Module — Public API
// ============================================
// Import everything from here:
//   import { getXrplClient, generateWallet } from '@/lib/xrpl';
//
// For escrow functions (server-side only):
//   import { generateCondition, createEscrow, finishEscrow, cancelEscrow } from '@/lib/xrpl/escrow';

export { getXrplClient, disconnectXrpl, getNetworkConfig, onReconnect } from './client';
export { generateWallet, setupTrustLines, getBalances, hasBalance } from './wallet';
// Escrow removed from barrel — import directly from '@/lib/xrpl/escrow' in API routes only
// This prevents five-bells-condition (Node.js only) from being bundled client-side
//
// Milestone orchestration (server-side only):
//   import { fundInitialMilestones, releaseMilestoneAndAdvance } from '@/lib/xrpl/milestone-escrow';
//
// Retainer orchestration (server-side only):
//   import { fundRetainerCycle, releaseRetainerCycle } from '@/lib/xrpl/retainer-escrow';
//
// Transaction listener (server-side only):
//   import { startTransactionListener, stopTransactionListener, getListenerStatus } from '@/lib/xrpl/listener';
//   import { handleConfirmedTransaction } from '@/lib/xrpl/transaction-monitor';
export { MCCtokenMint, MCCtokenCreateOffer, mintLicense, mintAccessPass, getMCCs } from './nft';
// Auto-mint credential on release (server-side only):
//   import { mintWorkCredentialOnRelease } from '@/lib/xrpl/mint-credential';
