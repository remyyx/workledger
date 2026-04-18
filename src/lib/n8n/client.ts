// ============================================
// n8n Webhook Client
// ============================================
// Fires events to n8n workflows via webhook triggers.
// Each workflow has its own webhook URL configured in n8n.
//
// Why n8n instead of doing it in the API route?
// - Notifications (email, SMS, push) are async side effects
// - Dispute escalation has timers and multi-step logic
// - Scheduled jobs (cleanup, reputation) need a scheduler
// - n8n gives visual debugging, retry logic, and easy iteration
//
// All calls are fire-and-forget (non-blocking).
// If n8n is down, the core XRPL + DB operations still succeed.

type N8nEvent =
  | 'user.registered'
  | 'contract.created'
  | 'contract.funded'
  | 'contract.completed'
  | 'milestone.funded'
  | 'milestone.submitted'
  | 'milestone.approved'
  | 'milestone.released'
  | 'milestone.disputed'
  | 'dispute.opened'
  | 'dispute.escalated'
  | 'dispute.resolved'
  | 'mcc.minted'
  | 'escrow.expiring';

interface N8nWebhookPayload {
  event: N8nEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

// n8n webhook base URL — set in .env
// Example: https://your-instance.app.n8n.cloud/webhook
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_URL || '';
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || '';

/**
 * Fire an event to n8n. Non-blocking, never throws.
 * The webhook URL pattern is: {base}/{event-name}
 * e.g. https://n8n.studioledger.ai/webhook/milestone.released
 */
export async function fireN8nEvent(
  event: N8nEvent,
  data: Record<string, unknown>
): Promise<void> {
  if (!N8N_WEBHOOK_BASE) {
    // n8n not configured — silently skip
    console.log(`[n8n] Skipped (no webhook URL): ${event}`);
    return;
  }

  const payload: N8nWebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const url = `${N8N_WEBHOOK_BASE}/${event}`;

  try {
    // Fire and forget — don't await in the calling context
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(N8N_WEBHOOK_SECRET && {
          'X-Webhook-Secret': N8N_WEBHOOK_SECRET,
        }),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5s timeout
    }).catch((err) => {
      console.error(`[n8n] Webhook failed for ${event}:`, err.message);
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[n8n] Failed to fire ${event}:`, message);
  }
}

/**
 * Convenience helpers for common events.
 * Each returns void and is non-blocking.
 */
export const n8n = {
  userRegistered: (data: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
    xrplAddress: string;
  }) => fireN8nEvent('user.registered', data),

  contractCreated: (data: {
    contractId: string;
    creatorId: string;
    marketplaceId: string;
    template: string;
    amount: string;
    currency: string;
  }) => fireN8nEvent('contract.created', data),

  contractFunded: (data: {
    contractId: string;
    creatorId: string;
    marketplaceId: string;
    amount: string;
    currency: string;
    txHash: string;
  }) => fireN8nEvent('contract.funded', data),

  contractCompleted: (data: {
    contractId: string;
    creatorId: string;
    marketplaceId: string;
    totalAmount: string;
    currency: string;
    milestoneCount: number;
  }) => fireN8nEvent('contract.completed', data),

  milestoneFunded: (data: {
    contractId: string;
    milestoneId: string;
    sequence: number;
    amount: string;
    currency: string;
    txHash: string;
    creatorId: string;
    marketplaceId: string;
  }) => fireN8nEvent('milestone.funded', data),

  milestoneSubmitted: (data: {
    contractId: string;
    milestoneId: string;
    sequence: number;
    deliverableHash?: string;
    creatorId: string;
    marketplaceId: string;
  }) => fireN8nEvent('milestone.submitted', data),

  milestoneApproved: (data: {
    contractId: string;
    milestoneId: string;
    sequence: number;
    creatorId: string;
    marketplaceId: string;
  }) => fireN8nEvent('milestone.approved', data),

  milestoneReleased: (data: {
    contractId: string;
    milestoneId: string;
    sequence: number;
    amount: string;
    currency: string;
    txHash: string;
    creatorId: string;
    marketplaceId: string;
    contractCompleted: boolean;
  }) => fireN8nEvent('milestone.released', data),

  disputeOpened: (data: {
    contractId: string;
    milestoneId: string;
    disputeId: string;
    raisedBy: string;
    creatorId: string;
    marketplaceId: string;
    amount: string;
    currency: string;
  }) => fireN8nEvent('dispute.opened', data),

  disputeEscalated: (data: {
    disputeId: string;
    contractId: string;
    tier: 'admin_review' | 'community_arbitration';
    arbitratorIds?: string[];
  }) => fireN8nEvent('dispute.escalated', data),

  // Dispute resolution (admin decision)
  disputeResolved: (data: {
    disputeId: string;
    contractId: string;
    outcome: 'creator_wins' | 'marketplace_wins' | 'compromise';
    arbitrationFee?: string;
  }) => fireN8nEvent('dispute.resolved', data),

  mccMinted: (data: {
    contractId: string;
    milestoneId: string;
    creatorId: string;
    creatorAddress: string;
    nftTokenId: string;
    mintTxHash: string;
  }) => fireN8nEvent('mcc.minted', data),

  escrowExpiring: (data: {
    contractId: string;
    milestoneId: string;
    sequence: number;
    cancelAfter: string;
    hoursRemaining: number;
    creatorId: string;
    marketplaceId: string;
  }) => fireN8nEvent('escrow.expiring', data),
};
