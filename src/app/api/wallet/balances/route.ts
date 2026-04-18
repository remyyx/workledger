export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { getBalances } from '@/lib/xrpl';
import { demoBalances, demoUser } from '@/lib/demo-data';

/**
 * GET /api/wallet/balances
 * Fetch XRPL balances for the authenticated user.
 * Returns both native XRP and issued token balances.
 * In dev/demo mode (NEXT_PUBLIC_SKIP_AUTH=true), returns rich demo balances
 * so the UI is never empty even without a funded testnet wallet.
 */
export async function GET() {
  // Dev mode: return demo balances immediately — no XRPL round-trip needed
  if (
    process.env.NEXT_PUBLIC_SKIP_AUTH === 'true' &&
    process.env.NODE_ENV === 'development'
  ) {
    return NextResponse.json({
      address: demoUser.xrpl_address,
      balances: demoBalances,
    });
  }

  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's XRPL address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('xrpl_address')
      .eq('id', session.user.id)
      .single();

    if (userError || !user?.xrpl_address) {
      return NextResponse.json(
        { error: 'User XRPL address not found.' },
        { status: 404 }
      );
    }

    // Fetch live balances from XRPL
    const balances = await getBalances(user.xrpl_address);

    // If the testnet wallet has no funds yet, serve demo balances in dev
    if (
      balances.length === 0 &&
      process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    ) {
      return NextResponse.json({
        address: user.xrpl_address,
        balances: demoBalances,
      });
    }

    return NextResponse.json({
      address: user.xrpl_address,
      balances,
    });
  } catch (error) {
    console.error('[API] wallet/balances error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balances.' },
      { status: 500 }
    );
  }
}
