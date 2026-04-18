// ============================================
// Dev Session Helper
// ============================================
// Returns a mock session in dev mode when SKIP_AUTH is enabled.
// Reads the in-memory dev user store to determine which test user to impersonate.
// Defaults to first creator if no selection made.
// In production, always returns the real session.

import { createServerSupabase } from './server';
import { createAdminSupabase } from './admin';
import { getDevUserEmailServer } from './dev-user-store';

interface DevSession {
  user: { id: string; email?: string };
}

/**
 * Get authenticated session — with dev-mode fallback.
 * When NEXT_PUBLIC_SKIP_AUTH=true in development:
 *   - Reads in-memory dev user store to pick which test user to impersonate
 *   - Defaults to first creator user if no selection made
 * Returns null if no session and not in dev-skip mode.
 */
export async function getSessionOrDev(): Promise<{
  session: DevSession | null;
  supabase: ReturnType<typeof createServerSupabase>;
}> {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    return { session, supabase };
  }

  // Dev-mode bypass: impersonate a test user
  const isDevSkip = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    && process.env.NODE_ENV === 'development';

  if (isDevSkip) {
    try {
      const admin = createAdminSupabase();
      const devEmail = getDevUserEmailServer();

      let query = admin
        .from('users')
        .select('id, email')
        .limit(1)
        .single();

      if (devEmail) {
        // Impersonate specific user by email
        query = admin
          .from('users')
          .select('id, email')
          .eq('email', devEmail)
          .limit(1)
          .single();
      } else {
        // Default: first creator
        query = admin
          .from('users')
          .select('id, email')
          .eq('role', 'creator')
          .limit(1)
          .single();
      }

      const { data: devUser, error: devError } = await query;

      if (devError) {
        console.warn('[dev-session] DB query failed:', devError.message, '| email:', devEmail || '(none)');
      }

      if (devUser) {
        const u = devUser as { id: string; email: string };
        console.log('[dev-session] Impersonating:', u.email, '(', u.id, ')');
        return {
          session: { user: { id: u.id, email: u.email } },
          supabase: admin as any, // Use admin client to bypass RLS in dev
        };
      } else {
        console.warn('[dev-session] No user found for email:', devEmail || '(default creator)');
      }
    } catch (e) {
      console.warn('[dev-session] Failed to find dev user:', e);
    }
  }

  return { session: null, supabase };
}
