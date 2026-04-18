/**
 * Admin Login API Route
 *
 * Drop into: src/app/api/admin/login/route.ts
 *
 * POST /api/admin/login
 * Body: { email, password }
 * Returns: { token, admin } or { error }
 *
 * Sets an httpOnly cookie AND returns the token in the body
 * (cookie for browser dashboard, body for API clients).
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminLogin, auditLog } from '@/lib/admin/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Must be @studioledger.ai email
    if (!email.toLowerCase().trim().endsWith('@studioledger.ai')) {
      return NextResponse.json(
        { error: 'Admin access restricted to @studioledger.ai accounts' },
        { status: 403 }
      )
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const result = await adminLogin(email, password, ip, userAgent)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    // Build response with token + admin profile
    const response = NextResponse.json({
      token: result.token,
      admin: result.admin,
    })

    // Set httpOnly cookie for browser-based dashboard
    response.cookies.set('admin_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/admin',
      maxAge: 8 * 60 * 60, // 8 hours, matches session duration
    })

    return response

  } catch (err) {
    console.error('Admin login error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
