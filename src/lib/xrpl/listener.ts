// ============================================
// XRPL Transaction Listener
// ============================================
// Subscribes to the XRPL ledger via WebSocket and watches for
// transactions relevant to WorkLedger (escrow creates, finishes, payments).
//
// This is the "security camera" on the blockchain — if a transaction
// confirms on-chain, we catch it and update our database automatically.
// Doesn't matter if the user's browser crashed or their internet dropped.
//
// Architecture:
//   - Uses the singleton XRPL client from ./client.ts
//   - Subscribes to specific accounts (platform + tracked users)
//   - Filters for EscrowCreate, EscrowFinish, Payment tx types
//   - Passes confirmed transactions to the transaction monitor
//
// This runs server-side only. Never import in client components.

import { getXrplClient } from './client';

// Types based on xrpl.js TransactionStream
export interface TransactionStreamEvent {
  type: 'transaction';
  transaction: {
    hash?: string;
    Account: string;
    Destination?: string;
    TransactionType: string;
    Amount?: string | { currency: string; issuer: string; value: string };
    OfferSequence?: number;
    Sequence?: number;
    Condition?: string;
    Fulfillment?: string;
    Owner?: string;
  };
  meta?: {
    TransactionResult: string;
    AffectedNodes?: Array<{
      CreatedNode?: {
        LedgerEntryType: string;
        NewFields?: Record<string, any>;
      };
      ModifiedNode?: {
        LedgerEntryType: string;
        FinalFields?: Record<string, any>;
      };
      DeletedNode?: {
        LedgerEntryType: string;
        FinalFields?: Record<string, any>;
      };
    }>;
  };
  ledger_index?: number;
  ledger_hash?: string;
  validated?: boolean;
  engine_result_code?: number;
  engine_result?: string;
}

// Track listener state to avoid duplicate subscriptions
let isListening = false;
let subscribedAccounts: Set<string> = new Set();

/**
 * Subscribe to XRPL transaction events for specific accounts.
 * The handler is called for every confirmed transaction involving
 * any of the subscribed accounts.
 *
 * Safe to call multiple times — only creates one subscription.
 * New accounts can be added dynamically.
 */
export async function startTransactionListener(
  accounts: string[],
  handler: (event: TransactionStreamEvent) => Promise<void>
): Promise<{ listening: boolean; accountCount: number }> {
  const client = await getXrplClient();

  // Add new accounts to our tracking set
  const newAccounts = accounts.filter(a => !subscribedAccounts.has(a));

  if (newAccounts.length > 0) {
    // Subscribe to account transaction streams
    // xrpl.js uses the 'subscribe' command with 'accounts' parameter
    try {
      await client.request({
        command: 'subscribe',
        accounts: newAccounts,
      });
      newAccounts.forEach(a => subscribedAccounts.add(a));
      console.log(`[XRPL Listener] Subscribed to ${newAccounts.length} new account(s). Total: ${subscribedAccounts.size}`);
    } catch (err) {
      console.error('[XRPL Listener] Failed to subscribe to accounts:', err);
      throw err;
    }
  }

  // Only attach the event handler once
  if (!isListening) {
    client.on('transaction', async (event: any) => {
      const tx = event as TransactionStreamEvent;

      // Only process validated (confirmed) transactions
      if (!tx.validated) return;

      // Only care about successful transactions
      if (tx.meta?.TransactionResult !== 'tesSUCCESS') {
        // Log failed transactions for monitoring
        if (tx.transaction?.hash) {
          console.warn(
            `[XRPL Listener] Failed tx ${tx.transaction.hash}: ${tx.meta?.TransactionResult}`
          );
        }
        return;
      }

      // Only process tx types we care about
      const relevantTypes = ['EscrowCreate', 'EscrowFinish', 'EscrowCancel', 'Payment'];
      if (!relevantTypes.includes(tx.transaction?.TransactionType)) return;

      try {
        await handler(tx);
      } catch (err) {
        console.error('[XRPL Listener] Handler error for tx', tx.transaction?.hash, ':', err);
      }
    });

    // Handle reconnection — re-subscribe when connection drops and restores
    client.on('connected', async () => {
      if (subscribedAccounts.size > 0) {
        console.log('[XRPL Listener] Reconnected. Re-subscribing to accounts...');
        try {
          await client.request({
            command: 'subscribe',
            accounts: Array.from(subscribedAccounts),
          });
          console.log(`[XRPL Listener] Re-subscribed to ${subscribedAccounts.size} account(s).`);
        } catch (err) {
          console.error('[XRPL Listener] Re-subscription failed:', err);
        }
      }
    });

    isListening = true;
    console.log('[XRPL Listener] Transaction listener started.');
  }

  return {
    listening: isListening,
    accountCount: subscribedAccounts.size,
  };
}

/**
 * Stop listening and clean up subscriptions.
 */
export async function stopTransactionListener(): Promise<void> {
  if (!isListening) return;

  try {
    const client = await getXrplClient();
    if (subscribedAccounts.size > 0) {
      await client.request({
        command: 'unsubscribe',
        accounts: Array.from(subscribedAccounts),
      });
    }
  } catch (err) {
    // Client may already be disconnected
    console.warn('[XRPL Listener] Unsubscribe failed (client may be disconnected):', err);
  }

  subscribedAccounts.clear();
  isListening = false;
  console.log('[XRPL Listener] Stopped.');
}

/**
 * Get current listener status for health checks.
 */
export function getListenerStatus(): {
  listening: boolean;
  subscribedAccounts: string[];
} {
  return {
    listening: isListening,
    subscribedAccounts: Array.from(subscribedAccounts),
  };
}

/**
 * Extract the escrow sequence number from a confirmed EscrowCreate transaction.
 * Parses the AffectedNodes metadata to find the created Escrow ledger entry.
 */
export function extractEscrowSequence(event: TransactionStreamEvent): number | null {
  if (!event.meta?.AffectedNodes) return null;

  for (const node of event.meta.AffectedNodes) {
    if (node.CreatedNode?.LedgerEntryType === 'Escrow') {
      // The escrow's owner sequence is in Sequence field
      return node.CreatedNode.NewFields?.Sequence ?? null;
    }
  }

  // Fallback: use the transaction's own Sequence (often the escrow sequence for EscrowCreate)
  return event.transaction?.Sequence ?? null;
}
