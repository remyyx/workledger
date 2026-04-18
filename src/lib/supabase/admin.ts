// ============================================
// Supabase Admin Client — Service Role
// ============================================
// Use this ONLY for admin operations that require elevated access:
// - Creating users (auth.admin.createUser)
// - Bypassing RLS
//
// NEVER use this in client-side code or expose to the browser.
// The service role key has FULL database access.

import { createClient } from '@supabase/supabase-js';

let adminClient: ReturnType<typeof createClient> | null = null;

export function createAdminSupabase() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
