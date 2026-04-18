#!/usr/bin/env node
// ============================================
// StudioLedger.ai — Seed 6 virtual contracts (1 per type)
// ============================================
// Run after seed-test-users.mjs. Creates 6 draft contracts for creator1 ↔ marketplace1.
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Run: npm run seed:virtual-contracts  OR  node --env-file=.env.local scripts/seed-virtual-contracts.mjs

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

const CONTRACTS = [
  {
    template: 'fixed_price',
    title: 'Virtual test: Logo design',
    description: 'Single deliverable, one payment.',
    totalAmount: 500,
    milestones: [{ title: 'Final logo delivery', amount: 500, deadline: null }],
  },
  {
    template: 'milestone',
    title: 'Virtual test: Website build',
    description: 'Design → build → launch.',
    totalAmount: 6000,
    milestones: [
      { title: 'Design', amount: 2000, deadline: null },
      { title: 'Build', amount: 2500, deadline: null },
      { title: 'Launch', amount: 1500, deadline: null },
    ],
  },
  {
    template: 'retainer',
    title: 'Virtual test: Monthly social content',
    description: 'Recurring monthly.',
    totalAmount: 1200,
    milestones: [{ title: 'Cycle 1', amount: 1200, deadline: null }],
    metadata: { retainer: { monthly_amount: 1200, start_date: '2025-04-01', duration_months: 0, hours_per_month: 20 } },
  },
  {
    template: 'pay_per_use',
    title: 'Virtual test: Per-track license',
    description: 'Payment per unit.',
    totalAmount: 100,
    milestones: [{ title: 'Per unit', amount: 100, deadline: null }],
  },
  {
    template: 'license_deal',
    title: 'Virtual test: Music sync license',
    description: 'Rights-based license.',
    totalAmount: 2000,
    milestones: [{ title: 'License fee', amount: 2000, deadline: null }],
    license_terms: {
      rights: 'Sync, broadcast',
      territory: 'World',
      duration: '2 years',
      exclusivity: 'non-exclusive',
      modifications_allowed: true,
      sublicensing: false,
      transferable: false,
      royalty_percent: 0,
      revocation_conditions: 'None',
    },
  },
  {
    template: 'subscription',
    title: 'Virtual test: Monthly template pack',
    description: 'Recurring access.',
    totalAmount: 29,
    milestones: [{ title: 'Month 1', amount: 29, deadline: null }],
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.error('Run after seed:test-users. Example: node --env-file=.env.local scripts/seed-virtual-contracts.mjs');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: creator } = await supabase.from('users').select('id').eq('email', CREATOR_EMAIL).single();
  const { data: marketplace } = await supabase.from('users').select('id').eq('email', MARKETPLACE_EMAIL).single();

  if (!creator?.id || !marketplace?.id) {
    console.error('Run seed:test-users first so creator1 and marketplace1 exist.');
    process.exit(1);
  }

  console.log('Seeding 6 virtual contracts (1 per template) for', CREATOR_EMAIL, '↔', MARKETPLACE_EMAIL, '...\n');

  const feePercent = 0.005891;
  for (const c of CONTRACTS) {
    const platformFee = c.totalAmount * feePercent;
    const { data: contract, error: contractErr } = await supabase
      .from('contracts')
      .insert({
        creator_id: creator.id,
        marketplace_id: marketplace.id,
        template: c.template,
        title: c.title,
        description: c.description,
        status: 'draft',
        currency: 'RLUSD',
        total_amount: c.totalAmount,
        platform_fee: platformFee,
        license_terms: c.license_terms || null,
        metadata: c.metadata || null,
      })
      .select('id')
      .single();

    if (contractErr || !contract) {
      console.error('Contract insert failed:', c.template, contractErr?.message);
      process.exit(1);
    }

    const milestoneInserts = c.milestones.map((m, idx) => {
      const { condition, fulfillment } = generateCondition();
      return {
        contract_id: contract.id,
        sequence: idx + 1,
        title: m.title,
        amount: m.amount,
        deadline: m.deadline,
        status: 'pending',
        condition,
        fulfillment,
      };
    });

    const { error: msErr } = await supabase.from('milestones').insert(milestoneInserts);
    if (msErr) {
      console.error('Milestones insert failed:', c.template, msErr.message);
      process.exit(1);
    }
    console.log('Created:', c.template, '—', c.title);
  }

  console.log('\nDone. 6 virtual contracts seeded. View in app as creator1 or marketplace1.');
}

main();
