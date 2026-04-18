export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { z } from 'zod';

/**
 * GET /api/user/profile
 * Fetch the authenticated user's profile.
 */
export async function GET() {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Profile not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[API] user/profile GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile.' },
      { status: 500 }
    );
  }
}

// Validation for profile updates
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  skills: z.array(z.string()).max(20).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  payoutConfig: z.object({
    strategy: z.enum(['single', 'split', 'stack']),
    allocations: z.array(z.object({
      currency: z.string(),
      percentage: z.number().min(0).max(100),
      action: z.enum(['withdraw', 'stack']),
    })),
    auto_withdraw: z.object({
      enabled: z.boolean(),
      threshold: z.number().min(0),
      destination: z.enum(['bank', 'external_wallet']),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
    }),
  }).optional(),
});

/**
 * PATCH /api/user/profile
 * Update the authenticated user's profile.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};

    if (parsed.data.displayName !== undefined) {
      updates.display_name = parsed.data.displayName;
    }
    if (parsed.data.bio !== undefined) {
      updates.bio = parsed.data.bio;
    }
    if (parsed.data.skills !== undefined) {
      updates.skills = parsed.data.skills;
    }
    if (parsed.data.avatarUrl !== undefined) {
      updates.avatar_url = parsed.data.avatarUrl;
    }
    if (parsed.data.payoutConfig !== undefined) {
      updates.payout_config = parsed.data.payoutConfig;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('[API] user/profile PATCH error:', error);
      return NextResponse.json(
        { error: 'Failed to update profile.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[API] user/profile PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile.' },
      { status: 500 }
    );
  }
}
