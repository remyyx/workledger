export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getPayloadStatus, cancelPayload } from '@/lib/xaman';

/**
 * GET /api/xaman/payload/[uuid]
 * Check the status of a Xaman sign payload.
 *
 * Called by the frontend after WebSocket reports signed=true.
 * Returns the full signed transaction details.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getPayloadStatus(params.uuid);

    return NextResponse.json({
      uuid: status.uuid,
      resolved: status.resolved,
      signed: status.signed,
      cancelled: status.cancelled,
      expired: status.expired,
      txid: status.txid,
      account: status.account,
      tx_type: status.payload.tx_type,
      signed_blob: status.response?.hex,
    });
  } catch (error: any) {
    console.error('[API] Xaman payload status check failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get payload status.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/xaman/payload/[uuid]
 * Cancel a pending payload.
 * Used when user navigates away or closes the sign modal.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cancelled = await cancelPayload(params.uuid);

    return NextResponse.json({ cancelled });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to cancel payload.' },
      { status: 500 }
    );
  }
}
