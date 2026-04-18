export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createSignInPayload, getPayloadStatus } from '@/lib/xaman';

/**
 * POST /api/auth/xaman
 * Start Xaman sign-in flow.
 *
 * Creates a SignIn payload — the user proves they own an XRPL address
 * by signing a non-transaction message in Xaman.
 *
 * Returns QR + WebSocket for the frontend.
 */
export async function POST() {
  try {
    const payload = await createSignInPayload({
      instruction: 'Sign in to StudioLedger with your XRPL wallet',
    });

    return NextResponse.json({
      uuid: payload.uuid,
      qr_png: payload.refs.qr_png,
      deeplink: payload.next.always,
      websocket: payload.refs.websocket_status,
    });
  } catch (error: any) {
    console.error('[Auth] Xaman SignIn payload failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create sign-in request.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/xaman
 * Verify Xaman sign-in and create/link Supabase session.
 *
 * After the user signs the payload:
 * 1. Verify the payload was signed
 * 2. Extract the signer's XRPL address
 * 3. Find or create the user in our database
 * 4. Create a Supabase session for them
 *
 * This bridges XRPL identity → Supabase auth seamlessly.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uuid } = body;

    if (!uuid) {
      return NextResponse.json({ error: 'Missing payload UUID.' }, { status: 400 });
    }

    // 1. Verify the payload was signed
    const status = await getPayloadStatus(uuid);

    if (!status.signed || !status.account) {
      return NextResponse.json(
        { error: 'Sign-in was not completed.' },
        { status: 400 }
      );
    }

    const xrplAddress = status.account;

    // 2. Check if user is already authenticated (e.g., via Google OAuth)
    // If yes, just return the XRPL address for linking — don't switch sessions
    const supabase = createAdminSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user?.id) {
      // User is already logged in — just return the verified address
      return NextResponse.json({
        authenticated: true,
        user: {
          id: session.user.id,
          xrpl_address: xrplAddress,
        },
        isNewUser: false,
        isLinking: true,
      });
    }

    // 3. Find or create user — service role bypasses RLS

    // Check if user with this XRPL address exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, display_name, role')
      .eq('xrpl_address', xrplAddress)
      .single() as { data: { id: string; email: string; display_name: string; role: string } | null };

    if (existingUser) {
      // Generate a magic link token to establish a real Supabase session
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: existingUser.email,
      });

      if (linkError || !linkData) {
        console.error('[Auth] Failed to generate session link:', linkError);
        return NextResponse.json(
          { error: 'Failed to create session.' },
          { status: 500 }
        );
      }

      // Extract the token from the magic link URL
      const linkUrl = new URL(linkData.properties.action_link);
      const token = linkUrl.searchParams.get('token') || linkData.properties.hashed_token;

      return NextResponse.json({
        authenticated: true,
        email: existingUser.email,
        token,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          display_name: existingUser.display_name,
          xrpl_address: xrplAddress,
          role: existingUser.role,
        },
        isNewUser: false,
      });
    }

    // 3. New user — create account with XRPL address
    // Generate a placeholder email (user can update later)
    const placeholderEmail = `${xrplAddress.toLowerCase()}@xrpl.studioledger.io`;

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: placeholderEmail,
      email_confirm: true, // Auto-confirm (they proved identity via Xaman)
      user_metadata: {
        xrpl_address: xrplAddress,
        auth_method: 'xaman',
      },
    });

    if (authError || !authData.user) {
      console.error('[Auth] Failed to create Supabase user:', authError);
      return NextResponse.json(
        { error: 'Failed to create account.' },
        { status: 500 }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: placeholderEmail,
      display_name: `${xrplAddress.slice(0, 4)}...${xrplAddress.slice(-4)}`,
      xrpl_address: xrplAddress,
      pub_key_hash: '',
      role: 'both',
    } as any);

    if (profileError) {
      console.error('[Auth] Failed to create profile:', profileError);
      // Auth user was created but profile failed — still return success
      // so user can complete setup
    }

    // Generate a magic link token to establish a real Supabase session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: placeholderEmail,
    });

    if (linkError || !linkData) {
      console.error('[Auth] Failed to generate session link for new user:', linkError);
    }

    const linkUrl = linkData?.properties ? new URL(linkData.properties.action_link) : null;
    const token = linkUrl?.searchParams.get('token') || linkData?.properties?.hashed_token || null;

    return NextResponse.json({
      authenticated: true,
      email: placeholderEmail,
      token,
      user: {
        id: authData.user.id,
        email: placeholderEmail,
        display_name: `${xrplAddress.slice(0, 4)}...${xrplAddress.slice(-4)}`,
        xrpl_address: xrplAddress,
        role: 'both',
      },
      isNewUser: true,
    });
  } catch (error: any) {
    console.error('[Auth] Xaman verification failed:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed.' },
      { status: 500 }
    );
  }
}
