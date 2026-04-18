export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { z } from 'zod';

/**
 * GET /api/disputes
 * List disputes for the authenticated user.
 * Admin users see all disputes; regular users see only disputes for their contracts.
 * Query params: ?status=open|evidence|review|resolved
 */
export async function GET(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Look up current user to check if admin
    const { data: currentUser } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    const isAdmin = (currentUser as any)?.is_admin === true;

    // Build the query
    let query = supabase
      .from('disputes')
      .select(
        `
        id,
        contract_id,
        milestone_id,
        raised_by,
        reason,
        status,
        resolution,
        arbitrator_id,
        created_at,
        resolved_at,
        contracts (
          id,
          title,
          creator_id,
          marketplace_id
        ),
        milestones (
          id,
          title
        )
        `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    // If not admin, filter to user's contracts only
    if (!isAdmin) {
      query = query.or(`raised_by.eq.${session.user.id}`);
      // Note: RLS on disputes table should also enforce contract ownership
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: disputes, error, count } = await query;

    if (error) {
      console.error('[API] disputes list error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch disputes.' },
        { status: 500 }
      );
    }

    // Enrich with raised_by and counterparty names
    const enriched = disputes || [];
    if (enriched.length > 0) {
      const raisedByIds = new Set<string>();
      for (const d of enriched as any[]) {
        if (d.raised_by) raisedByIds.add(d.raised_by);
      }

      if (raisedByIds.size > 0) {
        const admin = createAdminSupabase();
        const { data: users } = await admin
          .from('users')
          .select('id, display_name')
          .in('id', Array.from(raisedByIds));

        const nameMap: Record<string, string> = {};
        for (const u of (users || []) as any[]) {
          nameMap[u.id] = u.display_name;
        }

        for (const d of enriched as any[]) {
          d.raised_by_name = nameMap[d.raised_by] || 'Unknown';
          // Add contract counterparty names if available
          const contract = d.contracts;
          if (contract) {
            d.creator_name = contract.creator_id === session.user.id ? 'You' : 'Creator';
            d.marketplace_name = contract.marketplace_id === session.user.id ? 'You' : 'Marketplace';
          }
        }
      }
    }

    return NextResponse.json({
      disputes: enriched,
      pagination: {
        total: count || 0,
      },
    });
  } catch (error) {
    console.error('[API] disputes GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disputes.' },
      { status: 500 }
    );
  }
}
