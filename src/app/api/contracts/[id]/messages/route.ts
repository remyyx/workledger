export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { z } from 'zod';
import { demoMessages } from '@/lib/demo-data';

const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true' && process.env.NODE_ENV === 'development';

/**
 * GET /api/contracts/[id]/messages
 * Fetch the activity timeline for a contract.
 * Returns messages with sender info, ordered chronologically.
 * Supports ?milestone_id= filter and ?cursor= pagination.
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

    const contractId = params.id;

    // Dev mode: return demo messages only for known demo contracts
    if (isDevMode && demoMessages[contractId]) {
      const msgs = demoMessages[contractId];
      const { searchParams } = new URL(request.url);
      const milestoneId = searchParams.get('milestone_id');
      const filtered = milestoneId
        ? msgs.filter(m => m.milestone_id === milestoneId || m.milestone_id === null)
        : msgs;
      return NextResponse.json({ messages: filtered });
    }
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get('milestone_id');
    const cursor = searchParams.get('cursor'); // ISO timestamp for pagination
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    // Verify user is a contract party
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, creator_id, marketplace_id')
      .eq('id', contractId)
      .single();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const isParty = contract.creator_id === session.user.id
      || contract.marketplace_id === session.user.id;

    if (!isParty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('contract_messages')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (milestoneId) {
      query = query.or(`milestone_id.eq.${milestoneId},milestone_id.is.null`);
    }

    if (cursor) {
      query = query.gt('created_at', cursor);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('[API] messages fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Batch-fetch sender info for non-system messages
    const senderIds = Array.from(new Set(
      (messages || []).filter(m => m.sender_id).map(m => m.sender_id)
    ));

    let senderMap: Record<string, { display_name: string; avatar_url: string | null; role: string }> = {};

    if (senderIds.length > 0) {
      // Use the route's supabase client (which in dev mode is the admin client from getSessionOrDev).
      // This avoids creating a separate admin client that may fail if SUPABASE_SERVICE_ROLE_KEY is malformed.
      const { data: senders, error: senderError } = await supabase
        .from('users')
        .select('id, display_name, email, avatar_url, role')
        .in('id', senderIds);

      if (senderError) {
        console.error('[API] sender lookup error:', senderError.message, '| ids:', senderIds);
      }

      if (senders) {
        for (const s of senders) {
          const u = s as any;
          senderMap[u.id] = {
            display_name: u.display_name || u.email || 'User',
            avatar_url: u.avatar_url,
            role: u.role,
          };
        }
      }

      // Fill in any senders not found in the DB (e.g. dev session edge case)
      for (const id of senderIds) {
        if (!senderMap[id]) {
          senderMap[id] = { display_name: 'User', avatar_url: null, role: 'unknown' };
        }
      }
    }

    // Enrich messages with sender info
    const enriched = (messages || []).map(m => ({
      ...m,
      sender: m.sender_id ? senderMap[m.sender_id] || null : null,
    }));

    // Mark messages as read by this user (fire-and-forget)
    const unread = (messages || []).filter(
      m => m.sender_id !== session.user.id && !(m.read_by || []).includes(session.user.id)
    );

    if (unread.length > 0) {
      for (const msg of unread) {
        const updatedReadBy = [...(msg.read_by || []), session.user.id];
        supabase
          .from('contract_messages')
          .update({ read_by: updatedReadBy })
          .eq('id', msg.id)
          .then(() => {});
      }
    }

    return NextResponse.json({ messages: enriched });
  } catch (error) {
    console.error('[API] messages GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// Validation for new message
const sendMessageSchema = z.object({
  type: z.enum(['message', 'revision_request']),
  content: z.string().min(1).max(5000),
  milestone_id: z.string().uuid().optional().nullable(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    hash: z.string().nullable(),
    size: z.number(),
    mime_type: z.string(),
  })).max(10).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({}),
});

/**
 * POST /api/contracts/[id]/messages
 * Send a message or revision request in a contract timeline.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, supabase } = await getSessionOrDev();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractId = params.id;
    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Verify user is a contract party
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, creator_id, marketplace_id')
      .eq('id', contractId)
      .single();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const isParty = contract.creator_id === session.user.id
      || contract.marketplace_id === session.user.id;

    if (!isParty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { type, content, milestone_id, attachments, metadata } = parsed.data;

    const { data: message, error } = await supabase
      .from('contract_messages')
      .insert({
        contract_id: contractId,
        milestone_id: milestone_id || null,
        sender_id: session.user.id,
        type,
        content,
        attachments,
        metadata,
        read_by: [session.user.id], // Sender has read their own message
      })
      .select()
      .single();

    if (error) {
      console.error('[API] message insert error:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[API] messages POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
