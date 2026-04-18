/**
 * Admin Disputes API
 *
 * Drop into: src/app/api/admin/disputes/route.ts
 *
 * GET  /api/admin/disputes — list all disputes with filters
 * POST /api/admin/disputes — admin actions on disputes (escalate, assign, resolve)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, AdminContext } from '@/lib/admin/middleware'
import { auditLog } from '@/lib/admin/auth'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── GET /api/admin/disputes ─────────────────────────────────────

export const GET = withAdmin(async (req, { admin }) => {
  const supabase = getServiceClient()
  const url = new URL(req.url)

  // Filters
  const status = url.searchParams.get('status')       // open | escalated | resolved
  const contractId = url.searchParams.get('contract_id')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const offset = parseInt(url.searchParams.get('offset') || '0')

  let query = supabase
    .from('disputes')
    .select(`
      *,
      contracts (id, title, status),
      milestones (id, title, sequence, amount, currency),
      creator:users!disputes_creator_id_fkey (id, display_name, email),
      client:users!disputes_client_id_fkey (id, display_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (contractId) query = query.eq('contract_id', contractId)

  const { data: disputes, count, error } = await query

  if (error) {
    console.error('Admin disputes fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 })
  }

  return NextResponse.json({
    disputes,
    total: count,
    limit,
    offset,
  })

}, { resource: 'disputes', action: 'read' })

// ─── POST /api/admin/disputes ────────────────────────────────────

export const POST = withAdmin(async (req, { admin }) => {
  const supabase = getServiceClient()
  const body = await req.json()
  const { dispute_id, action, ...params } = body

  if (!dispute_id || !action) {
    return NextResponse.json(
      { error: 'dispute_id and action are required' },
      { status: 400 }
    )
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'

  // Verify dispute exists
  const { data: dispute, error: fetchErr } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', dispute_id)
    .single()

  if (fetchErr || !dispute) {
    return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
  }

  switch (action) {
    case 'escalate': {
      // Escalate to panel review
      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'escalated',
          escalated_at: new Date().toISOString(),
          escalated_by: admin.id,
        })
        .eq('id', dispute_id)

      if (error) {
        return NextResponse.json({ error: 'Failed to escalate' }, { status: 500 })
      }

      await auditLog(admin.id, 'dispute_escalated', 'disputes', dispute_id, {
        previous_status: dispute.status,
      }, ip)

      return NextResponse.json({ success: true, status: 'escalated' })
    }

    case 'assign_arbitrator': {
      // Assign an admin as arbitrator
      const { arbitrator_id } = params
      if (!arbitrator_id) {
        return NextResponse.json({ error: 'arbitrator_id required' }, { status: 400 })
      }

      const { error } = await supabase
        .from('dispute_arbitrators')
        .insert({
          dispute_id,
          admin_id: arbitrator_id,
          assigned_by: admin.id,
        })

      if (error) {
        return NextResponse.json({ error: 'Failed to assign arbitrator' }, { status: 500 })
      }

      await auditLog(admin.id, 'arbitrator_assigned', 'disputes', dispute_id, {
        arbitrator_id,
      }, ip)

      return NextResponse.json({ success: true, arbitrator_id })
    }

    case 'resolve': {
      // Resolve the dispute with a decision
      const { resolution, resolution_notes, refund_percent } = params
      if (!resolution) {
        return NextResponse.json(
          { error: 'resolution is required (creator_wins | client_wins | split)' },
          { status: 400 }
        )
      }

      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution,
          resolution_notes: resolution_notes || null,
          refund_percent: refund_percent || null,
          resolved_at: new Date().toISOString(),
          resolved_by: admin.id,
        })
        .eq('id', dispute_id)

      if (error) {
        return NextResponse.json({ error: 'Failed to resolve' }, { status: 500 })
      }

      await auditLog(admin.id, 'dispute_resolved', 'disputes', dispute_id, {
        resolution,
        refund_percent,
        previous_status: dispute.status,
      }, ip)

      return NextResponse.json({ success: true, status: 'resolved', resolution })
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}. Valid: escalate, assign_arbitrator, resolve` },
        { status: 400 }
      )
  }

}, { resource: 'disputes', action: 'write' })
