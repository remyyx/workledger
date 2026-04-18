export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import type { LicenseTerms } from '@/types';

/**
 * GET /api/contracts/[id]
 * Fetch a single contract with all milestones and related transactions.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractId = params.id;

    // Fetch contract with milestones
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        *,
        milestones (*)
      `)
      .eq('id', contractId)
      .single();

    if (error) {
      // Avoid masking real SQL/schema issues as a 404.
      console.error('[API] contracts/[id] select error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch contract.',
          ...(process.env.NODE_ENV !== 'production' ? { details: error.message } : {}),
        },
        { status: 500 }
      );
    }

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found.' },
        { status: 404 }
      );
    }

    // Verify user is a party to this contract
    const isCreator = contract.creator_id === session.user.id;
    const isMarketplace = contract.marketplace_id === session.user.id;
    if (!isCreator && !isMarketplace) {
      return NextResponse.json(
        { error: 'Contract not found.' },
        { status: 404 }
      );
    }

    // Sort milestones by sequence and map pow_nft_id → mcc_token_id for frontend types
    if (contract.milestones) {
      contract.milestones.sort((a: any, b: any) => a.sequence - b.sequence);
      contract.milestones = contract.milestones.map((m: any) => ({
        ...m,
        mcc_token_id: m.pow_nft_id ?? m.mcc_token_id ?? null,
      }));
    }

    // Fetch related transactions
    const { data: transactions } = await supabase
      .from('transaction_log')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    // Get counterparty display name (skip if marketplace_id is null — pending invite)
    const otherUserId = isCreator ? contract.marketplace_id : contract.creator_id;

    let otherUser = null;
    if (otherUserId) {
      const { data } = await supabase
        .from('users')
        .select('display_name, xrpl_address')
        .eq('id', otherUserId)
        .single();
      otherUser = data;
    }

    // Pending invite info from metadata
    const pendingInvite = contract.metadata?.pending_invite || false;
    const marketplaceEmail = contract.metadata?.marketplace_email || null;

    // Fetch minted MCCs for this contract's milestones from nft_registry
    const milestoneIds = (contract.milestones || [])
      .filter((m: any) => m.status === 'released')
      .map((m: any) => m.id);

    // Show the user's own MCC: T1 (Work Credential) for creators, T4 (Client Completion) for marketplace
    const preferredTaxon = isCreator ? 1 : 4;

    let mccs: Record<string, any> = {};
    if (milestoneIds.length > 0) {
      const { data: mccRows } = await supabase
        .from('nft_registry')
        .select('*')
        .in('milestone_id', milestoneIds);

      if (mccRows) {
        for (const row of mccRows) {
          const mapped = { ...row, mcc_token_id: row.nft_token_id };
          const existing = mccs[row.milestone_id];
          // Prefer the taxon matching the viewer's role
          if (!existing || (row.taxon === preferredTaxon && existing.taxon !== preferredTaxon)) {
            mccs[row.milestone_id] = mapped;
          }
        }
      }
    }

    return NextResponse.json({
      contract,
      transactions: transactions || [],
      counterparty: otherUser || (pendingInvite ? { display_name: marketplaceEmail, pending: true } : null),
      userRole: isCreator ? 'creator' : 'marketplace',
      mccs,
    });
  } catch (error) {
    console.error('[API] contracts/[id] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contract.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contracts/[id]
 * Partial update of a contract's mutable fields.
 * Currently supports: license_terms (JSON), title, description.
 * Only parties to the contract may update it.
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

    const contractId = params.id;

    // Verify user is a party before allowing writes
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('creator_id, marketplace_id')
      .eq('id', contractId)
      .single();

    if (fetchError || !contract) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
    }

    const isCreator = contract.creator_id === session.user.id;
    const isMarketplace = contract.marketplace_id === session.user.id;
    if (!isCreator && !isMarketplace) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
    }

    const body = await request.json();

    // Build allowed update payload — only whitelisted fields
    const update: Record<string, unknown> = {};

    if ('license_terms' in body) {
      // Accept null to clear, or a valid LicenseTerms object
      update.license_terms = body.license_terms;
    }
    if ('title' in body && typeof body.title === 'string') {
      update.title = body.title.trim();
    }
    if ('description' in body) {
      update.description = body.description;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('contracts')
      .update(update)
      .eq('id', contractId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] contracts/[id] PATCH error:', updateError);
      return NextResponse.json({ error: 'Failed to update contract.' }, { status: 500 });
    }

    return NextResponse.json({ contract: updated });
  } catch (error) {
    console.error('[API] contracts/[id] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update contract.' }, { status: 500 });
  }
}
