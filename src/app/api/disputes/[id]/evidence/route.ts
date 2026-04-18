export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { z } from 'zod';

/**
 * POST /api/disputes/[id]/evidence
 * Submit evidence for a dispute.
 * Body: { description: string, file_url?: string, file_hash?: string }
 */
const submitEvidenceSchema = z.object({
  description: z.string().min(1),
  file_url: z.string().url().optional(),
  file_hash: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Parse and validate request body
    const body = await request.json();
    const parsed = submitEvidenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { description, file_url, file_hash } = parsed.data;

    // Fetch dispute to verify user is a party to the contract
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(
        `
        id,
        contract_id,
        contracts (
          creator_id,
          marketplace_id
        )
        `
      )
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 });
    }

    const contract = (dispute as any).contracts;
    const isParty =
      contract.creator_id === session.user.id ||
      contract.marketplace_id === session.user.id;

    if (!isParty) {
      return NextResponse.json(
        { error: 'Forbidden: You are not a party to this dispute.' },
        { status: 403 }
      );
    }

    // Create evidence record
    const { data: evidence, error: createError } = await supabase
      .from('dispute_evidence')
      .insert({
        dispute_id: id,
        submitted_by: session.user.id,
        description,
        file_url: file_url || null,
        file_hash: file_hash || null,
      })
      .select('id, created_at')
      .single();

    if (createError) {
      console.error('[API] evidence insert error:', createError);
      return NextResponse.json(
        { error: 'Failed to submit evidence.' },
        { status: 500 }
      );
    }

    // Create dispute_event record for evidence submission
    await supabase
      .from('dispute_events')
      .insert({
        dispute_id: id,
        actor_id: session.user.id,
        action: 'evidence_submitted',
        from_status: 'open',
        to_status: 'evidence',
        notes: description,
        metadata: { evidence_id: evidence?.id },
      });

    // Update dispute status to 'evidence' if still 'open'
    await supabase
      .from('disputes')
      .update({ status: 'evidence' })
      .eq('id', id)
      .eq('status', 'open');

    return NextResponse.json(
      {
        evidence: {
          id: evidence?.id,
          dispute_id: id,
          submitted_by: session.user.id,
          description,
          file_url,
          file_hash,
          created_at: evidence?.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] evidence POST error:', error);
    return NextResponse.json(
      { error: 'Failed to submit evidence.' },
      { status: 500 }
    );
  }
}
