export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { z } from 'zod';

// --- Validation ---
const milestoneSchema = z.object({
  sequence: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  amount: z.number().positive(),
  deadline: z.string(),
});

const termsSchema = z.object({
  template: z.enum(['fixed_price', 'milestone', 'retainer', 'pay_per_use', 'license_deal', 'subscription']),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  currency: z.string().default('RLUSD'),
  total_amount: z.number().positive(),
  milestones: z.array(milestoneSchema).min(1).max(10),
  deadline: z.string().nullable().default(null),
  retainer: z.object({
    monthly_amount: z.number().positive(),
    start_date: z.string(),
    duration_months: z.number().int().positive(),
    hours_per_month: z.number().positive().nullable().default(null),
  }).optional(),
  notes: z.string().max(3000).default(''),
});

const createProposalSchema = z.object({
  brief_id: z.string().uuid().nullable().default(null),
  counterparty_id: z.string().uuid(),        // the other party
  direction: z.enum(['cr_to_mk', 'mk_to_cr']),
  terms: termsSchema,
  message: z.string().max(3000).optional(),
});

/**
 * GET /api/proposals
 * List proposals for the current user (as CR or MK).
 * Query: ?status=pending&brief_id=UUID&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const briefId = searchParams.get('brief_id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('proposals')
      .select('*', { count: 'exact' })
      .or(`creator_id.eq.${session.user.id},marketplace_id.eq.${session.user.id}`)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (briefId) {
      query = query.eq('brief_id', briefId);
    }

    const { data: proposals, count, error } = await query;
    if (error) throw error;

    // Enrich with user info + latest round terms + brief
    if (proposals && proposals.length > 0) {
      const userIds = new Set<string>();
      const briefIds = new Set<string>();
      for (const p of proposals as any[]) {
        userIds.add(p.creator_id);
        userIds.add(p.marketplace_id);
        if (p.brief_id) briefIds.add(p.brief_id);
      }

      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, role')
        .in('id', Array.from(userIds));
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));

      // Get latest round for each proposal
      const proposalIds = proposals.map((p: any) => p.id);
      const { data: rounds } = await supabase
        .from('proposal_rounds')
        .select('*')
        .in('proposal_id', proposalIds)
        .order('round_number', { ascending: false });

      const latestRoundMap = new Map<string, any>();
      for (const r of (rounds || []) as any[]) {
        if (!latestRoundMap.has(r.proposal_id)) {
          latestRoundMap.set(r.proposal_id, r);
        }
      }

      // Get briefs if needed
      let briefMap = new Map<string, any>();
      if (briefIds.size > 0) {
        const { data: briefs } = await supabase
          .from('project_briefs')
          .select('id, title, category, status')
          .in('id', Array.from(briefIds));
        briefMap = new Map((briefs || []).map((b: any) => [b.id, b]));
      }

      for (const p of proposals as any[]) {
        p.creator = userMap.get(p.creator_id) || null;
        p.marketplace = userMap.get(p.marketplace_id) || null;
        p.latest_terms = latestRoundMap.get(p.id)?.terms || null;
        p.brief = p.brief_id ? briefMap.get(p.brief_id) || null : null;
      }
    }

    return NextResponse.json({
      proposals: proposals || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('[proposals/GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch proposals' }, { status: 500 });
  }
}

/**
 * POST /api/proposals
 * Create a new proposal (CR→MK on a brief, or MK→CR as direct offer).
 */
export async function POST(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createProposalSchema.parse(body);

    // Determine creator_id and marketplace_id based on direction
    let creator_id: string;
    let marketplace_id: string;

    if (parsed.direction === 'cr_to_mk') {
      creator_id = session.user.id;
      marketplace_id = parsed.counterparty_id;
    } else {
      marketplace_id = session.user.id;
      creator_id = parsed.counterparty_id;
    }

    // Validate counterparty exists
    const { data: counterparty } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', parsed.counterparty_id)
      .single();

    if (!counterparty) {
      return NextResponse.json({ error: 'Counterparty not found' }, { status: 404 });
    }

    // If responding to a brief, validate it's open
    if (parsed.brief_id) {
      const { data: brief } = await supabase
        .from('project_briefs')
        .select('id, status, author_id')
        .eq('id', parsed.brief_id)
        .single();

      if (!brief || brief.status !== 'open') {
        return NextResponse.json({ error: 'Brief is not open for proposals' }, { status: 400 });
      }

      // Brief author must be the marketplace party
      if (brief.author_id !== marketplace_id) {
        return NextResponse.json({ error: 'Brief author must be the marketplace party' }, { status: 400 });
      }
    }

    // Validate milestone amounts sum to total
    const milestoneSum = parsed.terms.milestones.reduce((sum, m) => sum + m.amount, 0);
    if (Math.abs(milestoneSum - parsed.terms.total_amount) > 0.01) {
      return NextResponse.json(
        { error: `Milestone amounts (${milestoneSum}) must equal total (${parsed.terms.total_amount})` },
        { status: 400 }
      );
    }

    // Create proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        brief_id: parsed.brief_id,
        creator_id,
        marketplace_id,
        direction: parsed.direction,
        status: 'pending',
        current_round: 1,
      })
      .select()
      .single();

    if (proposalError) throw proposalError;

    // Create first round with terms
    const { error: roundError } = await supabase
      .from('proposal_rounds')
      .insert({
        proposal_id: proposal.id,
        round_number: 1,
        author_id: session.user.id,
        terms: parsed.terms,
        message: parsed.message || null,
      });

    if (roundError) throw roundError;

    // If brief-based, update brief status
    if (parsed.brief_id) {
      await supabase
        .from('project_briefs')
        .update({ status: 'in_negotiation' })
        .eq('id', parsed.brief_id)
        .eq('status', 'open');
    }

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('[proposals/POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to create proposal' }, { status: 500 });
  }
}
