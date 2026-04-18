export const dynamic = 'force-dynamic';

// ============================================
// XRPL Listener API — Health & Bootstrap
// ============================================
// GET  → Health check: is the listener running? How many accounts subscribed?
// POST → Start/bootstrap the listener with accounts from active contracts.
//
// The POST endpoint is designed to be called by:
//   - Vercel Cron (vercel.json: { "crons": [{ "path": "/api/listener", "schedule": "*/5 * * * *" }] })
//   - App startup (layout.tsx or middleware could fire-and-forget)
//   - Manual health recovery
//
// Protected by CRON_SECRET to prevent unauthorized starts.

import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import {
  startTransactionListener,
  stopTransactionListener,
  getListenerStatus,
} from '@/lib/xrpl/listener';
import { handleConfirmedTransaction } from '@/lib/xrpl/transaction-monitor';

// ── GET: Listener health check ──
export async function GET() {
  const status = getListenerStatus();

  return NextResponse.json({
    ok: true,
    listener: {
      active: status.listening,
      subscribedAccounts: status.subscribedAccounts.length,
    },
    timestamp: new Date().toISOString(),
  });
}

// ── POST: Start or refresh the listener ──
export async function POST(request: Request) {
  // Verify cron secret (skip in development)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Pull distinct XRPL addresses from active contracts
    // These are the accounts we need to watch for escrow events
    const supabase = createAdminSupabase();

    const { data: contracts } = await supabase
      .from('contracts')
      .select('marketplace_id, creator_id')
      .in('status', ['funded', 'active']);

    const accountSet = new Set<string>();

    // Add platform address (always watch for fee payments)
    const platformAddress = process.env.XRPL_PLATFORM_ADDRESS;
    if (platformAddress) accountSet.add(platformAddress);

    if (contracts) {
      // Get XRPL addresses for all contract participants
      const userIds = new Set<string>();
      (contracts as any[]).forEach((c: any) => {
        if (c.marketplace_id) userIds.add(c.marketplace_id);
        if (c.creator_id) userIds.add(c.creator_id);
      });

      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, xrpl_address')
          .in('id', Array.from(userIds));

        (users as any[] | null)?.forEach((u: any) => {
          if (u.xrpl_address) accountSet.add(u.xrpl_address);
        });
      }
    }

    const accounts = Array.from(accountSet);

    if (accounts.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No active contracts — listener not started.',
        accounts: 0,
      });
    }

    // Start (or refresh) the listener
    const result = await startTransactionListener(accounts, handleConfirmedTransaction);

    return NextResponse.json({
      ok: true,
      listener: {
        active: result.listening,
        accountCount: result.accountCount,
        newAccountsAdded: accounts.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Listener API] Failed to start listener:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to start listener' },
      { status: 500 }
    );
  }
}

// ── DELETE: Stop the listener (admin/debug use) ──
export async function DELETE(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  await stopTransactionListener();

  return NextResponse.json({
    ok: true,
    message: 'Listener stopped.',
    timestamp: new Date().toISOString(),
  });
}
