export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';

/**
 * GET /api/dashboard/stats
 * Aggregated dashboard statistics for the authenticated user.
 * Returns: total earned, active contracts, escrow held, MCC count, avg rating, etc.
 */
export async function GET() {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Run all queries in parallel for speed
    const [
      contractsResult,
      milestonesResult,
      mccsResult,
      transactionsResult,
    ] = await Promise.all([
      // All user's contracts (as creator)
      supabase
        .from('contracts')
        .select('id, status, total_amount, currency')
        .eq('creator_id', userId),

      // All milestones across user's contracts
      supabase
        .from('milestones')
        .select('id, status, amount, contract_id')
        .in('contract_id', (
          await supabase
            .from('contracts')
            .select('id')
            .or(`creator_id.eq.${userId},marketplace_id.eq.${userId}`)
        ).data?.map(c => c.id) || []),

      // User's MCC tokens
      supabase
        .from('nft_registry')
        .select('id, taxon')
        .eq('owner', userId),

      // Incoming transactions (earned)
      supabase
        .from('transaction_log')
        .select('amount, currency, status')
        .eq('to_address', (
          await supabase
            .from('users')
            .select('xrpl_address')
            .eq('id', userId)
            .single()
        ).data?.xrpl_address || '')
        .eq('status', 'confirmed'),
    ]);

    const contracts = contractsResult.data || [];
    const milestones = milestonesResult.data || [];
    const mccs = mccsResult.data || [];
    const transactions = transactionsResult.data || [];

    // Calculate stats
    const activeContracts = contracts.filter(c =>
      ['active', 'funded', 'draft'].includes(c.status)
    ).length;

    const completedContracts = contracts.filter(c =>
      c.status === 'completed'
    ).length;

    // Released milestones = earned amount
    const releasedMilestones = milestones.filter(m => m.status === 'released');
    const totalEarned = releasedMilestones.reduce((sum, m) => sum + (m.amount || 0), 0);

    // Escrow held = funded + submitted milestones
    const escrowMilestones = milestones.filter(m =>
      ['funded', 'submitted', 'approved'].includes(m.status)
    );
    const escrowHeld = escrowMilestones.reduce((sum, m) => sum + (m.amount || 0), 0);

    // MCC counts by taxon
    const workCredentials = mccs.filter(n => n.taxon === 1).length;
    const licenses = mccs.filter(n => n.taxon === 2).length;
    const accessPasses = mccs.filter(n => n.taxon === 3).length;

    return NextResponse.json({
      stats: {
        totalEarned: totalEarned.toFixed(2),
        activeContracts,
        completedContracts,
        totalContracts: contracts.length,
        escrowHeld: escrowHeld.toFixed(2),
        mccs: {
          total: mccs.length,
          workCredentials,
          licenses,
          accessPasses,
        },
        completedJobs: releasedMilestones.length,
      },
    });
  } catch (error) {
    console.error('[API] dashboard/stats GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats.' },
      { status: 500 }
    );
  }
}
