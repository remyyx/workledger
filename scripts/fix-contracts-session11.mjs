#!/usr/bin/env node
// ============================================
// Session 11 — Delete "Brand Identity Package" + Create 3 new CR1↔MK1 contracts
// ============================================
// Run: node --env-file=.env.local scripts/fix-contracts-session11.mjs

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const CREATOR_EMAIL = 'creator1@test.studioledger.local';
const MARKETPLACE_EMAIL = 'marketplace1@test.studioledger.local';

function generateCondition() {
  const preimage = crypto.randomBytes(32);
  const fulfillmentBuffer = Buffer.concat([
    Buffer.from([0xa0, 0x22, 0x80, 0x20]),
    preimage,
  ]);
  const hash = crypto.createHash('sha256').update(preimage).digest();
  const conditionBuffer = Buffer.concat([
    Buffer.from([0xa0, 0x25, 0x80, 0x20]),
    hash,
    Buffer.from([0x81, 0x01, 0x20]),
  ]);
  return {
    condition: conditionBuffer.toString('hex').toUpperCase(),
    fulfillment: fulfillmentBuffer.toString('hex').toUpperCase(),
  };
}

const NEW_CONTRACTS = [
  {
    template: 'milestone',
    title: 'E-Commerce Platform Redesign',
    description: 'Full redesign of online store — UX audit, new design system, responsive build, and launch support.',
    currency: 'RLUSD',
    totalAmount: 8500,
    milestones: [
      { title: 'UX Audit & Wireframes', amount: 2000 },
      { title: 'Design System & UI Kit', amount: 2500 },
      { title: 'Frontend Build', amount: 3000 },
      { title: 'QA & Launch Support', amount: 1000 },
    ],
  },
  {
    template: 'fixed_price',
    title: 'Brand Identity Package',
    description: 'Logo, color palette, typography, and brand guidelines for a Web3 startup.',
    currency: 'RLUSD',
    totalAmount: 2200,
    milestones: [
      { title: 'Brand Identity Delivery', amount: 2200 },
    ],
  },
  {
    template: 'milestone',
    title: 'Mobile App Prototype',
    description: 'Interactive Figma prototype for iOS fitness tracking app — 12 screens, onboarding flow, dashboard.',
    currency: 'RLUSD',
    totalAmount: 4800,
    milestones: [
      { title: 'Research & User Flows', amount: 1200 },
      { title: 'Hi-Fi Screens (12)', amount: 2400 },
      { title: 'Interactive Prototype & Handoff', amount: 1200 },
    ],
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing env vars. Run: node --env-file=.env.local scripts/fix-contracts-session11.mjs');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look up users
  const { data: creator } = await supabase.from('users').select('id').eq('email', CREATOR_EMAIL).single();
  const { data: marketplace } = await supabase.from('users').select('id').eq('email', MARKETPLACE_EMAIL).single();

  if (!creator?.id || !marketplace?.id) {
    console.error('Users not found. Run seed-test-users.mjs first.');
    process.exit(1);
  }

  console.log('Creator 1:', creator.id);
  console.log('Marketplace 1:', marketplace.id);

  // ── DELETE "Brand Identity Package" that's NOT linked to Marketplace 1 ──
  const { data: oldContracts, error: findErr } = await supabase
    .from('contracts')
    .select('id, title, marketplace_id')
    .eq('title', 'Brand Identity Package')
    .neq('marketplace_id', marketplace.id);

  if (findErr) {
    console.error('Find error:', findErr.message);
  } else if (oldContracts && oldContracts.length > 0) {
    for (const c of oldContracts) {
      // Delete milestones first (FK constraint)
      await supabase.from('milestones').delete().eq('contract_id', c.id);
      // Delete messages
      await supabase.from('contract_messages').delete().eq('contract_id', c.id);
      // Delete contract
      const { error: delErr } = await supabase.from('contracts').delete().eq('id', c.id);
      if (delErr) {
        console.error('Delete failed for', c.title, ':', delErr.message);
      } else {
        console.log('Deleted:', c.title, '(marketplace_id was', c.marketplace_id, ')');
      }
    }
  } else {
    console.log('No orphaned "Brand Identity Package" found to delete.');
  }

  // ── CREATE 3 new contracts ──
  const FEE_RATE = 0.0098;

  for (const c of NEW_CONTRACTS) {
    const platformFee = c.totalAmount * FEE_RATE;

    const { data: contract, error: contractErr } = await supabase
      .from('contracts')
      .insert({
        creator_id: creator.id,
        marketplace_id: marketplace.id,
        template: c.template,
        title: c.title,
        description: c.description,
        status: 'draft',
        currency: c.currency,
        total_amount: c.totalAmount,
        platform_fee: platformFee,
        metadata: { marketplace_email: MARKETPLACE_EMAIL },
      })
      .select('id')
      .single();

    if (contractErr || !contract) {
      console.error('Contract insert failed:', c.title, contractErr?.message);
      continue;
    }

    const milestoneInserts = c.milestones.map((m, idx) => {
      const { condition, fulfillment } = generateCondition();
      return {
        contract_id: contract.id,
        sequence: idx + 1,
        title: m.title,
        amount: m.amount,
        deadline: null,
        status: 'pending',
        condition,
        fulfillment,
      };
    });

    const { error: msErr } = await supabase.from('milestones').insert(milestoneInserts);
    if (msErr) {
      console.error('Milestones failed for', c.title, ':', msErr.message);
      continue;
    }

    console.log('Created:', c.title, `(${c.template}, ${c.totalAmount} ${c.currency}, ${c.milestones.length} milestones)`);
  }

  console.log('\nDone. Contracts updated for CR1 ↔ MK1.');
}

main();
