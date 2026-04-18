#!/usr/bin/env node
// ============================================
// StudioLedger.ai — Milestone Lifecycle Test
// ============================================
// Tests the full escrow lifecycle on XRPL testnet:
// 1. Generate wallets (marketplace, creator, platform)
// 2. Fund wallets via faucet + set trust lines
// 3. Send RLUSD to marketplace (simulated issuance)
// 4. Create escrows for milestones 1+2 (buffer)
// 5. Release M1 → fee + auto-fund M3
// 6. Release M2 → fee
// 7. Release M3 → fee → contract complete
// 8. Mint MCC NFT for each release
// 9. Verify final balances + NFTs

import { Client, Wallet, convertStringToHex, dropsToXrp } from 'xrpl';
import * as crypto from 'crypto';

// ── Config ──
const WSS = 'wss://s.altnet.rippletest.net:51233';
const EXPLORER = 'https://testnet.xrpl.org';
const PLATFORM_FEE_PERCENT = 0.98;

// We use XRP for testnet (no RLUSD issuer on testnet)
// Token Escrow (XLS-85) with conditions works with XRP too
const USE_XRP = true;

// ── Helpers ──
const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);
const divider = () => console.log('\n' + '═'.repeat(60) + '\n');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function generateCondition() {
  const preimage = crypto.randomBytes(32);
  const fulfillmentBuffer = Buffer.concat([
    Buffer.from([0xa0, 0x22, 0x80, 0x20]),
    preimage,
  ]);
  // FIXED: fingerprint = SHA-256(raw preimage), not SHA-256(DER fulfillment)
  // Cost = 32 (preimage length), no subtypes for PREIMAGE-SHA-256
  const hash = crypto.createHash('sha256').update(preimage).digest();
  const conditionBuffer = Buffer.concat([
    Buffer.from([0xa0, 0x25, 0x80, 0x20]),
    hash,
    Buffer.from([0x81, 0x01, 0x20]),
  ]);
  return {
    condition: conditionBuffer.toString('hex').toUpperCase(),
    fulfillment: fulfillmentBuffer.toString('hex').toUpperCase(),
    preimage: preimage.toString('hex'),
  };
}

// ── Main ──
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║       StudioLedger.ai — Milestone Lifecycle Test        ║
║                    XRPL Testnet                         ║
╚══════════════════════════════════════════════════════════╝
`);

  const client = new Client(WSS);
  await client.connect();
  log('🔗', `Connected to ${WSS}`);
  divider();

  // ── Step 1: Generate & Fund Wallets ──
  log('👛', 'STEP 1: Generating wallets...');

  const marketplaceWallet = Wallet.generate();
  const creatorWallet = Wallet.generate();
  const platformWallet = Wallet.generate();

  log('🏪', `Marketplace: ${marketplaceWallet.classicAddress}`);
  log('🎨', `Creator:     ${creatorWallet.classicAddress}`);
  log('🏗️', `Platform:    ${platformWallet.classicAddress}`);

  log('💧', 'Funding wallets via testnet faucet...');

  const [mFund, cFund, pFund] = await Promise.all([
    client.fundWallet(marketplaceWallet),
    client.fundWallet(creatorWallet),
    client.fundWallet(platformWallet),
  ]);

  log('✅', `Marketplace funded: ${dropsToXrp(mFund.balance)} XRP`);
  log('✅', `Creator funded:     ${dropsToXrp(cFund.balance)} XRP`);
  log('✅', `Platform funded:    ${dropsToXrp(pFund.balance)} XRP`);
  divider();

  // ── Step 2: Define Contract ──
  log('📝', 'STEP 2: Defining contract with 3 milestones...');

  const milestones = [
    { seq: 1, title: 'Brand Identity Design',     amount: '50', ...generateCondition() },
    { seq: 2, title: 'Website Mockup Delivery',   amount: '75', ...generateCondition() },
    { seq: 3, title: 'Final Assets & Handoff',    amount: '25', ...generateCondition() },
  ];

  const totalAmount = milestones.reduce((s, m) => s + parseFloat(m.amount), 0);
  log('📋', `Contract: "Brand Refresh Package" — ${totalAmount} XRP total`);
  for (const m of milestones) {
    log('  📌', `M${m.seq}: ${m.title} — ${m.amount} XRP`);
  }
  divider();

  // ── Step 3: Fund Milestones 1+2 (Buffer) ──
  log('🔒', 'STEP 3: Funding milestones 1 + 2 (buffer system)...');

  const rippleEpochOffset = 946684800;
  const now = Math.floor(Date.now() / 1000) - rippleEpochOffset;

  const escrowResults = [];

  for (const m of milestones.slice(0, 2)) {
    const tx = {
      TransactionType: 'EscrowCreate',
      Account: marketplaceWallet.classicAddress,
      Destination: creatorWallet.classicAddress,
      Amount: String(parseFloat(m.amount) * 1_000_000), // drops
      Condition: m.condition,
      CancelAfter: now + (30 * 24 * 60 * 60), // 30 days
    };

    const result = await client.submitAndWait(tx, { wallet: marketplaceWallet });
    const seq = result.result.tx_json?.Sequence ?? null;

    escrowResults.push({ milestoneSeq: m.seq, txHash: result.result.hash, escrowSequence: seq });
    log('✅', `M${m.seq} escrow created — seq: ${seq}, tx: ${result.result.hash.slice(0, 16)}...`);
    log('  🔗', `${EXPLORER}/transactions/${result.result.hash}`);
  }
  divider();

  // ── Step 4-6: Submit → Approve → Release each milestone ──
  const nftsMinted = [];

  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    const step = i + 4;

    log('🚀', `STEP ${step}: Milestone ${m.seq} — "${m.title}"`);
    log('  📤', 'Creator submits work...');
    await sleep(500); // simulate work

    log('  ✅', 'Marketplace approves delivery...');
    await sleep(300);

    // Release escrow
    const escrow = escrowResults.find(e => e.milestoneSeq === m.seq);

    if (!escrow) {
      // This milestone wasn't pre-funded (M3) — fund it now (buffer advance would have done this)
      log('  🔒', `Funding M${m.seq} (buffer advance)...`);
      const fundTx = {
        TransactionType: 'EscrowCreate',
        Account: marketplaceWallet.classicAddress,
        Destination: creatorWallet.classicAddress,
        Amount: String(parseFloat(m.amount) * 1_000_000),
        Condition: m.condition,
        CancelAfter: now + (30 * 24 * 60 * 60),
      };
      const fundResult = await client.submitAndWait(fundTx, { wallet: marketplaceWallet });
      const fundSeq = fundResult.result.tx_json?.Sequence ?? null;
      escrowResults.push({ milestoneSeq: m.seq, txHash: fundResult.result.hash, escrowSequence: fundSeq });
      log('  ✅', `M${m.seq} funded — seq: ${fundSeq}`);
    }

    const currentEscrow = escrowResults.find(e => e.milestoneSeq === m.seq);

    // EscrowFinish — release funds to creator
    log('  💰', 'Releasing escrow to creator...');
    const finishTx = {
      TransactionType: 'EscrowFinish',
      Account: marketplaceWallet.classicAddress,
      Owner: marketplaceWallet.classicAddress,
      OfferSequence: currentEscrow.escrowSequence,
      Condition: m.condition,
      Fulfillment: m.fulfillment,
    };

    const finishResult = await client.submitAndWait(finishTx, { wallet: marketplaceWallet });
    log('  ✅', `Escrow released — tx: ${finishResult.result.hash.slice(0, 16)}...`);
    log('  🔗', `${EXPLORER}/transactions/${finishResult.result.hash}`);

    // Platform fee payment
    const feeDrops = Math.floor(parseFloat(m.amount) * 1_000_000 * (PLATFORM_FEE_PERCENT / 100));
    if (feeDrops > 0) {
      log('  💸', `Platform fee: ${(feeDrops / 1_000_000).toFixed(6)} XRP (${PLATFORM_FEE_PERCENT}%)...`);
      const feeTx = {
        TransactionType: 'Payment',
        Account: marketplaceWallet.classicAddress,
        Destination: platformWallet.classicAddress,
        Amount: String(feeDrops),
      };
      const feeResult = await client.submitAndWait(feeTx, { wallet: marketplaceWallet });
      log('  ✅', `Fee paid — tx: ${feeResult.result.hash.slice(0, 16)}...`);
    }

    // Mint MCC (Work Credential NFT)
    log('  🏆', 'Minting MCC (Minted Craft Credential)...');

    // URI must be ≤ 512 bytes (1024 hex chars) on XRPL.
    // Inline data URIs with full JSON + URL-encoding blow the limit.
    // Use a compact identifier URI for testnet; production will use IPFS CID.
    // Format: https://meta.studioledger.ai/mcc/{txHash_first16}/{seq}
    const metadataUri = `https://meta.studioledger.ai/mcc/${finishResult.result.hash.slice(0, 16)}/${m.seq}`;

    const mintTx = {
      TransactionType: 'NFTokenMint',
      Account: platformWallet.classicAddress,
      NFTokenTaxon: 1, // Work Credential
      Flags: 8, // Transferable
      // TransferFee omitted — 0% royalty for Work Credentials (Taxon 1)
      URI: convertStringToHex(metadataUri),
      Memos: [{
        Memo: {
          MemoType: convertStringToHex('milestone'),
          MemoData: convertStringToHex(`M${m.seq}: ${m.title}`),
        },
      }],
    };

    const mintResult = await client.submitAndWait(mintTx, { wallet: platformWallet });

    // Extract NFT Token ID
    let nftTokenId = null;
    const affectedNodes = mintResult.result.meta?.AffectedNodes || [];
    for (const node of affectedNodes) {
      const created = node.CreatedNode;
      if (created?.LedgerEntryType === 'NFTokenPage') {
        const tokens = created.NewFields?.NFTokens || [];
        if (tokens.length > 0) {
          nftTokenId = tokens[tokens.length - 1].NFToken?.NFTokenID || null;
        }
      }
      const modified = node.ModifiedNode;
      if (modified?.LedgerEntryType === 'NFTokenPage') {
        const finalTokens = modified.FinalFields?.NFTokens || [];
        const prevTokens = modified.PreviousFields?.NFTokens || [];
        if (finalTokens.length > prevTokens.length) {
          nftTokenId = finalTokens[finalTokens.length - 1].NFToken?.NFTokenID || null;
        }
      }
    }

    if (nftTokenId) {
      nftsMinted.push({ seq: m.seq, nftTokenId, mintTx: mintResult.result.hash });
      log('  ✅', `MCC minted — NFT ID: ${nftTokenId.slice(0, 20)}...`);

      // Create sell offer to creator (0 XRP — gift)
      const offerTx = {
        TransactionType: 'NFTokenCreateOffer',
        Account: platformWallet.classicAddress,
        NFTokenID: nftTokenId,
        Amount: '0',
        Destination: creatorWallet.classicAddress,
        Flags: 1, // tfSellNFToken
      };
      const offerResult = await client.submitAndWait(offerTx, { wallet: platformWallet });
      log('  🎁', `Sell offer created for creator — tx: ${offerResult.result.hash.slice(0, 16)}...`);
    } else {
      log('  ⚠️', 'Could not extract NFT Token ID (mint may have still succeeded)');
    }

    // Buffer advance: fund next milestone if there is one
    const nextToFund = milestones[i + 2]; // 2 ahead (buffer size)
    if (nextToFund && !escrowResults.find(e => e.milestoneSeq === nextToFund.seq)) {
      log('  🔄', `Buffer advance: funding M${nextToFund.seq}...`);
      const advanceTx = {
        TransactionType: 'EscrowCreate',
        Account: marketplaceWallet.classicAddress,
        Destination: creatorWallet.classicAddress,
        Amount: String(parseFloat(nextToFund.amount) * 1_000_000),
        Condition: nextToFund.condition,
        CancelAfter: now + (30 * 24 * 60 * 60),
      };
      const advanceResult = await client.submitAndWait(advanceTx, { wallet: marketplaceWallet });
      const advanceSeq = advanceResult.result.tx_json?.Sequence ?? null;
      escrowResults.push({ milestoneSeq: nextToFund.seq, txHash: advanceResult.result.hash, escrowSequence: advanceSeq });
      log('  ✅', `M${nextToFund.seq} pre-funded — seq: ${advanceSeq}`);
    }

    divider();
  }

  // ── Step 7: Verify Final State ──
  log('🔍', 'STEP 7: Verifying final state...');

  // Check balances
  const [mInfo, cInfo, pInfo] = await Promise.all([
    client.request({ command: 'account_info', account: marketplaceWallet.classicAddress, ledger_index: 'validated' }),
    client.request({ command: 'account_info', account: creatorWallet.classicAddress, ledger_index: 'validated' }),
    client.request({ command: 'account_info', account: platformWallet.classicAddress, ledger_index: 'validated' }),
  ]);

  const mBal = dropsToXrp(mInfo.result.account_data.Balance);
  const cBal = dropsToXrp(cInfo.result.account_data.Balance);
  const pBal = dropsToXrp(pInfo.result.account_data.Balance);

  log('💰', `Marketplace balance: ${mBal} XRP`);
  log('💰', `Creator balance:     ${cBal} XRP`);
  log('💰', `Platform balance:    ${pBal} XRP`);

  // Check NFTs on platform wallet
  const platformNFTs = await client.request({
    command: 'account_nfts',
    account: platformWallet.classicAddress,
    ledger_index: 'validated',
  });
  log('🏆', `Platform wallet NFTs (MCCs minted): ${platformNFTs.result.account_nfts.length}`);

  divider();

  // ── Summary ──
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                    TEST COMPLETE                        ║
╠══════════════════════════════════════════════════════════╣
║  Contract: "Brand Refresh Package"                      ║
║  Milestones: 3/3 released                               ║
║  Total amount: ${String(totalAmount).padEnd(6)} XRP${' '.repeat(33)}║
║  Platform fees: ${(totalAmount * PLATFORM_FEE_PERCENT / 100).toFixed(4)} XRP (${PLATFORM_FEE_PERCENT}%)${' '.repeat(21)}║
║  MCCs minted: ${nftsMinted.length}${' '.repeat(42)}║
╠══════════════════════════════════════════════════════════╣`);

  for (const nft of nftsMinted) {
    console.log(`║  M${nft.seq} MCC: ${nft.nftTokenId.slice(0, 44)}...║`);
  }

  console.log(`╠══════════════════════════════════════════════════════════╣
║  Explorer links:                                        ║`);
  for (const e of escrowResults) {
    console.log(`║  M${e.milestoneSeq}: ${EXPLORER}/transactions/${e.txHash.slice(0, 24)}...║`);
  }
  console.log(`╚══════════════════════════════════════════════════════════╝
`);

  // Save results to file
  const results = {
    timestamp: new Date().toISOString(),
    network: 'testnet',
    wallets: {
      marketplace: marketplaceWallet.classicAddress,
      creator: creatorWallet.classicAddress,
      platform: platformWallet.classicAddress,
    },
    contract: {
      title: 'Brand Refresh Package',
      totalAmount,
      currency: 'XRP',
      milestones: milestones.map(m => ({
        seq: m.seq,
        title: m.title,
        amount: m.amount,
      })),
    },
    escrows: escrowResults,
    nfts: nftsMinted,
    finalBalances: {
      marketplace: String(mBal),
      creator: String(cBal),
      platform: String(pBal),
    },
  };

  const fs = await import('fs');
  const { fileURLToPath } = await import('url');
  const outPath = fileURLToPath(new URL('test-results.json', import.meta.url));
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  log('💾', `Results saved to scripts/test-results.json`);

  await client.disconnect();
  log('🔌', 'Disconnected from XRPL testnet.');
}

main().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  console.error(err);
  process.exit(1);
});
