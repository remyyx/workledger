/**
 * Admin Stats API Route
 *
 * Drop into: src/app/api/admin/stats/route.ts
 *
 * GET /api/admin/stats — platform-wide statistics
 *
 * Returns contract counts, dispute counts, fee revenue, MCC counts.
 * Used by the admin dashboard overview tab.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/admin/middleware'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const GET = withAdmin(async (req, { admin }) => {
  const supabase = getServiceClient()

  // Run all queries in parallel
  const [
    contractsRes,
    activeContractsRes,
    completedContractsRes,
    openDisputesRes,
    escalatedDisputesRes,
    resolvedDisputesRes,
    mccsRes,
    feesRes,
  ] = await Promise.all([
    supabase.from('contracts').select('*', { count: 'exact', head: true }),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'escalated'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
    supabase.from('nft_registry').select('*', { count: 'exact', head: true }),
    supabase.from('fee_ledger').select('amount'),
  ])

  // Sum fees
  const totalFees = (feesRes.data || []).reduce(
    (sum: number, row: any) => sum + (parseFloat(row.amount) || 0),
    0
  )

  return NextResponse.json({
    contracts: {
      total: contractsRes.count || 0,
      active: activeContractsRes.count || 0,
      completed: completedContractsRes.count || 0,
    },
    disputes: {
      open: openDisputesRes.count || 0,
      escalated: escalatedDisputesRes.count || 0,
      resolved: resolvedDisputesRes.count || 0,
    },
    revenue: {
      total_fees: Math.round(totalFees * 100) / 100,
      currency: 'RLUSD',
    },
    mccs: {
      minted: mccsRes.count || 0,
    },
    generated_at: new Date().toISOString(),
  })

}, { resource: 'platform_stats', action: 'read' })
