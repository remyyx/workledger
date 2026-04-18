export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createPayload } from '@/lib/xaman';
import { z } from 'zod';

/**
 * POST /api/xaman/payload
 * Create a Xaman sign payload.
 *
 * The frontend sends the transaction template, we create the payload
 * via Xaman API and return the QR code + WebSocket URL.
 *
 * Auth required — we don't let anonymous users create sign requests.
 */

const payloadSchema = z.object({
  txjson: z.record(z.any()),
  options: z
    .object({
      submit: z.boolean().optional(),
      return_url: z
        .object({
          app: z.string().optional(),
          web: z.string().optional(),
        })
        .optional(),
      expire: z.number().optional(),
    })
    .optional(),
  custom_meta: z
    .object({
      identifier: z.string().optional(),
      blob: z.record(z.any()).optional(),
      instruction: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const payload = await createPayload(parsed.data);

    return NextResponse.json({
      uuid: payload.uuid,
      qr_png: payload.refs.qr_png,
      deeplink: payload.next.always,
      websocket: payload.refs.websocket_status,
      pushed: payload.pushed,
    });
  } catch (error: any) {
    console.error('[API] Xaman payload creation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Xaman payload.' },
      { status: 500 }
    );
  }
}
