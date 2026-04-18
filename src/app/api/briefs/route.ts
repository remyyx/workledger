export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { z } from 'zod';

// --- Validation ---
const createBriefSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  category: z.string().min(1).max(50),
  skills_required: z.array(z.string()).max(15).default([]),
  budget_min: z.number().positive().nullable().default(null),
  budget_max: z.number().positive().nullable().default(null),
  currency: z.string().default('RLUSD'),
  deadline: z.string().nullable().default(null),
  template: z.enum(['fixed_price', 'milestone', 'retainer', 'pay_per_use', 'license_deal', 'subscription']).default('milestone'),
});

/**
 * GET /api/briefs
 * Browse open project briefs. Creators see all open briefs.
 * MK see their own briefs (any status).
 * Query: ?category=design&page=1&limit=20&mine=true
 */
export async function GET(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const mine = searchParams.get('mine') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('project_briefs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (mine) {
      // MK viewing their own briefs
      query = query.eq('author_id', session.user.id);
    } else {
      // CR browsing open briefs
      query = query.eq('status', 'open');
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: briefs, count, error } = await query;
    if (error) throw error;

    // Enrich with author info
    if (briefs && briefs.length > 0) {
      const authorIds = Array.from(new Set(briefs.map((b: any) => b.author_id)));
      const { data: authors } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, role')
        .in('id', authorIds);

      const authorMap = new Map((authors || []).map((a: any) => [a.id, a]));
      for (const brief of briefs) {
        (brief as any).author = authorMap.get((brief as any).author_id) || null;
      }
    }

    return NextResponse.json({
      briefs: briefs || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('[briefs/GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch briefs' }, { status: 500 });
  }
}

/**
 * POST /api/briefs
 * Marketplace user creates a new project brief.
 */
export async function POST(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is marketplace role
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!user || (user.role !== 'marketplace' && user.role !== 'both')) {
      return NextResponse.json(
        { error: 'Only marketplace accounts can post project briefs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createBriefSchema.parse(body);

    // Validate budget range
    if (parsed.budget_min && parsed.budget_max && parsed.budget_min > parsed.budget_max) {
      return NextResponse.json({ error: 'budget_min cannot exceed budget_max' }, { status: 400 });
    }

    const { data: brief, error } = await supabase
      .from('project_briefs')
      .insert({
        author_id: session.user.id,
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        skills_required: parsed.skills_required,
        budget_min: parsed.budget_min,
        budget_max: parsed.budget_max,
        currency: parsed.currency,
        deadline: parsed.deadline,
        template: parsed.template,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ brief }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('[briefs/POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to create brief' }, { status: 500 });
  }
}
