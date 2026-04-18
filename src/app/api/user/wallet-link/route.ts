export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { z } from 'zod';

/**
 * POST /api/user/wallet-link
 * Link an XRPL address to the authenticated user's profile.
 *
 * Called after a Google OAuth user proves ownership of an XRPL
 * address via Xaman sign-in. Updates users.xrpl_address.
 */

const walletLinkSchema = z.object({
  xrplAddress: z.string().min(25).max(35).regex(/^r[1-9A-HJ-NP-Za-km-z]+$/, {
    message: 'Invalid XRPL address format.',
  }),
});

export async function POST(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = walletLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { xrplAddress } = parsed.data;

    // Check if this XRPL address is already linked to another user
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('xrpl_address', xrplAddress)
      .neq('id', session.user.id);

    if (checkError) {
      console.error('[API] wallet-link check error:', checkError);
      return NextResponse.json(
        { error: 'Failed to validate address.' },
        { status: 500 }
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'This XRPL address is already linked to another account.' },
        { status: 409 }
      );
    }

    // Update the user's XRPL address
    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({
        xrpl_address: xrplAddress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[API] wallet-link error:', updateError);
      return NextResponse.json(
        { error: 'Failed to link wallet.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Wallet linked successfully.',
      xrplAddress,
      user,
    });
  } catch (error) {
    console.error('[API] wallet-link error:', error);
    return NextResponse.json(
      { error: 'Failed to link wallet.' },
      { status: 500 }
    );
  }
}
