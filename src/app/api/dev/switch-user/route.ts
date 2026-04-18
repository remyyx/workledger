export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getDevUserEmailServer, setDevUserEmailServer } from '@/lib/supabase/dev-user-store';

/**
 * POST /api/dev/switch-user
 * Dev-only: Switch the impersonated test user.
 * Uses an in-memory server variable instead of cookies —
 * Brave and other privacy browsers block cookies aggressively.
 * Body: { email: "marketplace1@test.studioledger.local" }
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_SKIP_AUTH !== 'true') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  // Verify user exists
  const admin = createAdminSupabase();
  const { data: user } = await admin
    .from('users')
    .select('id, email, display_name, role')
    .eq('email', email)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Store in server-side memory (survives across requests in dev server)
  setDevUserEmailServer(email);

  return NextResponse.json({
    switched: true,
    user: {
      id: (user as any).id,
      email: (user as any).email,
      display_name: (user as any).display_name,
      role: (user as any).role,
    },
  });
}

/**
 * GET /api/dev/switch-user
 * Returns current dev user and list of available test users.
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_SKIP_AUTH !== 'true') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const currentEmail = getDevUserEmailServer();

  const admin = createAdminSupabase();
  const { data: users } = await admin
    .from('users')
    .select('id, email, display_name, role')
    .order('role');

  return NextResponse.json({
    currentEmail,
    users: (users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      role: u.role,
    })),
  });
}
