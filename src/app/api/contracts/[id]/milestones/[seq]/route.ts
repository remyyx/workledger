export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { generateCondition } from '@/lib/xrpl/escrow';
import { encryptFulfillment, decryptFulfillment } from '@/lib/crypto';
import {
  fundInitialMilestones,
  releaseMilestoneAndAdvance,
  getMilestonesToFund,
  isContractComplete,
} from '@/lib/xrpl/milestone-escrow';
import {
  createEscrowPayload,
  createEscrowFinishPayload,
  createPaymentPayload,
  getPayloadStatus,
} from '@/lib/xaman';
import { PLATFORM, RLUSD_ISSUER, RLUSD_CURRENCY } from '@/config/constants';
import { calcFeeBreakdown } from '@/lib/math';
import { mintCredentialsOnRelease } from '@/lib/xrpl/mint-credential';
import type { MintCredentialResult } from '@/lib/xrpl/mint-credential';
import { n8n } from '@/lib/n8n';
import {
  createSystemMessage,
  createDeliverableMessage,
  createApprovalMessage,
  createReleaseMessage,
} from '@/lib/contract-messages';
import { Wallet } from 'xrpl';
import { z } from 'zod';

/**
 * PATCH /api/contracts/[id]/milestones/[seq]
 * Milestone status transitions with XRPL escrow integration.
 *
 * Signing modes:
 *   1. Xaman (production): Frontend sends xamanPayloadUuid of a signed payload.
 *      We verify it server-side then update DB.
 *   2. Direct seed (testing only): Signs on server with wallet seed.
 *      Will be removed before mainnet launch.
 */

const transitionSchema = z.object({
  action: z.enum(['fund', 'submit', 'approve', 'release', 'dispute', 'request_changes']),
  deliverableHash: z.string().optional(),
  deliverableNotes: z.string().optional(),
  deliverableMediaUrl: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  deliverableDocUrl: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  // Xaman mode: UUID of a completed sign payload
  xamanPayloadUuid: z.string().optional(),
  // Direct mode (testing only): wallet seed for server-side signing
  walletSeed: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; seq: string } }
) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = transitionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const {
      action,
      deliverableHash,
      deliverableNotes,
      deliverableMediaUrl,
      deliverableDocUrl,
      walletSeed,
      xamanPayloadUuid,
    } = parsed.data;
    const contractId = params.id;
    const sequence = parseInt(params.seq);

    if (isNaN(sequence)) {
      return NextResponse.json({ error: 'Invalid sequence.' }, { status: 400 });
    }

    // Fetch contract + all milestones
    const { data: contract } = await supabase
      .from('contracts')
      .select('*, milestones(*)')
      .eq('id', contractId)
      .single();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
    }

    const milestone = contract.milestones?.find((m: any) => m.sequence === sequence);

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
    }

    // Determine user role
    const isCreator = contract.creator_id === session.user.id;
    const isMarketplace = contract.marketplace_id === session.user.id;

    if (!isCreator && !isMarketplace) {
      return NextResponse.json({ error: 'Not authorized for this contract.' }, { status: 403 });
    }

    switch (action) {
      // ─────────────────────────────────────────────
      // FUND — Marketplace funds milestones (buffer system)
      // ─────────────────────────────────────────────
      case 'fund': {
        if (!isMarketplace) {
          return NextResponse.json({ error: 'Only the marketplace can fund a milestone.' }, { status: 403 });
        }
        if (milestone.status !== 'pending') {
          return NextResponse.json(
            { error: `Cannot fund: milestone is ${milestone.status}, expected pending.` },
            { status: 400 }
          );
        }

        const milestonesToFund = getMilestonesToFund(
          contract.milestones.map((m: any) => ({ sequence: m.sequence, status: m.status }))
        );

        if (!milestonesToFund.includes(sequence)) {
          return NextResponse.json(
            { error: 'Buffer is full. This milestone will be funded automatically when earlier milestones are released.' },
            { status: 400 }
          );
        }

        const pendingMilestones = contract.milestones
          .filter((m: any) => milestonesToFund.includes(m.sequence))
          .map((m: any) => ({
            sequence: m.sequence,
            amount: m.amount.toString(),
            condition: m.condition,
            deadline: m.deadline,
          }));

        const { data: creator } = await supabase
          .from('users')
          .select('xrpl_address')
          .eq('id', contract.creator_id)
          .single();

        if (!creator?.xrpl_address) {
          return NextResponse.json(
            { error: 'Creator has no XRPL wallet configured.' },
            { status: 400 }
          );
        }

        // ── Xaman mode: verify completed payload ──
        if (xamanPayloadUuid) {
          try {
            const payloadStatus = await getPayloadStatus(xamanPayloadUuid);

            if (!payloadStatus.signed || !payloadStatus.txid) {
              return NextResponse.json(
                { error: 'Xaman payload was not signed.' },
                { status: 400 }
              );
            }

            await supabase
              .from('milestones')
              .update({
                status: 'funded',
                escrow_tx_hash: payloadStatus.txid,
              })
              .eq('contract_id', contractId)
              .eq('sequence', sequence);

            await supabase.from('transaction_log').insert({
              contract_id: contractId,
              milestone_id: milestone.id,
              tx_type: 'EscrowCreate',
              tx_hash: payloadStatus.txid,
              status: 'confirmed',
              amount: milestone.amount.toString(),
              currency: contract.currency,
              metadata: { signed_via: 'xaman', signer: payloadStatus.account },
            });

            if (contract.status === 'draft') {
              await supabase
                .from('contracts')
                .update({ status: 'funded' })
                .eq('id', contractId);
            }

            // Wire system message — awaited so it's in DB before frontend refetches
            await createSystemMessage({
              contractId: contract.id,
              milestoneId: milestone.id,
              senderId: session.user.id,
              action: 'fund',
              content: `Escrow funded for milestone: ${milestone.title}`,
              metadata: { amount: String(milestone.amount), currency: contract.currency, tx_hash: payloadStatus.txid || '' },
            }, supabase);

            return NextResponse.json({
              message: 'Milestone funded via Xaman.',
              funded: [sequence],
              xrpl: { txHash: payloadStatus.txid, signer: payloadStatus.account },
            });
          } catch (err: any) {
            console.error('[API] Xaman verification failed:', err);
            return NextResponse.json(
              { error: `Xaman verification failed: ${err.message}` },
              { status: 500 }
            );
          }
        }

        // ── Direct mode (testing): server signs ──
        let escrowResults: any[] = [];
        if (walletSeed) {
          try {
            const marketplaceWallet = Wallet.fromSeed(walletSeed);
            escrowResults = await fundInitialMilestones({
              marketplaceWallet,
              creatorAddress: creator.xrpl_address,
              milestones: pendingMilestones,
              currency: contract.currency,
            });
          } catch (err: any) {
            console.error('[API] XRPL escrow creation failed:', err);
            return NextResponse.json(
              { error: `XRPL escrow failed: ${err.message || 'Unknown error'}` },
              { status: 500 }
            );
          }
        }

        for (const ms of pendingMilestones) {
          const escrowResult = escrowResults.find((r) => r.milestoneSequence === ms.sequence);
          await supabase
            .from('milestones')
            .update({
              status: 'funded',
              escrow_tx_hash: escrowResult?.txHash || null,
              escrow_sequence: escrowResult?.escrowSequence || null,
            })
            .eq('contract_id', contractId)
            .eq('sequence', ms.sequence);

          if (escrowResult?.txHash) {
            await supabase.from('transaction_log').insert({
              contract_id: contractId,
              milestone_id: milestone.id,
              tx_type: 'EscrowCreate',
              tx_hash: escrowResult.txHash,
              status: 'confirmed',
              amount: ms.amount,
              currency: contract.currency,
            });
          }
        }

        if (contract.status === 'draft') {
          await supabase
            .from('contracts')
            .update({ status: 'funded' })
            .eq('id', contractId);
        }

        // Wire system messages for each funded milestone — awaited so they're in DB before frontend refetches
        for (const ms of pendingMilestones) {
          const escrowResult = escrowResults.find((r) => r.milestoneSequence === ms.sequence);
          await createSystemMessage({
            contractId: contract.id,
            milestoneId: milestone.id,
            senderId: session.user.id,
            action: 'fund',
            content: `Escrow funded for milestone: ${milestone.title}`,
            metadata: { amount: ms.amount, currency: contract.currency, tx_hash: escrowResult?.txHash || '' },
          }, supabase);
        }

        return NextResponse.json({
          message: `${pendingMilestones.length} milestone(s) funded.`,
          funded: pendingMilestones.map((m: { sequence: number }) => m.sequence),
          escrowResults: escrowResults.length > 0 ? escrowResults : undefined,
        });
      }

      // ─────────────────────────────────────────────
      // SUBMIT — Creator submits work
      // ─────────────────────────────────────────────
      case 'submit': {
        if (!isCreator) {
          return NextResponse.json({ error: 'Only the creator can submit work.' }, { status: 403 });
        }
        if (milestone.status !== 'funded') {
          return NextResponse.json(
            { error: `Cannot submit: milestone is ${milestone.status}, expected funded.` },
            { status: 400 }
          );
        }

        // Preserve existing deliverable data on resubmit — only overwrite if new values provided.
        // This prevents nulling out the original hash/URL when creator resubmits with just a note
        // (e.g. after a revision request). The MCC mint needs the deliverable proof intact.
        const submitUpdate: Record<string, unknown> = {
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          changes_requested_at: null, // Clear revision flag on resubmit
        };
        if (deliverableHash) submitUpdate.deliverable_hash = deliverableHash;
        if (deliverableNotes?.trim()) submitUpdate.deliverable_notes = deliverableNotes.trim();
        if (deliverableMediaUrl?.trim()) submitUpdate.deliverable_media_url = deliverableMediaUrl.trim();
        if (deliverableDocUrl?.trim()) submitUpdate.deliverable_doc_url = deliverableDocUrl.trim();

        const { error: submitErr } = await supabase
          .from('milestones')
          .update(submitUpdate)
          .eq('id', milestone.id);

        if (submitErr) {
          console.error('[API] milestone submit update error:', submitErr);
          return NextResponse.json(
            {
              error: 'Failed to submit work.',
              ...(process.env.NODE_ENV !== 'production' ? { details: submitErr.message } : {}),
            },
            { status: 500 }
          );
        }

        if (contract.status === 'funded') {
          const { error: contractActiveErr } = await supabase
            .from('contracts')
            .update({ status: 'active' })
            .eq('id', contractId);
          if (contractActiveErr) {
            console.error('[API] contract activate update error:', contractActiveErr);
          }
        }

        // Wire deliverable message — awaited so it's in DB before frontend refetches
        await createDeliverableMessage({
          contractId: contract.id,
          milestoneId: milestone.id,
          senderId: session.user.id,
          notes: deliverableNotes || null,
          mediaHash: null,
          docHash: deliverableHash || null,
          mediaUrl: deliverableMediaUrl || null,
          docUrl: deliverableDocUrl || null,
        }, supabase);

        // Notify marketplace via n8n: work is ready for review
        n8n.milestoneSubmitted({
          contractId,
          milestoneId: milestone.id,
          sequence,
          deliverableHash: deliverableHash || undefined,
          creatorId: contract.creator_id,
          marketplaceId: contract.marketplace_id,
        });

        return NextResponse.json({
          message: 'Work submitted for review.',
          milestone: { ...milestone, status: 'submitted', submitted_at: new Date().toISOString() },
        });
      }

      // ─────────────────────────────────────────────
      // APPROVE — Marketplace approves delivery
      // ─────────────────────────────────────────────
      case 'approve': {
        if (!isMarketplace) {
          return NextResponse.json({ error: 'Only the marketplace can approve work.' }, { status: 403 });
        }
        if (milestone.status !== 'submitted') {
          return NextResponse.json(
            { error: `Cannot approve: milestone is ${milestone.status}, expected submitted.` },
            { status: 400 }
          );
        }

        const { error: approveErr } = await supabase
          .from('milestones')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
          })
          .eq('id', milestone.id);

        if (approveErr) {
          console.error('[API] milestone approve update error:', approveErr);
          return NextResponse.json(
            {
              error: 'Failed to approve work.',
              ...(process.env.NODE_ENV !== 'production' ? { details: approveErr.message } : {}),
            },
            { status: 500 }
          );
        }

        // Wire approval message — awaited so it's in DB before frontend refetches
        await createApprovalMessage({
          contractId: contract.id,
          milestoneId: milestone.id,
          senderId: session.user.id,
          milestoneTitle: milestone.title,
        }, supabase);

        // Notify creator via n8n: work approved, payment incoming
        n8n.milestoneApproved({
          contractId,
          milestoneId: milestone.id,
          sequence,
          creatorId: contract.creator_id,
          marketplaceId: contract.marketplace_id,
        });

        return NextResponse.json({
          message: 'Work approved. Ready for release.',
          milestone: { ...milestone, status: 'approved', approved_at: new Date().toISOString() },
        });
      }

      // ─────────────────────────────────────────────
      // REQUEST CHANGES — Marketplace rejects delivery, creator can resubmit
      // MVP behavior: flip milestone back to `funded` and clear deliverable fields.
      // ─────────────────────────────────────────────
      case 'request_changes': {
        if (!isMarketplace) {
          return NextResponse.json({ error: 'Only the marketplace can request changes.' }, { status: 403 });
        }
        if (milestone.status !== 'submitted') {
          return NextResponse.json(
            { error: `Cannot request changes: milestone is ${milestone.status}, expected submitted.` },
            { status: 400 }
          );
        }

        const { error: reqErr } = await supabase
          .from('milestones')
          .update({
            status: 'funded',
            deliverable_hash: null,
            deliverable_notes: null,
            deliverable_media_url: null,
            deliverable_doc_url: null,
            changes_requested_at: new Date().toISOString(),
            submitted_at: null,
            approved_at: null,
          })
          .eq('id', milestone.id);

        if (reqErr) {
          console.error('[API] milestone request_changes update error:', reqErr);
          return NextResponse.json(
            {
              error: 'Failed to request modifications.',
              ...(process.env.NODE_ENV !== 'production' ? { details: reqErr.message } : {}),
            },
            { status: 500 }
          );
        }

        // Wire system message for request changes — awaited so it's in DB before frontend refetches
        await createSystemMessage({
          contractId: contract.id,
          milestoneId: milestone.id,
          senderId: session.user.id,
          action: 'request_changes',
          content: `Changes requested for milestone: ${milestone.title}`,
        }, supabase);

        return NextResponse.json({
          message: 'Modifications requested. Please submit again.',
          milestone: { ...milestone, status: 'funded', submitted_at: null, approved_at: null },
        });
      }

      // ─────────────────────────────────────────────
      // RELEASE — EscrowFinish + fee + next buffer
      // ─────────────────────────────────────────────
      case 'release': {
        if (!isMarketplace) {
          return NextResponse.json({ error: 'Only the marketplace buyer can release funds.' }, { status: 403 });
        }
        if (milestone.status !== 'approved') {
          return NextResponse.json(
            { error: `Cannot release: milestone is ${milestone.status}, expected approved.` },
            { status: 400 }
          );
        }

        let releaseTxHash: string | null = null;
        let feeTxHash: string | null = null;
        let nextEscrowTxHash: string | null = null;
        let nextEscrowSequence: number | null = null;

        // ── Xaman mode ──
        if (xamanPayloadUuid) {
          try {
            const payloadStatus = await getPayloadStatus(xamanPayloadUuid);

            if (!payloadStatus.signed || !payloadStatus.txid) {
              return NextResponse.json(
                { error: 'Xaman payload was not signed.' },
                { status: 400 }
              );
            }

            releaseTxHash = payloadStatus.txid;
            // Fee + next escrow are separate Xaman payloads
            // orchestrated by the frontend
          } catch (err: any) {
            console.error('[API] Xaman verification failed:', err);
            return NextResponse.json(
              { error: `Xaman verification failed: ${err.message}` },
              { status: 500 }
            );
          }
        }

        // ── Direct mode (testing) ──
        if (walletSeed && milestone.escrow_sequence && milestone.condition && milestone.fulfillment) {
          try {
            const signerWallet = Wallet.fromSeed(walletSeed);

            // Decrypt fulfillment — stored encrypted via AES-256-GCM
            const decryptedFulfillment = decryptFulfillment(milestone.fulfillment);

            const { data: creator } = await supabase
              .from('users')
              .select('xrpl_address, wallet_seed_encrypted')
              .eq('id', contract.creator_id)
              .single();

            const updatedStatuses = contract.milestones.map((m: any) => ({
              sequence: m.sequence,
              status: m.sequence === sequence ? 'released' : m.status,
            }));
            const nextToFund = getMilestonesToFund(updatedStatuses);
            const nextMilestoneSeq = nextToFund.length > 0 ? nextToFund[0] : null;

            let nextMilestoneData;
            if (nextMilestoneSeq && creator?.xrpl_address) {
              const nextMs = contract.milestones.find((m: any) => m.sequence === nextMilestoneSeq);
              if (nextMs) {
                nextMilestoneData = {
                  freelancerAddress: creator.xrpl_address,
                  amount: nextMs.amount.toString(),
                  condition: nextMs.condition,
                  deadline: nextMs.deadline,
                };
              }
            }

            const platformAddress = process.env.XRPL_PLATFORM_ADDRESS || '';

            const result = await releaseMilestoneAndAdvance({
              signerWallet,
              escrowOwner: signerWallet.classicAddress,
              escrowSequence: milestone.escrow_sequence,
              condition: milestone.condition,
              fulfillment: decryptedFulfillment,
              milestoneAmount: milestone.amount.toString(),
              nextMilestone: nextMilestoneData,
              currency: contract.currency,
              platformAddress,
              creatorEncryptedSeed: creator?.wallet_seed_encrypted || undefined,
            });

            releaseTxHash = result.releaseTxHash;
            feeTxHash = result.feeTxHash;
            nextEscrowTxHash = result.nextEscrowTxHash;
            nextEscrowSequence = result.nextEscrowSequence;

            if (nextMilestoneSeq && nextEscrowTxHash) {
              await supabase
                .from('milestones')
                .update({
                  status: 'funded',
                  escrow_tx_hash: nextEscrowTxHash,
                  escrow_sequence: nextEscrowSequence,
                })
                .eq('contract_id', contractId)
                .eq('sequence', nextMilestoneSeq);
            }
          } catch (err: any) {
            console.error('[API] XRPL release failed:', err);
            // Return immediately — never update DB if XRPL failed
            return NextResponse.json(
              { error: `XRPL release failed: ${err.message}` },
              { status: 500 }
            );
          }
        }

        // Guard: XRPL must confirm before DB is written.
        // releaseTxHash is set by Xaman (verified payload) or direct mode (signed tx).
        // If neither path ran (or both failed), we must not mark as released.
        if (!releaseTxHash) {
          return NextResponse.json(
            { error: 'No XRPL release transaction confirmed. DB not updated.' },
            { status: 400 }
          );
        }

        await supabase
          .from('milestones')
          .update({
            status: 'released',
            released_at: new Date().toISOString(),
            release_tx_hash: releaseTxHash,
          })
          .eq('id', milestone.id);

        if (releaseTxHash) {
          await supabase.from('transaction_log').insert({
            contract_id: contractId,
            milestone_id: milestone.id,
            tx_type: 'EscrowFinish',
            tx_hash: releaseTxHash,
            status: 'confirmed',
            amount: milestone.amount.toString(),
            currency: contract.currency,
            metadata: xamanPayloadUuid ? { signed_via: 'xaman' } : undefined,
          });
        }
        if (feeTxHash) {
          const { platformFee: feeAmount } = calcFeeBreakdown(milestone.amount, PLATFORM.FEE_PERCENT);
          await supabase.from('transaction_log').insert({
            contract_id: contractId,
            milestone_id: milestone.id,
            tx_type: 'Payment',
            tx_hash: feeTxHash,
            status: 'confirmed',
            amount: feeAmount,
            currency: contract.currency,
            metadata: { type: 'platform_fee', percent: PLATFORM.FEE_PERCENT },
          });
        }

        const allMilestones = contract.milestones.map((m: any) => ({
          status: m.sequence === sequence ? 'released' : m.status,
        }));
        const contractCompleted = isContractComplete(allMilestones);

        if (contractCompleted) {
          await supabase
            .from('contracts')
            .update({ status: 'completed' })
            .eq('id', contractId);
        }

        // Wire release message — awaited so it's in DB before frontend refetches
        await createReleaseMessage({
          contractId: contract.id,
          milestoneId: milestone.id,
          senderId: session.user.id,
          amount: String(milestone.amount),
          currency: contract.currency,
          txHash: releaseTxHash || '',
          milestoneTitle: milestone.title,
        }, supabase);

        // ── Auto-mint MCCs: Creator (T1) + Client (T4) ──
        // Platform wallet mints both, then offers to each party at 0 cost.
        // Non-blocking: if mint fails, release still succeeds.
        let mccResults: MintCredentialResult = { creator: null, client: null };
        try {
          // Fetch both parties' XRPL addresses in parallel
          const [{ data: creatorUser }, { data: clientUser }] = await Promise.all([
            supabase.from('users').select('xrpl_address, display_name').eq('id', contract.creator_id).single(),
            supabase.from('users').select('xrpl_address, display_name').eq('id', contract.marketplace_id).single(),
          ]);

          if (creatorUser?.xrpl_address) {
            // Fetch latest deliverable submission to capture delivery doc & files
            let deliveryDoc: string | undefined;
            let deliverableFiles: Array<{ name: string; format?: string; role?: string; notes?: string }> | undefined;
            try {
              const { data: submissions } = await supabase
                .from('contract_messages')
                .select('metadata')
                .eq('contract_id', contractId)
                .eq('milestone_id', milestone.id)
                .eq('type', 'deliverable_submit')
                .order('created_at', { ascending: false })
                .limit(1);
              const latestMeta = (submissions?.[0]?.metadata as any) || {};
              deliveryDoc = latestMeta.delivery_doc || undefined;
              deliverableFiles = latestMeta.deliverable_files || undefined;
            } catch {
              // Non-blocking — mint without doc/files
            }

            mccResults = await mintCredentialsOnRelease({
              // Parties
              creatorAddress: creatorUser.xrpl_address,
              creatorName: creatorUser.display_name || undefined,
              clientAddress: clientUser?.xrpl_address || undefined,
              clientName: clientUser?.display_name || undefined,
              // Contract
              contractId,
              contractTitle: contract.title || 'Untitled',
              contractHash: contract.contract_hash || undefined,
              // Milestone
              milestoneId: milestone.id,
              milestoneSequence: sequence,
              milestoneTitle: milestone.title || `Milestone ${sequence}`,
              // Deliverable — captured preview at mint time
              deliverableHash: milestone.deliverable_hash || null,
              deliverableMediaUrl: milestone.deliverable_media_url || null,
              // Payment
              amount: milestone.amount.toString(),
              currency: contract.currency,
              // Escrow
              releaseTxHash,
              escrowTxHash: milestone.escrow_tx_hash || null,
              escrowSequence: milestone.escrow_sequence || null,
              // Work
              workCategory: undefined,
              // Delivery document & files (from latest submission)
              deliveryDoc,
              deliverableFiles,
            });

            const platformAddress = process.env.XRPL_PLATFORM_ADDRESS || '';

            // Record Creator MCC (Taxon 1) in nft_registry
            if (mccResults.creator?.nftTokenId) {
              await supabase.from('nft_registry').insert({
                nft_token_id: mccResults.creator.nftTokenId,
                taxon: 1,
                issuer: platformAddress,
                owner: creatorUser.xrpl_address,
                contract_id: contractId,
                milestone_id: milestone.id,
                metadata_uri: '',
                metadata_cache: mccResults.creator.metadata || {},
                mint_tx_hash: mccResults.creator.mintTxHash,
              } as any);
            }

            // Record Client MCC (Taxon 4) in nft_registry
            if (mccResults.client?.nftTokenId && clientUser?.xrpl_address) {
              await supabase.from('nft_registry').insert({
                nft_token_id: mccResults.client.nftTokenId,
                taxon: 4,
                issuer: platformAddress,
                owner: clientUser.xrpl_address,
                contract_id: contractId,
                milestone_id: milestone.id,
                metadata_uri: '',
                metadata_cache: mccResults.client.metadata || {},
                mint_tx_hash: mccResults.client.mintTxHash,
              } as any);
            }
          }
        } catch (mccErr: any) {
          // Non-blocking: log but don't fail the release
          console.error('[API] MCC auto-mint failed (non-blocking):', mccErr.message);
        }

        // Notify both parties via n8n: funds released
        n8n.milestoneReleased({
          contractId,
          milestoneId: milestone.id,
          sequence,
          amount: milestone.amount.toString(),
          currency: contract.currency,
          txHash: releaseTxHash || '',
          creatorId: contract.creator_id,
          marketplaceId: contract.marketplace_id,
          contractCompleted,
        });

        // Notify MCC minted (if applicable)
        if (mccResults.creator?.nftTokenId) {
          n8n.mccMinted({
            contractId,
            milestoneId: milestone.id,
            creatorId: contract.creator_id,
            creatorAddress: mccResults.creator?.nftTokenId ? '' : '',
            nftTokenId: mccResults.creator.nftTokenId,
            mintTxHash: mccResults.creator.mintTxHash,
          });
        }

        return NextResponse.json({
          message: 'Funds released to creator.',
          milestone: { ...milestone, status: 'released', released_at: new Date().toISOString() },
          contractCompleted,
          xrpl: { releaseTxHash, feeTxHash, nextEscrowTxHash, nextEscrowSequence },
          mcc: {
            creator: mccResults.creator ? {
              tokenId: mccResults.creator.nftTokenId,
              mintTxHash: mccResults.creator.mintTxHash,
              offerTxHash: mccResults.creator.offerTxHash,
            } : undefined,
            client: mccResults.client ? {
              tokenId: mccResults.client.nftTokenId,
              mintTxHash: mccResults.client.mintTxHash,
              offerTxHash: mccResults.client.offerTxHash,
            } : undefined,
          },
        });
      }

      // ─────────────────────────────────────────────
      // DISPUTE — Either party raises a dispute
      // ─────────────────────────────────────────────
      case 'dispute': {
        if (!['funded', 'submitted', 'approved'].includes(milestone.status)) {
          return NextResponse.json(
            { error: `Cannot dispute: milestone is ${milestone.status}.` },
            { status: 400 }
          );
        }

        await supabase.from('milestones').update({ status: 'disputed' }).eq('id', milestone.id);

        const { data: disputeData, error: disputeErr } = await supabase
          .from('disputes')
          .insert({
            contract_id: contractId,
            milestone_id: milestone.id,
            raised_by: session.user.id,
            reason: body.reason || 'Dispute raised by user.',
            status: 'open',
          })
          .select('id')
          .single();

        if (disputeErr) {
          console.error('[API] dispute insert error:', disputeErr);
        }

        const disputeId = disputeData?.id || '';

        await supabase.from('contracts').update({ status: 'disputed' }).eq('id', contractId);

        // Wire system message for dispute — awaited so it's in DB before frontend refetches
        await createSystemMessage({
          contractId: contract.id,
          milestoneId: milestone.id,
          senderId: session.user.id,
          action: 'dispute_open',
          content: `Dispute opened for milestone: ${milestone.title}. Reason: ${body.reason || 'Not specified'}`,
        }, supabase);

        // Trigger n8n dispute pipeline: notify other party, start 7-day timer
        n8n.disputeOpened({
          contractId,
          milestoneId: milestone.id,
          disputeId,
          raisedBy: session.user.id,
          creatorId: contract.creator_id,
          marketplaceId: contract.marketplace_id,
          amount: milestone.amount.toString(),
          currency: contract.currency,
        });

        return NextResponse.json({
          message: 'Dispute opened.',
          milestone: { ...milestone, status: 'disputed' },
          disputeId,
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] milestones PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update milestone.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/[id]/milestones/[seq]
 * Create a Xaman sign payload for a milestone action.
 *
 * The frontend calls this to get a QR code + WebSocket URL,
 * then calls PATCH with the signed payload UUID.
 *
 * Actions:
 *   fund    → EscrowCreate payload
 *   release → EscrowFinish payload
 *   fee     → Payment payload (platform fee)
 */
const payloadRequestSchema = z.object({
  action: z.enum(['fund', 'release', 'fee']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; seq: string } }
) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = payloadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { action } = parsed.data;
    const contractId = params.id;
    const sequence = parseInt(params.seq);

    const { data: contract } = await supabase
      .from('contracts')
      .select('*, milestones(*)')
      .eq('id', contractId)
      .single();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
    }

    const milestone = contract.milestones?.find((m: any) => m.sequence === sequence);
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
    }

    const { data: creator } = await supabase
      .from('users')
      .select('xrpl_address')
      .eq('id', contract.creator_id)
      .single();

    const currency = contract.currency || RLUSD_CURRENCY;
    const issuer = RLUSD_ISSUER;
    const rippleEpochOffset = 946684800;

    switch (action) {
      case 'fund': {
        if (!creator?.xrpl_address) {
          return NextResponse.json({ error: 'Creator has no XRPL wallet.' }, { status: 400 });
        }

        let condition = milestone.condition;
        if (!condition) {
          const cond = generateCondition();
          condition = cond.condition;
          await supabase
            .from('milestones')
            .update({ condition: cond.condition, fulfillment: encryptFulfillment(cond.fulfillment) })
            .eq('id', milestone.id);
        }

        const now = Math.floor(Date.now() / 1000) - rippleEpochOffset;
        const cancelAfter = now + (30 * 24 * 60 * 60);

        const payload = await createEscrowPayload({
          destination: creator.xrpl_address,
          amount: milestone.amount.toString(),
          currency,
          issuer,
          condition,
          cancelAfter,
          contractId,
          milestoneSequence: sequence,
          instruction: `Fund milestone ${sequence}: ${milestone.amount} ${currency}`,
        });

        return NextResponse.json({
          payloadUuid: payload.uuid,
          qr_png: payload.refs.qr_png,
          deeplink: payload.next.always,
          websocket: payload.refs.websocket_status,
          action: 'fund',
          milestone: sequence,
        });
      }

      case 'release': {
        if (!milestone.escrow_sequence || !milestone.condition || !milestone.fulfillment) {
          return NextResponse.json(
            { error: 'Milestone escrow data incomplete.' },
            { status: 400 }
          );
        }

        const { data: marketplaceUser } = await supabase
          .from('users')
          .select('xrpl_address')
          .eq('id', contract.marketplace_id)
          .single();

        // Decrypt fulfillment — stored encrypted via AES-256-GCM
        const decryptedFulfillmentXaman = decryptFulfillment(milestone.fulfillment);

        const payload = await createEscrowFinishPayload({
          escrowOwner: marketplaceUser?.xrpl_address || '',
          escrowSequence: milestone.escrow_sequence,
          condition: milestone.condition,
          fulfillment: decryptedFulfillmentXaman,
          contractId,
          instruction: `Release milestone ${sequence}: ${milestone.amount} ${currency}`,
        });

        return NextResponse.json({
          payloadUuid: payload.uuid,
          qr_png: payload.refs.qr_png,
          deeplink: payload.next.always,
          websocket: payload.refs.websocket_status,
          action: 'release',
          milestone: sequence,
        });
      }

      case 'fee': {
        const platformAddress = process.env.XRPL_PLATFORM_ADDRESS;
        if (!platformAddress) {
          return NextResponse.json({ error: 'Platform address not configured.' }, { status: 500 });
        }

        const { platformFee: feeAmount } = calcFeeBreakdown(milestone.amount, PLATFORM.FEE_PERCENT);

        const payload = await createPaymentPayload({
          destination: platformAddress,
          amount: feeAmount,
          currency,
          issuer,
          instruction: `Platform fee: ${feeAmount} ${currency} (${PLATFORM.FEE_PERCENT}%)`,
        });

        return NextResponse.json({
          payloadUuid: payload.uuid,
          qr_png: payload.refs.qr_png,
          deeplink: payload.next.always,
          websocket: payload.refs.websocket_status,
          action: 'fee',
          milestone: sequence,
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API] Xaman payload creation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create sign payload.' },
      { status: 500 }
    );
  }
}
