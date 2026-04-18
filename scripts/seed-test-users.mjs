#!/usr/bin/env node
// ============================================
// StudioLedger.ai — Seed 4 permanent virtual testers
// ============================================
// Creates 2 creators + 2 marketplace (client) profiles.
// Run: npm run seed:test-users  OR  node --env-file=.env.local scripts/seed-test-users.mjs

import { createClient } from '@supabase/supabase-js';
import { Wallet } from 'xrpl';

const VIRTUAL_TESTERS = [
  { email: 'creator1@test.studioledger.local', password: 'TestCreator1!', display: 'Creator 1 (virtual tester)', role: 'creator' },
  { email: 'creator2@test.studioledger.local', password: 'TestCreator2!', display: 'Creator 2 (virtual tester)', role: 'creator' },
  { email: 'marketplace1@test.studioledger.local', password: 'TestMarketplace1!', display: 'Marketplace 1 (virtual tester)', role: 'marketplace' },
  { email: 'marketplace2@test.studioledger.local', password: 'TestMarketplace2!', display: 'Marketplace 2 (virtual tester)', role: 'marketplace' },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.error('Run with: node --env-file=.env.local scripts/seed-test-users.mjs');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Seeding 4 permanent virtual testers (2 creators, 2 marketplace)...\n');

  for (const t of VIRTUAL_TESTERS) {
    const wallet = Wallet.generate();
    const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
      email: t.email,
      password: t.password,
      email_confirm: true,
    });

    if (authErr) {
      if (authErr.message?.includes('already been registered') || authErr.message?.includes('already registered')) {
        console.log(t.email, 'already exists; ensuring profile.');
        const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const u = list?.users?.find((x) => x.email === t.email);
        if (u) await upsertUser(supabase, u.id, t.email, t.display, t.role, wallet.classicAddress);
      } else {
        console.error(t.email, 'auth create failed:', authErr.message);
        process.exit(1);
      }
    } else if (auth?.user) {
      await upsertUser(supabase, auth.user.id, t.email, t.display, t.role, wallet.classicAddress);
      console.log(t.role + ':', t.email, '| password:', t.password);
    }
  }

  console.log('\nDone. 4 permanent virtual testers ready (see docs/CONTRACT_TEST_PLAN.md).');
}

async function upsertUser(supabase, id, email, displayName, role, xrplAddress) {
  const { error } = await supabase.from('users').upsert(
    {
      id,
      email,
      display_name: displayName,
      role,
      xrpl_address: xrplAddress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) {
    console.error('users upsert failed:', error.message);
    process.exit(1);
  }
}

main();
