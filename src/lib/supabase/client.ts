// ============================================
// Supabase Client — Database & Auth
// ============================================
// Supabase = PostgreSQL database + authentication + real-time
// It's like Firebase but open-source and SQL-based.

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 * Use this in React components and client-side code.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
