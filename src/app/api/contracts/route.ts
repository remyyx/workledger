export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { generateCondition } from '@/lib/xrpl/escrow';
import { encryptFulfillment } from '@/lib/crypto';
import { PLATFORM } from '@/config/constants';
import { calculatePlatformFee } from '@/lib/fees';
import { createSystemMessage } from '@/lib/contract-messages';
import { z } from 'zod';

/**
 * GET /api/contracts
 * List contracts for the authenticated user (as creator or marketplace).
 * Query params: ?status=active&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Look up user email for metadata-based matching (draft contracts with pending invite)
    const { data: currentUser } = await supabase
      .from('users')
      .select('email')
      .eq('id', session.user.id)
      .single();
    const userEmail = currentUser?.email || '';

    // Contracts where user is creator OR marketplace (by ID or by email in metadata)
    let query = supabase
      .from('contracts')
      .select('*, milestones(*)', { count: 'exact' })
      .or(`creator_id.eq.${session.user.id},marketplace_id.eq.${session.user.id},metadata->>marketplace_email.eq.${userEmail}`)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: contracts, error, count } = await query;

    if (error) {
      console.error('[API] contracts list error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contracts.' },
        { status: 500 }
      );
    }

    // Backfill: auto-link marketplace_id on contracts matched by email but missing the ID
    if (contracts && userEmail) {
      const unlinked = contracts.filter(
        (c: any) => !c.marketplace_id && c.metadata?.marketplace_email === userEmail && c.creator_id !== session.user.id
      );
      for (const c of unlinked) {
        await supabase
          .from('contracts')
          .update({ marketplace_id: session.user.id })
          .eq('id', c.id);
        c.marketplace_id = session.user.id; // Update in-memory too
      }
    }

    // Resolve counterparty display names for each contract
    const enriched = contracts || [];
    if (enriched.length > 0) {
      const counterpartyIds = new Set<string>();
      for (const c of enriched as any[]) {
        if (c.creator_id && c.creator_id !== session.user.id) counterpartyIds.add(c.creator_id);
        if (c.marketplace_id && c.marketplace_id !== session.user.id) counterpartyIds.add(c.marketplace_id);
      }
      if (counterpartyIds.size > 0) {
        const admin = createAdminSupabase();
        const { data: counterparties } = await admin
          .from('users')
          .select('id, display_name')
          .in('id', Array.from(counterpartyIds));
        const nameMap: Record<string, string> = {};
        for (const u of (counterparties || []) as any[]) {
          nameMap[u.id] = u.display_name;
        }
        for (const c of enriched as any[]) {
          c.creator_name = nameMap[c.creator_id] || null;
          c.marketplace_name = nameMap[c.marketplace_id] || null;
        }
      }
    }

    return NextResponse.json({
      contracts: enriched,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[API] contracts GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contracts.' },
      { status: 500 }
    );
  }
}

// Validation schema for contract creation
const createContractSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  template: z.enum(['fixed_price', 'milestone', 'retainer', 'pay_per_use', 'license_deal', 'subscription']),
  marketplaceEmail: z.string().email(),
  currency: z.enum(['XRP', 'RLUSD', 'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'USDC', 'USDT']),
  totalAmount: z.number().positive(),
  milestones: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional().default(''),
    amount: z.number().positive(),
    deadline: z.string().optional(),
  })).min(1),
  retainer: z.object({
    monthlyAmount: z.number().positive(),
    startDate: z.string(),
    durationMonths: z.number().min(0),
    hoursPerMonth: z.number().positive().optional(),
  }).optional(),
  licenseTerms: z.object({
    rights: z.string(),
    territory: z.string(),
    duration: z.string(),
    exclusivity: z.enum(['exclusive', 'non-exclusive']),
    modifications_allowed: z.boolean(),
    sublicensing: z.boolean(),
    transferable: z.boolean(),
    royalty_percent: z.number().min(0).max(50),
    revocation_conditions: z.string(),
  }).optional(),
});

/**
 * POST /api/contracts
 * Create a new contract with milestones.
 * Generates escrow conditions for each milestone.
 */
export async function POST(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createContractSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, description, template, marketplaceEmail, currency, totalAmount, milestones, licenseTerms, retainer } = parsed.data;

    // Verify milestone amounts sum to total (skip for retainer — totalAmount = monthly rate)
    if (template !== 'retainer') {
      const milestoneSum = milestones.reduce((sum, m) => sum + m.amount, 0);
      if (Math.abs(milestoneSum - totalAmount) > 0.01) {
        return NextResponse.json(
          { error: 'Milestone amounts must equal the total contract amount.' },
          { status: 400 }
        );
      }
    }

    // Look up the counterparty by email (bypasses RLS — server-side lookup)
    const admin = createAdminSupabase();
    const { data: counterpartyUser } = await admin
      .from('users')
      .select('id, role')
      .eq('email', marketplaceEmail)
      .single();

    // Look up current user's role to determine contract role assignment
    const { data: currentUserProfile } = await admin
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const currentRole = (currentUserProfile as any)?.role || 'creator';

    // Calculate platform fee
    const { platformFee } = calculatePlatformFee(totalAmount);

    const counterpartyId = (counterpartyUser as { id: string } | null)?.id || null;
    const pendingInvite = !counterpartyUser;

    // Role assignment:
    // - If current user is 'creator' → they are creator_id, counterparty is marketplace_id (buyer)
    // - If current user is 'marketplace' → they are marketplace_id (buyer), counterparty is creator_id
    // - If 'both' → default to creator (they initiated the contract as service provider)
    const isCurrentUserMarketplace = currentRole === 'marketplace';
    const creatorId = isCurrentUserMarketplace ? counterpartyId : session.user.id;
    const marketplaceId = isCurrentUserMarketplace ? session.user.id : counterpartyId;

    // Create the contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        creator_id: creatorId,
        marketplace_id: marketplaceId,
        template,
        title,
        description,
        status: 'draft',
        currency,
        total_amount: totalAmount,
        platform_fee: platformFee,
        license_terms: licenseTerms || null,
        metadata: {
          marketplace_email: marketplaceEmail,
          ...(pendingInvite && { pending_invite: true }),
          ...(retainer && {
            retainer: {
              monthly_amount: retainer.monthlyAmount,
              start_date: retainer.startDate,
              duration_months: retainer.durationMonths,
              hours_per_month: retainer.hoursPerMonth || null,
            },
          }),
        },
      })
      .select()
      .single();

    if (contractError || !contract) {
      console.error('[API] contract insert error:', contractError);
      return NextResponse.json(
        { error: 'Failed to create contract.' },
        { status: 500 }
      );
    }

    // Create milestones with escrow conditions
    const milestoneInserts = milestones.map((m, idx) => {
      const { condition, fulfillment } = generateCondition();
      return {
        contract_id: contract.id,
        sequence: idx + 1,
        title: m.title,
        description: m.description,
        amount: m.amount,
        deadline: m.deadline || null,
        status: 'pending',
        condition,
        fulfillment: encryptFulfillment(fulfillment), // AES-256-GCM encrypted before storage
      };
    });

    const { data: createdMilestones, error: msError } = await supabase
      .from('milestones')
      .insert(milestoneInserts)
      .select('id, sequence, title, amount, deadline, status');

    if (msError) {
      console.error('[API] milestone insert error:', msError);
      // Contract was created but milestones failed — flag for cleanup
      return NextResponse.json(
        { error: 'Contract created but milestone setup failed.' },
        { status: 500 }
      );
    }

    // ── Timeline: contract_created system message ──────────────────────────
    // Look up creator display name for the message content
    const { data: creatorProfile } = await admin
      .from('users')
      .select('display_name')
      .eq('id', session.user.id)
      .single();
    const creatorName = (creatorProfile as any)?.display_name || 'Creator';

    // Awaited so messages are in DB before frontend loads the contract
    await createSystemMessage({
      contractId: contract.id,
      senderId: session.user.id,
      action: 'contract_created',
      content: `Contract created by ${creatorName}`,
      metadata: { template, totalAmount, currency },
    }, supabase);

    // ── Timeline: invitation_sent system message ───────────────────────────
    await createSystemMessage({
      contractId: contract.id,
      senderId: session.user.id,
      action: 'invitation_sent',
      content: pendingInvite
        ? `Invitation sent to ${marketplaceEmail} — awaiting signup`
        : `${marketplaceEmail} added to contract`,
      metadata: { marketplace_email: marketplaceEmail, pending_invite: pendingInvite },
    }, supabase);

    return NextResponse.json({
      contract: {
        ...contract,
        milestones: createdMilestones,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[API] contracts POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create contract.' },
      { status: 500 }
    );
  }
}
