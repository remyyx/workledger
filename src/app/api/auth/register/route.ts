export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { generateWallet } from '@/lib/xrpl';
import { encryptWalletSeed } from '@/lib/crypto';
import { n8n } from '@/lib/n8n';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
  role: z.enum(['creator', 'marketplace', 'both']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, displayName, role } = parsed.data;
    const supabase = createServerSupabase();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
    }

    // Generate XRPL wallet
    const wallet = generateWallet();

    // Encrypt wallet seed before storage — Philosophy A (platform-managed accounts)
    // The seed is AES-256-GCM encrypted with WALLET_ENCRYPTION_KEY (env only, never in DB).
    // NULL wallet_seed_encrypted = user connected their own wallet (Philosophy B / Xaman).
    const encryptedSeed = encryptWalletSeed(wallet.seed);

    // Insert user profile with encrypted wallet seed
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      display_name: displayName,
      xrpl_address: wallet.address,
      pub_key_hash: wallet.publicKey,
      role,
      wallet_seed_encrypted: encryptedSeed,
    });

    if (profileError) {
      return NextResponse.json(
        { error: 'Account created but profile setup failed. Please contact support.' },
        { status: 500 }
      );
    }

    // Fire n8n onboarding workflow (non-blocking)
    // Handles: trust line setup, welcome email, phone verification
    n8n.userRegistered({
      userId: authData.user.id,
      email,
      displayName,
      role,
      xrplAddress: wallet.address,
    });

    return NextResponse.json({
      message: 'Account created successfully.',
      xrplAddress: wallet.address,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
