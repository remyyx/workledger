export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { createPaymentPayload, createTrustLinePayload } from '@/lib/xaman';
import { z } from 'zod';
import { RLUSD_ISSUER, GATEHUB_ISSUERS } from '@/config/constants';

// Validation schema for send payment
const sendSchema = z.object({
  destination: z.string().min(25).max(35), // XRPL addresses are ~25-35 chars
  amount: z.string().refine((v) => {
    const num = parseFloat(v);
    return !isNaN(num) && num > 0;
  }, 'Amount must be a positive number'),
  currency: z.string().min(1).max(10),
});

// Validation schema for trust line setup
const trustLineSchema = z.object({
  currency: z.string().min(1).max(10),
});

/**
 * POST /api/wallet/send
 * Create a Xaman payment payload for the user to sign.
 */
export async function POST(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if this is a trust line request
    if (body.action === 'trust_line') {
      const parsed = trustLineSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { currency } = parsed.data;

      // Determine issuer
      let issuer: string;
      if (currency === 'RLUSD') {
        issuer = RLUSD_ISSUER;
      } else if (currency in GATEHUB_ISSUERS) {
        issuer = GATEHUB_ISSUERS[currency as keyof typeof GATEHUB_ISSUERS];
      } else {
        return NextResponse.json(
          { error: `Unsupported currency: ${currency}` },
          { status: 400 }
        );
      }

      const payload = await createTrustLinePayload({
        currency,
        issuer,
        limit: '1000000000',
      });
      const raw = payload as Record<string, any>;

      return NextResponse.json({
        uuid: raw.uuid,
        qr_png: raw.refs?.qr_png,
        deeplink: raw.next?.always,
        websocket: raw.refs?.websocket_status,
      });
    }

    // Payment request
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { destination, amount, currency } = parsed.data;

    // Determine issuer for non-native currencies
    let issuer: string | undefined;
    if (currency !== 'XRP') {
      if (currency === 'RLUSD') {
        issuer = RLUSD_ISSUER;
      } else if (currency in GATEHUB_ISSUERS) {
        issuer = GATEHUB_ISSUERS[currency as keyof typeof GATEHUB_ISSUERS];
      }
    }

    // Create Xaman payment payload
    const payload = await createPaymentPayload({
      destination,
      amount,
      currency,
      issuer: issuer || '',
    });

    const raw = payload as Record<string, any>;

    return NextResponse.json({
      uuid: raw.uuid,
      qr_png: raw.refs?.qr_png,
      deeplink: raw.next?.always,
      websocket: raw.refs?.websocket_status,
    });
  } catch (error) {
    console.error('[API] wallet/send error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment request.' },
      { status: 500 }
    );
  }
}
