/**
 * Admin Session / Profile Route
 *
 * Drop into: src/app/api/admin/me/route.ts
 *
 * GET /api/admin/me — returns current admin profile + permissions
 * PATCH /api/admin/me — update display name (self-service)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/admin/middleware'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/me
export const GET = withAdmin(async (req, { admin }) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch permissions for this role
  const { data: permissions } = await supabase
    .from('admin_permissions')
    .select('resource, can_read, can_write, can_delete')
    .eq('role', admin.role)

  return NextResponse.json({
    admin,
    permissions: admin.role === 'boss'
      ? 'all' // Boss has unrestricted access
      : permissions || [],
  })
})

// PATCH /api/admin/me — update own display name
export const PATCH = withAdmin(async (req, { admin }) => {
  const body = await req.json()
  const { display_name } = body

  if (!display_name || display_name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Display name must be at least 2 characters' },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('admin_accounts')
    .update({ display_name: display_name.trim() })
    .eq('id', admin.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }

  const { password_hash, ...safeAdmin } = data
  return NextResponse.json({ admin: safeAdmin })
})
