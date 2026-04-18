export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';

/**
 * GET /api/wallet/transactions
 * Paginated transaction log for the authenticated user.
 * Query params: ?page=1&limit=20&type=EscrowFinish
 */
export async function GET(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's XRPL address for filtering
    const { data: user } = await supabase
      .from('users')
      .select('xrpl_address')
      .eq('id', session.user.id)
      .single();

    if (!user?.xrpl_address) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const txType = searchParams.get('type'); // optional filter
    const offset = (page - 1) * limit;

    // Build query — transactions where user is sender or receiver
    let query = supabase
      .from('transaction_log')
      .select('*', { count: 'exact' })
      .or(`from_address.eq.${user.xrpl_address},to_address.eq.${user.xrpl_address}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (txType) {
      query = query.eq('tx_type', txType);
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error('[API] wallet/transactions query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[API] wallet/transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions.' },
      { status: 500 }
    );
  }
}
