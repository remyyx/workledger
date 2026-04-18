export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GET /api/creators
 * Browse all creators. Public endpoint (no auth required).
 * Returns creators with role 'creator' or 'both'.
 *
 * Query params:
 * - skill: filter by skill (comma-separated)
 * - category: filter by category (comma-separated)
 * - search: search by display_name or bio
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });

    const { searchParams } = new URL(request.url);
    const skill = searchParams.get('skill');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query = supabase
      .from('users')
      .select('id, display_name, role, skills, avatar_url, bio, created_at, updated_at')
      .in('role', ['creator', 'both'])
      .order('created_at', { ascending: false });

    // Filter by skill (case-insensitive, any match)
    if (skill) {
      const skills = skill.split(',').map(s => s.trim().toLowerCase());
      const { data: allCreators } = await query;

      if (allCreators) {
        const filtered = allCreators.filter(creator =>
          creator.skills && creator.skills.some(s =>
            skills.some(sk => (s || '').toLowerCase().includes(sk))
          )
        );
        return NextResponse.json({ creators: filtered });
      }
    }

    // Filter by search (display_name or bio)
    if (search) {
      const searchLower = search.toLowerCase();
      const { data: allCreators } = await query;

      if (allCreators) {
        const filtered = allCreators.filter(creator =>
          (creator.display_name?.toLowerCase() || '').includes(searchLower)
          || (creator.bio?.toLowerCase() || '').includes(searchLower)
        );
        return NextResponse.json({ creators: filtered });
      }
    }

    const { data: creators, error } = await query;

    if (error) {
      console.error('[API] creators GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch creators.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ creators: creators || [] });
  } catch (error) {
    console.error('[API] creators GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creators.' },
      { status: 500 }
    );
  }
}
