// ============================================
// Contract Message Helpers
// ============================================
// Creates system messages in the contract timeline
// when milestone actions occur. Called from API routes.
//
// All functions accept an optional `supabaseClient` parameter.
// When provided, that client is used instead of createAdminSupabase().
// This is important for dev mode where the service role key may not
// be a valid JWT — the route handler's client (from getSessionOrDev)
// already has admin-level access and works correctly.

import { createAdminSupabase } from '@/lib/supabase/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

function getClient(provided?: SupabaseClient): SupabaseClient {
  if (provided) return provided;
  return createAdminSupabase();
}

interface SystemMessageParams {
  contractId: string;
  milestoneId?: string | null;
  senderId?: string | null; // null for pure system events
  action: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a system message into the contract timeline.
 * Uses admin client to bypass RLS (called from server-side API routes).
 * Non-blocking — errors are logged but don't break the calling flow.
 *
 * @param params - message fields
 * @param supabaseClient - optional pre-authenticated client (pass from route handler in dev mode)
 */
export async function createSystemMessage(params: SystemMessageParams, supabaseClient?: SupabaseClient): Promise<void> {
  try {
    const client = getClient(supabaseClient);
    const { error } = await (client as any).from('contract_messages').insert({
      contract_id: params.contractId,
      milestone_id: params.milestoneId || null,
      sender_id: params.senderId || null,
      type: 'system',
      content: params.content,
      attachments: [],
      metadata: {
        action: params.action,
        ...params.metadata,
      },
      read_by: params.senderId ? [params.senderId] : [],
    });
    if (error) {
      console.error('[contract-messages] System message insert error:', error.message, '| contractId:', params.contractId, '| action:', params.action);
    }
  } catch (e) {
    console.error('[contract-messages] Failed to create system message:', e);
  }
}

/**
 * Log a deliverable submission in the timeline.
 */
export async function createDeliverableMessage(params: {
  contractId: string;
  milestoneId: string;
  senderId: string;
  notes: string | null;
  mediaHash: string | null;
  docHash: string | null;
  mediaUrl: string | null;
  docUrl: string | null;
}, supabaseClient?: SupabaseClient): Promise<void> {
  try {
    const client = getClient(supabaseClient);
    const { error } = await (client as any).from('contract_messages').insert({
      contract_id: params.contractId,
      milestone_id: params.milestoneId,
      sender_id: params.senderId,
      type: 'deliverable_submit',
      content: params.notes || 'Deliverable submitted for review.',
      attachments: [],
      metadata: {
        media_hash: params.mediaHash,
        doc_hash: params.docHash,
        media_url: params.mediaUrl,
        doc_url: params.docUrl,
        notes: params.notes,
      },
      read_by: [params.senderId],
    });
    if (error) {
      console.error('[contract-messages] Deliverable message insert error:', error.message, '| contractId:', params.contractId);
    }
  } catch (e) {
    console.error('[contract-messages] Failed to create deliverable message:', e);
  }
}

/**
 * Log a revision request in the timeline.
 */
export async function createRevisionMessage(params: {
  contractId: string;
  milestoneId: string;
  senderId: string;
  content: string;
  issues: string[];
  severity: 'minor' | 'major' | 'critical';
}, supabaseClient?: SupabaseClient): Promise<void> {
  try {
    const client = getClient(supabaseClient);
    const { error } = await (client as any).from('contract_messages').insert({
      contract_id: params.contractId,
      milestone_id: params.milestoneId,
      sender_id: params.senderId,
      type: 'revision_request',
      content: params.content,
      attachments: [],
      metadata: {
        issues: params.issues,
        requested_changes: params.content,
        severity: params.severity,
      },
      read_by: [params.senderId],
    });
    if (error) {
      console.error('[contract-messages] Revision message insert error:', error.message, '| contractId:', params.contractId);
    }
  } catch (e) {
    console.error('[contract-messages] Failed to create revision message:', e);
  }
}

/**
 * Log an approval in the timeline.
 */
export async function createApprovalMessage(params: {
  contractId: string;
  milestoneId: string;
  senderId: string;
  milestoneTitle: string;
}, supabaseClient?: SupabaseClient): Promise<void> {
  try {
    const client = getClient(supabaseClient);
    const { error } = await (client as any).from('contract_messages').insert({
      contract_id: params.contractId,
      milestone_id: params.milestoneId,
      sender_id: params.senderId,
      type: 'approval',
      content: `Approved milestone: ${params.milestoneTitle}`,
      attachments: [],
      metadata: { action: 'approve' },
      read_by: [params.senderId],
    });
    if (error) {
      console.error('[contract-messages] Approval message insert error:', error.message, '| contractId:', params.contractId);
    }
  } catch (e) {
    console.error('[contract-messages] Failed to create approval message:', e);
  }
}

/**
 * Log a fund release in the timeline.
 */
export async function createReleaseMessage(params: {
  contractId: string;
  milestoneId: string;
  senderId: string;
  amount: string;
  currency: string;
  txHash: string;
  milestoneTitle: string;
}, supabaseClient?: SupabaseClient): Promise<void> {
  try {
    const client = getClient(supabaseClient);
    const { error } = await (client as any).from('contract_messages').insert({
      contract_id: params.contractId,
      milestone_id: params.milestoneId,
      sender_id: params.senderId,
      type: 'release',
      content: `Released ${params.amount} ${params.currency} for: ${params.milestoneTitle}`,
      attachments: [],
      metadata: {
        action: 'release',
        amount: params.amount,
        currency: params.currency,
        tx_hash: params.txHash,
      },
      read_by: [params.senderId],
    });
    if (error) {
      console.error('[contract-messages] Release message insert error:', error.message, '| contractId:', params.contractId);
    }
  } catch (e) {
    console.error('[contract-messages] Failed to create release message:', e);
  }
}
