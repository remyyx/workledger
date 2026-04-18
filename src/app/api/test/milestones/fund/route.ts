import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { createSystemMessage } from '@/lib/contract-messages';

/**
 * POST /api/test/milestones/fund
 * Test-only helper: marks a milestone as funded without touching XRPL.
 *
 * Body: { contractId: string; milestoneId: string }
 *
 * This is only intended for local/test environments. In production it will refuse to run.
 */
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test funding is not available in production.' },
        { status: 403 },
      );
    }

    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contractId, milestoneId } = body as {
      contractId?: string;
      milestoneId?: string;
    };

    if (!contractId || !milestoneId) {
      return NextResponse.json(
        { error: 'contractId and milestoneId are required.' },
        { status: 400 },
      );
    }

    // Load contract + milestone
    const { data: contract } = await supabase
      .from('contracts')
      .select('*, milestones(*)')
      .eq('id', contractId)
      .single();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
    }

    const milestone = contract.milestones?.find((m: any) => m.id === milestoneId);
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
    }

    const isCreator = contract.creator_id === session.user.id;
    const isMarketplace = contract.marketplace_id === session.user.id;

    if (!isCreator && !isMarketplace) {
      return NextResponse.json(
        { error: 'Not authorized for this contract.' },
        { status: 403 },
      );
    }

    if (milestone.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot fund: milestone is ${milestone.status}, expected pending.` },
        { status: 400 },
      );
    }

    // Sequential funding: only allow funding the next milestone in sequence.
    // Previous milestones must be released before the next can be funded.
    const sortedMilestones = [...(contract.milestones as any[])].sort(
      (a: any, b: any) => a.sequence - b.sequence
    );
    const nextFundable = sortedMilestones.find(
      (m: any) => m.status === 'pending'
    );
    if (nextFundable && nextFundable.id !== milestoneId) {
      const blocking = sortedMilestones.find(
        (m: any) => m.sequence < milestone.sequence && m.status !== 'released'
      );
      if (blocking) {
        return NextResponse.json(
          { error: `Fund milestones in order. Complete "${blocking.title}" first.` },
          { status: 400 },
        );
      }
    }

    // Mark milestone as funded with a fake XRPL hash
    const fakeHash = `TEST_TX_${Date.now()}`;

    await supabase
      .from('milestones')
      .update({
        status: 'funded',
        escrow_tx_hash: fakeHash,
      })
      .eq('id', milestoneId);

    // If contract was draft, mark as funded
    if (contract.status === 'draft') {
      await supabase
        .from('contracts')
        .update({ status: 'funded' })
        .eq('id', contractId);
    }

    // Log a test transaction
    await supabase.from('transaction_log').insert({
      contract_id: contractId,
      milestone_id: milestone.id,
      tx_type: 'TestFund',
      tx_hash: fakeHash,
      status: 'confirmed',
      amount: milestone.amount.toString(),
      currency: contract.currency,
      metadata: { source: 'studioledger_test_balance' },
    } as any);

    // Timeline: escrow funded system message — awaited so it's in DB before frontend refetches
    await createSystemMessage({
      contractId,
      milestoneId: milestone.id,
      senderId: session.user.id,
      action: 'fund',
      content: `Escrow funded for milestone: ${milestone.title}`,
      metadata: { amount: String(milestone.amount), currency: contract.currency, tx_hash: fakeHash },
    }, supabase);

    return NextResponse.json({
      message: 'Milestone funded with StudioLedger test balance.',
      milestoneId,
      contractId,
      txHash: fakeHash,
    });
  } catch (error: any) {
    console.error('[API] test/milestones/fund error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fund milestone in test mode.' },
      { status: 500 },
    );
  }
}

