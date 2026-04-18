export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';
import { demoMCCs, DEMO_CREATOR_ADDRESS, DEMO_MARKETPLACE_ADDRESS } from '@/lib/demo-data';

const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true' && process.env.NODE_ENV === 'development';

/**
 * GET /api/mccs
 * Fetch MCC tokens owned by the authenticated user.
 * Query params: ?taxon=1 (1=Work Credential, 2=License, 3=Access Pass, 4=Client Completion)
 */
export async function GET(request: NextRequest) {
  // Dev mode: merge real nft_registry MCCs + demo data
  if (isDevMode) {
    const { searchParams: sp } = new URL(request.url);
    const taxonParam = sp.get('taxon');
    const taxonFilter = taxonParam ? parseInt(taxonParam) : null;

    try {
      const { session, supabase } = await getSessionOrDev();
      if (session) {
        const { data: userRow } = await supabase
          .from('users')
          .select('role, xrpl_address')
          .eq('id', session.user.id)
          .single();

        const ownerAddress = userRow?.xrpl_address;
        const userRole = userRow?.role || 'creator';

        // Start with demo MCCs for this role
        const demoAddress = userRole === 'marketplace'
          ? DEMO_MARKETPLACE_ADDRESS
          : DEMO_CREATOR_ADDRESS;
        const demoOwned = demoMCCs.filter(n => n.owner === demoAddress);

        // Query nft_registry for real/test-minted MCCs
        // Match by XRPL address if available, or by test placeholder address for users without wallets
        const testPlaceholder = userRole === 'marketplace' ? 'rTEST_CLIENT_NO_WALLET' : 'rTEST_CREATOR_NO_WALLET';
        const ownerAddresses = ownerAddress ? [ownerAddress, testPlaceholder] : [testPlaceholder];

        const { data: realMccs } = await supabase
          .from('nft_registry')
          .select('*')
          .in('owner', ownerAddresses)
          .order('minted_at', { ascending: false });

        const realList = (realMccs || []).map((row: any) => ({
          ...row,
          mcc_token_id: row.nft_token_id,
        }));

        // Merge: real MCCs first, then demo — demo acts as portfolio filler
        const all = [...realList, ...demoOwned];
        const filtered = taxonFilter
          ? all.filter((n: any) => n.taxon === taxonFilter)
          : all;

        return NextResponse.json({
          mccs: filtered,
          grouped: {
            workCredentials: all.filter((n: any) => n.taxon === 1),
            licenses: all.filter((n: any) => n.taxon === 2),
            accessPasses: all.filter((n: any) => n.taxon === 3),
            clientCompletions: all.filter((n: any) => n.taxon === 4),
          },
          total: filtered.length,
        });
      }
    } catch {
      // Fall through to demo fallback
    }

    // Final fallback if session fails
    const owned = demoMCCs.filter(n => n.owner === DEMO_CREATOR_ADDRESS);
    return NextResponse.json({
      mccs: owned,
      grouped: {
        workCredentials: owned.filter(n => n.taxon === 1),
        licenses: owned.filter(n => n.taxon === 2),
        accessPasses: owned.filter(n => n.taxon === 3),
        clientCompletions: owned.filter(n => n.taxon === 4),
      },
      total: owned.length,
    });
  }

  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taxon = searchParams.get('taxon');

    // nft_registry.owner is stored as XRPL address when MCC is minted; resolve current user's address
    const { data: userRow } = await supabase
      .from('users')
      .select('xrpl_address')
      .eq('id', session.user.id)
      .single();

    const ownerAddress = userRow?.xrpl_address;
    if (!ownerAddress) {
      return NextResponse.json({
        mccs: [],
        grouped: { workCredentials: [], licenses: [], accessPasses: [] },
        total: 0,
      });
    }

    // Fetch from nft_registry by owner XRPL address
    let query = supabase
      .from('nft_registry')
      .select('*')
      .eq('owner', ownerAddress)
      .order('minted_at', { ascending: false });

    if (taxon) {
      const taxonNum = parseInt(taxon);
      if ([1, 2, 3, 4].includes(taxonNum)) {
        query = query.eq('taxon', taxonNum);
      }
    }

    const { data: mccs, error } = await query;

    if (error) {
      console.error('[API] mccs query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credentials.' },
        { status: 500 }
      );
    }

    // Map DB column (nft_token_id) to frontend type field (mcc_token_id).
    // DB canonical column is nft_token_id per migration 001_initial_schema.
    const list = (mccs || []).map((row: any) => ({
      ...row,
      mcc_token_id: row.nft_token_id,
    }));

    const grouped = {
      workCredentials: list.filter((n: any) => n.taxon === 1),
      licenses: list.filter((n: any) => n.taxon === 2),
      accessPasses: list.filter((n: any) => n.taxon === 3),
      clientCompletions: list.filter((n: any) => n.taxon === 4),
    };

    return NextResponse.json({
      mccs: list,
      grouped,
      total: list.length,
    });
  } catch (error) {
    console.error('[API] mccs GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials.' },
      { status: 500 }
    );
  }
}
