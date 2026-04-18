export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { generateCondition } from '@/lib/xrpl/escrow';
import { encryptFulfillment } from '@/lib/crypto';
import { calculatePlatformFee } from '@/lib/fees';
import { createSystemMessage } from '@/lib/contract-messages';
import { z } from 'zod';

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

/**
 * GET /api/proposals/[id]
 * Fetch a single proposal with all rounds.
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

    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Verify user is a party
    if (proposal.creator_id !== session.user.id && proposal.marketplace_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all rounds
    const { data: rounds } = await supabase
      .from('proposal_rounds')
      .select('*')
      .eq('proposal_id', proposal.id)
      .order('round_number', { ascending: true });

    // Fetch user details
    const { data: users } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, role')
      .in('id', [proposal.creator_id, proposal.marketplace_id]);

    const userMap = new Map((users || []).map((u: any) => [u.id, u]));

    // Fetch brief if applicable
    let brief = null;
    if (proposal.brief_id) {
      const { data } = await supabase
        .from('project_briefs')
        .select('*')
        .eq('id', proposal.brief_id)
        .single();
      brief = data;
    }

    const latestRound = rounds && rounds.length > 0 ? rounds[rounds.length - 1] : null;

    return NextResponse.json({
      proposal: {
        ...proposal,
        creator: userMap.get(proposal.creator_id) || null,
        marketplace: userMap.get(proposal.marketplace_id) || null,
        rounds: rounds || [],
        latest_terms: latestRound?.terms || null,
        brief,
      },
    });
  } catch (error: any) {
    console.error('[proposals/[id]/GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch proposal' }, { status: 500 });
  }
}

/**
 * PATCH /api/proposals/[id]
 * Actions: counter, accept, decline, withdraw
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, supabase } = await getSessionOrDev();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action as string;

    // Fetch proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Verify user is a party
    const userId = session.user.id;
    const isCreator = proposal.creator_id === userId;
    const isMarketplace = proposal.marketplace_id === userId;
    if (!isCreator && !isMarketplace) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- COUNTER ---
    if (action === 'counter') {
      if (proposal.status !== 'pending' && proposal.status !== 'countered') {
        return NextResponse.json({ error: 'Proposal is not open for counter-offers' }, { status: 400 });
      }

      // Get the latest round to check it wasn't authored by the same user
      const { data: latestRounds } = await supabase
        .from('proposal_rounds')
        .select('author_id')
        .eq('proposal_id', proposal.id)
        .order('round_number', { ascending: false })
        .limit(1);

      if (latestRounds && latestRounds.length > 0 && latestRounds[0].author_id === userId) {
        return NextResponse.json({ error: 'Cannot counter your own offer — wait for the other party' }, { status: 400 });
      }

      const parsed = termsSchema.parse(body.terms);
      const message = (body.message as string) || null;

      // Validate milestone amounts
      const milestoneSum = parsed.milestones.reduce((sum, m) => sum + m.amount, 0);
      if (Math.abs(milestoneSum - parsed.total_amount) > 0.01) {
        return NextResponse.json(
          { error: `Milestone amounts (${milestoneSum}) must equal total (${parsed.total_amount})` },
          { status: 400 }
        );
      }

      const newRound = proposal.current_round + 1;

      // Insert new round
      const { error: roundError } = await supabase
        .from('proposal_rounds')
        .insert({
          proposal_id: proposal.id,
          round_number: newRound,
          author_id: userId,
          terms: parsed,
          message,
        });

      if (roundError) throw roundError;

      // Update proposal
      const { error: updateError } = await supabase
        .from('proposals')
        .update({ status: 'countered', current_round: newRound })
        .eq('id', proposal.id);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true, round: newRound, status: 'countered' });
    }

    // --- ACCEPT ---
    if (action === 'accept') {
      if (proposal.status !== 'pending' && proposal.status !== 'countered') {
        return NextResponse.json({ error: 'Proposal is not open for acceptance' }, { status: 400 });
      }

      // Get the latest round — can only accept the other party's terms
      const { data: latestRounds } = await supabase
        .from('proposal_rounds')
        .select('*')
        .eq('proposal_id', proposal.id)
        .order('round_number', { ascending: false })
        .limit(1);

      if (!latestRounds || latestRounds.length === 0) {
        return NextResponse.json({ error: 'No terms to accept' }, { status: 400 });
      }

      const latestRound = latestRounds[0] as any;
      if (latestRound.author_id === userId) {
        return NextResponse.json({ error: 'Cannot accept your own offer — wait for the other party to respond' }, { status: 400 });
      }

      const terms = latestRound.terms as any;

      // Create the contract from agreed terms
      const feeBreakdown = calculatePlatformFee(terms.total_amount);

      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          creator_id: proposal.creator_id,
          marketplace_id: proposal.marketplace_id,
          template: terms.template,
          title: terms.title,
          description: terms.description,
          status: 'draft',
          currency: terms.currency,
          total_amount: terms.total_amount,
          platform_fee: parseFloat(feeBreakdown.platformFee),
          metadata: {
            proposal_id: proposal.id,
            retainer: terms.retainer || null,
          },
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Create milestones with escrow conditions
      for (const m of terms.milestones as any[]) {
        const { condition, fulfillment } = generateCondition();
        await supabase.from('milestones').insert({
          contract_id: contract.id,
          sequence: m.sequence,
          title: m.title,
          description: m.description || '',
          amount: m.amount,
          deadline: m.deadline,
          status: 'pending',
          condition,
          fulfillment: encryptFulfillment(fulfillment), // AES-256-GCM encrypted before storage
        });
      }

      // Create system messages on the contract
      await createSystemMessage({
        contractId: contract.id,
        milestoneId: null,
        action: 'contract_created',
        content: `Contract created from ${proposal.direction === 'cr_to_mk' ? 'proposal' : 'direct offer'} (${proposal.current_round} negotiation round${proposal.current_round > 1 ? 's' : ''}).`,
        metadata: {
          proposal_id: proposal.id,
          rounds: proposal.current_round,
        },
      });

      // Update proposal status
      await supabase
        .from('proposals')
        .update({ status: 'accepted', contract_id: contract.id })
        .eq('id', proposal.id);

      // If brief-based, mark brief as filled
      if (proposal.brief_id) {
        await supabase
          .from('project_briefs')
          .update({ status: 'filled' })
          .eq('id', proposal.brief_id);
      }

      return NextResponse.json({
        success: true,
        status: 'accepted',
        contract_id: contract.id,
      });
    }

    // --- DECLINE ---
    if (action === 'decline') {
      if (proposal.status !== 'pending' && proposal.status !== 'countered') {
        return NextResponse.json({ error: 'Proposal is not open' }, { status: 400 });
      }

      await supabase
        .from('proposals')
        .update({ status: 'declined' })
        .eq('id', proposal.id);

      return NextResponse.json({ success: true, status: 'declined' });
    }

    // --- WITHDRAW ---
    if (action === 'withdraw') {
      if (proposal.status === 'accepted' || proposal.status === 'declined' || proposal.status === 'withdrawn') {
        return NextResponse.json({ error: 'Proposal is already closed' }, { status: 400 });
      }

      await supabase
        .from('proposals')
        .update({ status: 'withdrawn' })
        .eq('id', proposal.id);

      return NextResponse.json({ success: true, status: 'withdrawn' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('[proposals/[id]/PATCH]', error);
    return NextResponse.json({ error: error.message || 'Failed to update proposal' }, { status: 500 });
  }
}
