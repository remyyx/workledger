/**
 * Admin Middleware
 *
 * Drop into: src/lib/admin/middleware.ts
 *
 * Wraps Next.js API route handlers with session validation
 * and permission checks. Returns 401/403 with consistent
 * error shapes.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  AdminAccount,
  AdminRole,
  validateSession,
  extractToken,
  checkPermission,
  auditLog,
  PermissionDeniedError,
} from './auth'

// ─── Types ───────────────────────────────────────────────────────

export interface AdminContext {
  admin: AdminAccount
  token: string
}

type AdminHandler = (
  req: NextRequest,
  ctx: AdminContext
) => Promise<NextResponse>

interface AdminRouteOptions {
  /** Required resource for permission check (e.g., 'disputes', 'contracts') */
  resource?: string
  /** Required action level (default: 'read') */
  action?: 'read' | 'write' | 'delete'
  /** Restrict to specific roles (overrides resource/action check) */
  roles?: AdminRole[]
}

// ─── Middleware Wrapper ──────────────────────────────────────────

/**
 * Wrap an API route handler with admin authentication + authorization.
 *
 * Usage:
 * ```ts
 * export const GET = withAdmin(async (req, { admin }) => {
 *   return NextResponse.json({ disputes: [...] })
 * }, { resource: 'disputes', action: 'read' })
 * ```
 */
export function withAdmin(handler: AdminHandler, options?: AdminRouteOptions) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    try {
      // 1. Extract token
      const token = extractToken(req.headers)
      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'NO_TOKEN' },
          { status: 401 }
        )
      }

      // 2. Validate session
      const admin = await validateSession(token)
      if (!admin) {
        return NextResponse.json(
          { error: 'Invalid or expired session', code: 'INVALID_SESSION' },
          { status: 401 }
        )
      }

      // 3. Check role restriction (if specified)
      if (options?.roles && !options.roles.includes(admin.role)) {
        await auditLog(admin.id, 'permission_denied', options.resource || 'unknown', null, {
          required_roles: options.roles,
          admin_role: admin.role,
        }, ip)

        return NextResponse.json(
          { error: 'Insufficient privileges', code: 'ROLE_DENIED' },
          { status: 403 }
        )
      }

      // 4. Check resource permission (if specified)
      if (options?.resource) {
        const action = options.action || 'read'
        const allowed = await checkPermission(admin.role, options.resource, action)
        if (!allowed) {
          await auditLog(admin.id, 'permission_denied', options.resource, null, {
            action,
            admin_role: admin.role,
          }, ip)

          return NextResponse.json(
            { error: 'Insufficient privileges', code: 'PERMISSION_DENIED' },
            { status: 403 }
          )
        }
      }

      // 5. Call the actual handler
      return await handler(req, { admin, token })

    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        return NextResponse.json(
          { error: err.message, code: 'PERMISSION_DENIED' },
          { status: 403 }
        )
      }

      console.error('Admin route error:', err)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
}

/**
 * Boss-only shorthand — restricts to boss role only.
 */
export function withBoss(handler: AdminHandler) {
  return withAdmin(handler, { roles: ['boss'] })
}
