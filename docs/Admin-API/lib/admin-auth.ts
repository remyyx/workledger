/**
 * Admin Authentication Library
 *
 * Drop into: src/lib/admin/auth.ts
 *
 * Handles password hashing (bcrypt), session token generation,
 * session validation, and permission checks against the
 * admin_accounts / admin_sessions / admin_permissions tables
 * created by migration 015.
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// ─── Types ───────────────────────────────────────────────────────

export type AdminRole = 'boss' | 'dev' | 'accounting' | 'commercial' | 'protocol'

export interface AdminAccount {
  id: string
  email: string
  display_name: string
  role: AdminRole
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export interface AdminSession {
  id: string
  admin_id: string
  token_hash: string
  expires_at: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AdminPermission {
  role: AdminRole
  resource: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
}

// ─── Supabase client (service role for admin ops) ────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars for admin auth')
  return createClient(url, key)
}

// ─── Password Hashing ────────────────────────────────────────────

const BCRYPT_ROUNDS = 12

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS)
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash)
}

// ─── Session Tokens ──────────────────────────────────────────────

const SESSION_DURATION_HOURS = 8

/**
 * Generate a cryptographically secure session token.
 * Returns { raw, hash } — store the hash, send the raw to the client.
 */
export function generateSessionToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

// ─── Login ───────────────────────────────────────────────────────

export interface LoginResult {
  success: boolean
  token?: string
  admin?: AdminAccount
  error?: string
}

export async function adminLogin(
  email: string,
  password: string,
  ip?: string,
  userAgent?: string
): Promise<LoginResult> {
  const supabase = getServiceClient()

  // 1. Find admin account
  const { data: admin, error: findErr } = await supabase
    .from('admin_accounts')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (findErr || !admin) {
    // Audit: failed login attempt
    await auditLog(null, 'login_failed', 'admin_accounts', null, { email, reason: 'not_found' }, ip)
    return { success: false, error: 'Invalid email or password' }
  }

  if (!admin.is_active) {
    await auditLog(admin.id, 'login_failed', 'admin_accounts', admin.id, { reason: 'inactive' }, ip)
    return { success: false, error: 'Account is deactivated' }
  }

  // 2. Verify password
  const validPassword = await verifyPassword(password, admin.password_hash)
  if (!validPassword) {
    await auditLog(admin.id, 'login_failed', 'admin_accounts', admin.id, { reason: 'bad_password' }, ip)
    return { success: false, error: 'Invalid email or password' }
  }

  // 3. Create session
  const { raw: token, hash: tokenHash } = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString()

  const { error: sessErr } = await supabase
    .from('admin_sessions')
    .insert({
      admin_id: admin.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      ip_address: ip || null,
      user_agent: userAgent || null,
    })

  if (sessErr) {
    console.error('Failed to create admin session:', sessErr)
    return { success: false, error: 'Session creation failed' }
  }

  // 4. Update last_login_at
  await supabase
    .from('admin_accounts')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', admin.id)

  // 5. Audit: successful login
  await auditLog(admin.id, 'login', 'admin_sessions', null, { ip }, ip)

  // Return admin without password hash
  const { password_hash, ...safeAdmin } = admin

  return { success: true, token, admin: safeAdmin as AdminAccount }
}

// ─── Session Validation ──────────────────────────────────────────

export async function validateSession(token: string): Promise<AdminAccount | null> {
  if (!token) return null

  const supabase = getServiceClient()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  // Find session
  const { data: session, error: sessErr } = await supabase
    .from('admin_sessions')
    .select('*, admin_accounts(*)')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (sessErr || !session) return null

  const admin = session.admin_accounts as any
  if (!admin || !admin.is_active) return null

  const { password_hash, ...safeAdmin } = admin
  return safeAdmin as AdminAccount
}

// ─── Logout ──────────────────────────────────────────────────────

export async function adminLogout(token: string): Promise<void> {
  const supabase = getServiceClient()
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const admin = await validateSession(token)

  await supabase
    .from('admin_sessions')
    .delete()
    .eq('token_hash', tokenHash)

  if (admin) {
    await auditLog(admin.id, 'logout', 'admin_sessions', null, null, null)
  }
}

// ─── Permission Checks ──────────────────────────────────────────

export async function checkPermission(
  role: AdminRole,
  resource: string,
  action: 'read' | 'write' | 'delete'
): Promise<boolean> {
  // Boss can do everything
  if (role === 'boss') return true

  const supabase = getServiceClient()

  const { data: perm, error } = await supabase
    .from('admin_permissions')
    .select('*')
    .eq('role', role)
    .eq('resource', resource)
    .single()

  if (error || !perm) return false

  switch (action) {
    case 'read': return perm.can_read
    case 'write': return perm.can_write
    case 'delete': return perm.can_delete
    default: return false
  }
}

/**
 * Require permission — throws if denied.
 * Use in API routes: await requirePermission(admin.role, 'disputes', 'write')
 */
export async function requirePermission(
  role: AdminRole,
  resource: string,
  action: 'read' | 'write' | 'delete'
): Promise<void> {
  const allowed = await checkPermission(role, resource, action)
  if (!allowed) {
    throw new PermissionDeniedError(role, resource, action)
  }
}

export class PermissionDeniedError extends Error {
  role: AdminRole
  resource: string
  action: string

  constructor(role: AdminRole, resource: string, action: string) {
    super(`Permission denied: ${role} cannot ${action} ${resource}`)
    this.name = 'PermissionDeniedError'
    this.role = role
    this.resource = resource
    this.action = action
  }
}

// ─── Audit Log ───────────────────────────────────────────────────

export async function auditLog(
  adminId: string | null,
  action: string,
  resource: string,
  resourceId: string | null,
  details: Record<string, any> | null,
  ipAddress: string | null
): Promise<void> {
  try {
    const supabase = getServiceClient()
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        action,
        resource,
        resource_id: resourceId,
        details: details || {},
        ip_address: ipAddress,
      })
  } catch (err) {
    // Audit log failures should never break operations
    console.error('Audit log write failed:', err)
  }
}

// ─── Token Extraction Helper ─────────────────────────────────────

/**
 * Extract admin token from request headers.
 * Supports: Authorization: Bearer <token>
 * Also checks: X-Admin-Token: <token> (for non-browser clients)
 */
export function extractToken(headers: Headers): string | null {
  const auth = headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7)
  }
  return headers.get('x-admin-token')
}
