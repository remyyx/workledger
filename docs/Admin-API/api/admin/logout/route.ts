/**
 * Admin Logout API Route
 *
 * Drop into: src/app/api/admin/logout/route.ts
 *
 * POST /api/admin/logout
 * Headers: Authorization: Bearer <token>
 * Returns: { success: true }
 *
 * Deletes the session from DB and clears the cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminLogout, extractToken } from '@/lib/admin/auth'

export async function POST(req: NextRequest) {
  try {
    // Try header first, then cookie
    let token = extractToken(req.headers)
    if (!token) {
      token = req.cookies.get('admin_token')?.value || null
    }

    if (token) {
      await adminLogout(token)
    }

    const response = NextResponse.json({ success: true })

    // Clear cookie
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/admin',
      maxAge: 0,
    })

    return response

  } catch (err) {
    console.error('Admin logout error:', err)
    return NextResponse.json({ success: true }) // Logout should always "succeed"
  }
}
