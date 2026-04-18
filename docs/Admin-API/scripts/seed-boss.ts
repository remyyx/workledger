/**
 * Seed Boss Account Script
 *
 * Run with: npx tsx scripts/seed-boss.ts
 * Or:       npx ts-node scripts/seed-boss.ts
 *
 * Creates the first admin account: remy@studioledger.ai (role: boss)
 * Safe to re-run — skips if account already exists.
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

// ─── Config ──────────────────────────────────────────────────────

const BOSS_EMAIL = 'remy@studioledger.ai'
const BOSS_NAME = 'Remy Ruozzi'
const BOSS_ROLE = 'boss'
const BCRYPT_ROUNDS = 12

// ─── Load env ────────────────────────────────────────────────────

// Load .env.local if running outside Next.js
try {
  require('dotenv').config({ path: '.env.local' })
} catch {
  // dotenv not installed — assume env vars are already set
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Make sure .env.local is configured.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Password prompt ─────────────────────────────────────────────

function promptPassword(): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(`Enter password for ${BOSS_EMAIL}: `, (answer) => {
      rl.close()
      if (!answer || answer.length < 8) {
        reject(new Error('Password must be at least 8 characters'))
      }
      resolve(answer)
    })
  })
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('🔐 StudioLedger Admin — Seed Boss Account')
  console.log('─'.repeat(45))

  // Check if already exists
  const { data: existing } = await supabase
    .from('admin_accounts')
    .select('id, email, role')
    .eq('email', BOSS_EMAIL)
    .single()

  if (existing) {
    console.log(`✅ Boss account already exists: ${existing.email} (${existing.role})`)
    console.log('   Skipping. To reset password, use the admin dashboard.')
    process.exit(0)
  }

  // Get password
  let password: string

  // Allow password via env var for CI/scripted setups
  if (process.env.ADMIN_SEED_PASSWORD) {
    password = process.env.ADMIN_SEED_PASSWORD
    console.log('   Using password from ADMIN_SEED_PASSWORD env var')
  } else {
    password = await promptPassword()
  }

  // Hash password
  console.log('   Hashing password (bcrypt, 12 rounds)...')
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  // Insert boss account
  const { data: account, error } = await supabase
    .from('admin_accounts')
    .insert({
      email: BOSS_EMAIL,
      display_name: BOSS_NAME,
      role: BOSS_ROLE,
      password_hash: passwordHash,
      is_active: true,
    })
    .select('id, email, display_name, role, created_at')
    .single()

  if (error) {
    console.error('❌ Failed to create boss account:', error.message)
    if (error.message.includes('admin_accounts_email_domain_check')) {
      console.error('   Email domain check failed — must be @studioledger.ai')
    }
    process.exit(1)
  }

  console.log('')
  console.log('✅ Boss account created:')
  console.log(`   Email:    ${account.email}`)
  console.log(`   Name:     ${account.display_name}`)
  console.log(`   Role:     ${account.role}`)
  console.log(`   ID:       ${account.id}`)
  console.log(`   Created:  ${account.created_at}`)
  console.log('')
  console.log('🔑 Login at: /admin/login')
  console.log('   POST /api/admin/login { email, password }')

  // Write initial audit log entry
  await supabase
    .from('admin_audit_log')
    .insert({
      admin_id: account.id,
      action: 'account_created',
      resource: 'admin_accounts',
      resource_id: account.id,
      details: { method: 'seed_script', role: BOSS_ROLE },
      ip_address: 'seed-script',
    })

  console.log('   Audit log entry written.')
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
