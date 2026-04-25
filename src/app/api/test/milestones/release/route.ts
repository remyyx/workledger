import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { PLATFORM, MCC_TAXONS } from '@/config/constants';
import { calcFeeBreakdown } from '@/lib/math';
import { randomUUID } from 'crypto';
import { createSystemMessage } from '@/lib/contract-messages';

/**
 * POST /api/test/milestones/release
 * Test-only: marks an approved milestone as released (no XRPL),
 * then mock-mints MCCs into nft_registry so the full pipeline
 * works end-to-end in local dev.
 *
 * Body: { contractId: string; milestoneId: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test release is not available in production.' },
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

    if (milestone.status !== 'approved') {
      return NextResponse.json(
        { error: `Cannot release: milestone is ${milestone.status}, expected approved.` },
        { status: 400 },
      );
    }

    const isTestFunded =
      milestone.escrow_tx_hash && String(milestone.escrow_tx_hash).startsWith('TEST_TX_');
    if (!isTestFunded) {
      return NextResponse.json(
        { error: 'This milestone was not test-funded. Use Release Funds (Xaman) for real escrow.' },
        { status: 400 },
      );
    }

    // ── 1. Release the milestone ──────────────────────────────────────────

    const releaseHash = `TEST_RELEASE_${Date.now()}`;
    const { platformFee: feeAmount } = calcFeeBreakdown(milestone.amount, PLATFORM.FEE_PERCENT);

    await supabase
      .from('milestones')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
      })
      .eq('id', milestoneId);

    // Log release transaction
    await supabase.from('transaction_log').insert({
      contract_id: contractId,
      milestone_id: milestone.id,
      tx_type: 'TestRelease',
      tx_hash: releaseHash,
      from_address: 'test_balance',
      to_address: null,
      status: 'confirmed',
      amount: milestone.amount.toString(),
      currency: contract.currency,
    });

    // Log platform fee transaction
    await supabase.from('transaction_log').insert({
      contract_id: contractId,
      milestone_id: milestone.id,
      tx_type: 'TestPlatformFee',
      tx_hash: `TEST_FEE_${Date.now()}`,
      from_address: 'test_balance',
      to_address: null,
      status: 'confirmed',
      amount: feeAmount,
      currency: contract.currency,
    });

    // Timeline: release system message — awaited so it's in DB before frontend refetches
    await createSystemMessage({
      contractId,
      milestoneId: milestone.id,
      senderId: session.user.id,
      action: 'release',
      content: `Funds released for milestone: ${milestone.title}`,
      metadata: { amount: String(milestone.amount), currency: contract.currency, tx_hash: releaseHash, fee: feeAmount },
    }, supabase);

    // ── 2. Mock-mint MCCs (Creator T1 + Client T4) ────────────────────────
    // Mirrors the real flow in milestones/[seq] PATCH release action,
    // but writes fake token IDs instead of calling XRPL.

    let mccsMinted = 0;
    try {
      // Fetch both parties' info
      const [{ data: creatorUser }, { data: clientUser }] = await Promise.all([
        supabase.from('users').select('xrpl_address, display_name').eq('id', contract.creator_id).single(),
        supabase.from('users').select('xrpl_address, display_name').eq('id', contract.marketplace_id).single(),
      ]);

      const milestoneSeq = milestone.sequence || 1;
      const now = new Date().toISOString();

      // Use placeholder address for test users without XRPL wallets (until testnet)
      const creatorAddress = creatorUser?.xrpl_address || 'rTEST_CREATOR_NO_WALLET';
      const clientAddress = clientUser?.xrpl_address || 'rTEST_CLIENT_NO_WALLET';

      // Shared metadata for both MCCs
      const sharedMeta = {
        work_title: contract.title || 'Untitled',
        milestone_sequence: milestoneSeq,
        deliverable_hash: milestone.deliverable_hash || undefined,
        deliverable_media_url: milestone.deliverable_media_url || undefined,
        payment_amount: milestone.amount.toString(),
        payment_currency: contract.currency,
        escrow_tx_hash: milestone.escrow_tx_hash || undefined,
        release_tx_hash: releaseHash,
        creator_name: creatorUser?.display_name || undefined,
        client_name: clientUser?.display_name || undefined,
        creator_address: creatorAddress,
        delivery_date: now.slice(0, 10),
      };

      // Creator Work Credential (Taxon 1)
      {
        const creatorTokenId = `TEST_MCC_T1_${randomUUID().replace(/-/g, '').toUpperCase().slice(0, 16)}`;
        const creatorMintHash = `TEST_MINT_T1_${Date.now()}`;

        const { error: t1Err } = await supabase.from('nft_registry').insert({
          nft_token_id: creatorTokenId,
          taxon: MCC_TAXONS.WORK_CREDENTIAL,
          issuer: 'TEST_PLATFORM_ISSUER',
          owner: creatorAddress,
          contract_id: contractId,
          milestone_id: milestoneId,
          metadata_uri: '',
          metadata_cache: {
            name: `${milestone.title || 'Milestone'} — ${contract.title}`,
            description: `Work Credential for milestone ${milestoneSeq} in "${contract.title}". Test mint — no XRPL transaction.`,
            image: 'gradient:orange-red',
            ...sharedMeta,
          },
          mint_tx_hash: creatorMintHash,
        } as any);

        if (t1Err) {
          console.error('[test-release] Creator MCC insert failed:', t1Err.message);
        } else {
          mccsMinted++;
          console.log(`[test-release] Creator MCC minted: ${creatorTokenId} → ${creatorAddress}`);
        }
      }

      // Client Completion Record (Taxon 4)
      {
        const clientTokenId = `TEST_MCC_T4_${randomUUID().replace(/-/g, '').toUpperCase().slice(0, 16)}`;
        const clientMintHash = `TEST_MINT_T4_${Date.now()}`;

        const { error: t4Err } = await supabase.from('nft_registry').insert({
          nft_token_id: clientTokenId,
          taxon: MCC_TAXONS.CLIENT_COMPLETION,
          issuer: 'TEST_PLATFORM_ISSUER',
          owner: clientAddress,
          contract_id: contractId,
          milestone_id: milestoneId,
          metadata_uri: '',
          metadata_cache: {
            name: `${contract.title} — Project Completion`,
            description: `Verified completion record for "${contract.title}". Test mint — no XRPL transaction.`,
            image: 'gradient:pastel-blue',
            ...sharedMeta,
          },
          mint_tx_hash: clientMintHash,
        } as any);

        if (t4Err) {
          console.error('[test-release] Client MCC insert failed:', t4Err.message);
        } else {
          mccsMinted++;
          console.log(`[test-release] Client MCC minted: ${clientTokenId} → ${clientAddress}`);
        }
      }
    } catch (mccErr: any) {
      // Non-blocking — release still succeeds even if mock-mint fails
      console.error('[test-release] Mock MCC mint failed (non-blocking):', mccErr.message);
    }

    // ── 3. Complete contract if all milestones released ────────────────────

    const milestones = (contract.milestones as any[]) || [];
    const releasedBefore = milestones.filter((m: any) => m.status === 'released').length;
    const allReleased = releasedBefore + 1 >= milestones.length;
    if (allReleased) {
      await supabase
        .from('contracts')
        .update({ status: 'completed' })
        .eq('id', contractId);

      // Timeline: contract completed — awaited
      await createSystemMessage({
        contractId,
        senderId: session.user.id,
        action: 'contract_completed',
        content: `All milestones released. Contract fulfilled.`,
        metadata: { total_amount: String(contract.total_amount), currency: contract.currency },
      }, supabase);
    }

    return NextResponse.json({
      message: `Milestone released (test). ${mccsMinted} MCC(s) minted. Funds and platform fee recorded.`,
      milestoneId,
      contractId,
      contractCompleted: allReleased,
      releaseTxHash: releaseHash,
      mccsMinted,
    });
  } catch (error: any) {
    console.error('[API] test/milestones/release error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to release milestone in test mode.' },
      { status: 500 },
    );
  }
}
