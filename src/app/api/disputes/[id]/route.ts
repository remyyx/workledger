export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createSystemMessage } from '@/lib/contract-messages';
import { n8n } from '@/lib/n8n/client';
import { PLATFORM } from '@/config/constants';
import { z } from 'zod';

/**
 * GET /api/disputes/[id]
 * Fetch full dispute detail with evidence and events.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Fetch dispute with all related data
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(
        `
        id,
        contract_id,
        milestone_id,
        raised_by,
        reason,
        status,
        resolution,
        arbitrator_id,
        created_at,
        resolved_at,
        contracts (
          id,
          title,
          creator_id,
          marketplace_id,
          status,
          currency,
          total_amount
        ),
        milestones (
          id,
          sequence,
          title,
          amount,
          status
        )
        `
      )
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 });
    }

    // Fetch evidence
    const { data: evidence } = await supabase
      .from('dispute_evidence')
      .select('*')
      .eq('dispute_id', id)
      .order('created_at', { ascending: true });

    // Fetch events
    const { data: events } = await supabase
      .from('dispute_events')
      .select('*')
      .eq('dispute_id', id)
      .order('created_at', { ascending: true });

    // Enrich with user names
    const admin = createAdminSupabase();
    const userIds = new Set<string>([
      (dispute as any).raised_by,
      ...(evidence || []).map((e: any) => e.submitted_by),
      ...(events || []).map((e: any) => e.actor_id).filter(Boolean),
    ]);

    const { data: users } = await admin
      .from('users')
      .select('id, display_name')
      .in('id', Array.from(userIds));

    const nameMap: Record<string, string> = {};
    for (const u of (users || []) as any[]) {
      nameMap[u.id] = u.display_name;
    }

    // Enrich dispute
    const enrichedDispute = {
      ...dispute,
      raised_by_name: nameMap[(dispute as any).raised_by] || 'Unknown',
      evidence: (evidence || []).map((e: any) => ({
        ...e,
        submitted_by_name: nameMap[e.submitted_by] || 'Unknown',
      })),
      events: (events || []).map((e: any) => ({
        ...e,
        actor_name: e.actor_id ? nameMap[e.actor_id] || 'Unknown' : null,
      })),
    };

    return NextResponse.json({ dispute: enrichedDispute });
  } catch (error) {
    console.error('[API] dispute detail GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dispute.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/disputes/[id]
 * Admin resolves a dispute.
 * Body: { resolution: 'creator_wins'|'marketplace_wins'|'compromise', notes: string }
 */
const resolveDisputeSchema = z.object({
  resolution: z.enum(['creator_wins', 'marketplace_wins', 'compromise']),
  notes: z.string().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: currentUser } = await supabase
      .from('users')
      .select('is_admin, display_name')
      .eq('id', session.user.id)
      .single();

    const isAdmin = (currentUser as any)?.is_admin === true;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { id } = params;

    // Parse and validate request body
    const body = await request.json();
    const parsed = resolveDisputeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { resolution, notes } = parsed.data;

    // Fetch the dispute with related contract and milestone
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(
        `
        id,
        contract_id,
        milestone_id,
        raised_by,
        status,
        contracts (
          id,
          creator_id,
          marketplace_id
        ),
        milestones (
          id,
          status,
          amount
        )
        `
      )
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 });
    }

    const contract = (dispute as any).contracts;
    const milestone = (dispute as any).milestones;

    // Update dispute status to resolved
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution,
        arbitrator_id: session.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('[API] dispute update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to resolve dispute.' },
        { status: 500 }
      );
    }

    // Create dispute_event record
    await supabase
      .from('dispute_events')
      .insert({
        dispute_id: id,
        actor_id: session.user.id,
        action: 'resolved',
        from_status: (dispute as any).status,
        to_status: 'resolved',
        notes,
        metadata: { resolution },
      });

    // Update milestone status based on resolution
    let newMilestoneStatus = 'pending';
    if (resolution === 'creator_wins') {
      newMilestoneStatus = 'approved'; // Will be released in next step
    } else if (resolution === 'marketplace_wins') {
      newMilestoneStatus = 'pending'; // Refund scenario
    } else {
      // Compromise: keep as pending for further negotiation
      newMilestoneStatus = 'pending';
    }

    await supabase
      .from('milestones')
      .update({ status: newMilestoneStatus })
      .eq('id', (dispute as any).milestone_id);

    // Create system message on contract
    createSystemMessage({
      contractId: contract.id,
      milestoneId: milestone.id,
      senderId: session.user.id,
      action: 'dispute_resolved',
      content: `Dispute resolved by ${(currentUser as any).display_name}: ${resolution}. ${notes}`,
      metadata: { resolution, resolution_notes: notes },
    }).catch(() => {});

    // Fire n8n event
    n8n.disputeResolved({
      disputeId: id,
      contractId: contract.id,
      outcome: resolution,
    });

    return NextResponse.json({
      dispute: {
        id,
        status: 'resolved',
        resolution,
        resolved_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[API] dispute PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve dispute.' },
      { status: 500 }
    );
  }
}
