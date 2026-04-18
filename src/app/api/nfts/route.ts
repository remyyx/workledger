export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrDev } from '@/lib/supabase/dev-session';

/**
 * GET /api/nfts
 * Fetch NFTs owned by the authenticated user.
 * Query params: ?taxon=1 (1=Work Credential, 2=License, 3=Access Pass)
 *
 * CANONICAL OWNER KEY: nft_registry.owner stores the XRPL address (not app user UUID).
 * Always resolve user → xrpl_address before querying nft_registry.
 */
export async function GET(request: NextRequest) {
  try {
    const { session, supabase } = await getSessionOrDev();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taxon = searchParams.get('taxon');

    // Resolve XRPL address — nft_registry.owner is always an XRPL address, never a UUID
    const { data: userRow } = await supabase
      .from('users')
      .select('xrpl_address')
      .eq('id', session.user.id)
      .single();

    const ownerAddress = userRow?.xrpl_address;
    if (!ownerAddress) {
      return NextResponse.json({ nfts: [], grouped: { proofOfWork: [], licenses: [], accessPasses: [] }, total: 0 });
    }

    // Fetch from nft_registry by owner XRPL address
    let query = supabase
      .from('nft_registry')
      .select('*')
      .eq('owner', ownerAddress)
      .order('minted_at', { ascending: false });

    if (taxon) {
      const taxonNum = parseInt(taxon);
      if ([1, 2, 3].includes(taxonNum)) {
        query = query.eq('taxon', taxonNum);
      }
    }

    const { data: nfts, error } = await query;

    if (error) {
      console.error('[API] nfts query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch NFTs.' },
        { status: 500 }
      );
    }

    // Group by taxon for easy frontend consumption
    const grouped = {
      proofOfWork: (nfts || []).filter(n => n.taxon === 1),
      licenses: (nfts || []).filter(n => n.taxon === 2),
      accessPasses: (nfts || []).filter(n => n.taxon === 3),
    };

    return NextResponse.json({
      nfts: nfts || [],
      grouped,
      total: nfts?.length || 0,
    });
  } catch (error) {
    console.error('[API] nfts GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFTs.' },
      { status: 500 }
    );
  }
}
