/**
 * Admin Dashboard — Main Page
 *
 * Drop into: src/app/admin/page.tsx
 *
 * Overview dashboard with:
 * - Platform stats (contracts, disputes, revenue, MCCs)
 * - Recent disputes panel
 * - Quick actions
 * - Admin account management (boss only)
 *
 * Uses the admin session cookie (set by /api/admin/login).
 * Falls back to sessionStorage token for API calls.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────

interface Admin {
  id: string
  email: string
  display_name: string
  role: string
  is_active: boolean
  last_login_at: string | null
}

interface Dispute {
  id: string
  status: string
  reason: string
  created_at: string
  contracts?: { title: string }
  milestones?: { title: string; amount: number; currency: string }
  creator?: { display_name: string }
  client?: { display_name: string }
}

interface Stats {
  contracts: { total: number; active: number; completed: number }
  disputes: { open: number; escalated: number; resolved: number }
  revenue: { total_fees: number; currency: string }
  mccs: { minted: number }
}

// ─── Styles ──────────────────────────────────────────────────────

const colors = {
  bg: '#0A1628',
  card: '#111C2E',
  cardBorder: 'rgba(201, 168, 76, 0.15)',
  gold: '#C9A84C',
  cream: '#F5F0E8',
  muted: '#8899AA',
  dim: '#556677',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
}

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: 10,
  padding: 24,
}

// ─── Helpers ─────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('admin_token')
}

async function adminFetch(path: string, options?: RequestInit) {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(path, { ...options, headers, credentials: 'include' })
  if (res.status === 401) {
    sessionStorage.removeItem('admin_token')
    window.location.href = '/admin/login'
    throw new Error('Session expired')
  }
  return res
}

// ─── Component ───────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [permissions, setPermissions] = useState<any>(null)
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'disputes' | 'accounts'>('overview')

  // ─── Load session ────────────────────────────────────────────

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await adminFetch('/api/admin/me')
        if (!res.ok) throw new Error('Session invalid')
        const data = await res.json()
        setAdmin(data.admin)
        setPermissions(data.permissions)
      } catch {
        router.push('/admin/login')
        return
      }

      // Load disputes
      try {
        const res = await adminFetch('/api/admin/disputes?limit=10')
        if (res.ok) {
          const data = await res.json()
          setDisputes(data.disputes || [])
        }
      } catch {}

      // Stats would come from a dedicated endpoint — placeholder for now
      setStats({
        contracts: { total: 0, active: 0, completed: 0 },
        disputes: { open: 0, escalated: 0, resolved: 0 },
        revenue: { total_fees: 0, currency: 'RLUSD' },
        mccs: { minted: 0 },
      })

      setLoading(false)
    }

    loadSession()
  }, [router])

  // ─── Logout ──────────────────────────────────────────────────

  const handleLogout = async () => {
    try {
      await adminFetch('/api/admin/logout', { method: 'POST' })
    } catch {}
    sessionStorage.removeItem('admin_token')
    router.push('/admin/login')
  }

  // ─── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg,
        color: colors.muted,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        Loading admin console...
      </div>
    )
  }

  if (!admin) return null

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      color: colors.cream,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* ─── Top Bar ───────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: `1px solid ${colors.cardBorder}`,
        background: colors.card,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontSize: 10,
            letterSpacing: '0.2em',
            color: colors.gold,
            fontWeight: 700,
          }}>
            STUDIOLEDGER
          </span>
          <span style={{ color: colors.dim }}>|</span>
          <span style={{ fontSize: 14, color: colors.muted }}>Admin Console</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: colors.cream }}>{admin.display_name}</div>
            <div style={{ fontSize: 11, color: colors.dim }}>
              {admin.role.toUpperCase()} — {admin.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: `1px solid ${colors.dim}`,
              borderRadius: 6,
              color: colors.muted,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ─── Tab Bar ───────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 0,
        padding: '0 32px',
        borderBottom: `1px solid ${colors.cardBorder}`,
        background: colors.card,
      }}>
        {(['overview', 'disputes', 'accounts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${colors.gold}` : '2px solid transparent',
              color: activeTab === tab ? colors.gold : colors.muted,
              fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              textTransform: 'capitalize',
              letterSpacing: '0.03em',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Content ───────────────────────────────────────── */}
      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* === Overview Tab === */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 24,
            }}>
              <StatCard label="Total Contracts" value={stats?.contracts.total || 0} accent={colors.gold} />
              <StatCard label="Active Contracts" value={stats?.contracts.active || 0} accent="#3B82F6" />
              <StatCard label="Open Disputes" value={stats?.disputes.open || 0} accent={colors.warning} />
              <StatCard label="MCCs Minted" value={stats?.mccs.minted || 0} accent={colors.success} />
            </div>

            {/* Recent Disputes */}
            <div style={cardStyle}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.muted,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                Recent Disputes
              </div>
              {disputes.length === 0 ? (
                <div style={{ color: colors.dim, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                  No disputes yet. Platform is running clean.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {disputes.slice(0, 5).map((d) => (
                    <DisputeRow key={d.id} dispute={d} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === Disputes Tab === */}
        {activeTab === 'disputes' && (
          <DisputesPanel
            disputes={disputes}
            admin={admin}
            onRefresh={async () => {
              const res = await adminFetch('/api/admin/disputes?limit=50')
              if (res.ok) {
                const data = await res.json()
                setDisputes(data.disputes || [])
              }
            }}
          />
        )}

        {/* === Accounts Tab (boss only) === */}
        {activeTab === 'accounts' && (
          admin.role === 'boss' ? (
            <AccountsPanel admin={admin} />
          ) : (
            <div style={{
              ...cardStyle,
              textAlign: 'center',
              padding: 48,
              color: colors.dim,
            }}>
              Account management is restricted to boss role.
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      ...cardStyle,
      borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 11, color: colors.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: colors.cream, marginTop: 4 }}>
        {value}
      </div>
    </div>
  )
}

function DisputeRow({ dispute }: { dispute: Dispute }) {
  const statusColors: Record<string, string> = {
    open: colors.warning,
    escalated: colors.danger,
    resolved: colors.success,
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 6,
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div>
        <div style={{ fontSize: 13, color: colors.cream }}>
          {dispute.contracts?.title || 'Unknown Contract'}
        </div>
        <div style={{ fontSize: 11, color: colors.dim, marginTop: 2 }}>
          {dispute.creator?.display_name} vs {dispute.client?.display_name}
          {dispute.milestones && ` — ${dispute.milestones.amount} ${dispute.milestones.currency}`}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 11, color: colors.dim }}>
          {new Date(dispute.created_at).toLocaleDateString()}
        </div>
        <span style={{
          padding: '3px 10px',
          borderRadius: 10,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: statusColors[dispute.status] || colors.muted,
          background: `${statusColors[dispute.status] || colors.muted}20`,
        }}>
          {dispute.status}
        </span>
      </div>
    </div>
  )
}

function DisputesPanel({
  disputes,
  admin,
  onRefresh,
}: {
  disputes: Dispute[]
  admin: Admin
  onRefresh: () => Promise<void>
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const handleAction = async (disputeId: string, action: string, params?: any) => {
    setActionLoading(true)
    try {
      const res = await adminFetch('/api/admin/disputes', {
        method: 'POST',
        body: JSON.stringify({ dispute_id: disputeId, action, ...params }),
      })
      if (res.ok) {
        await onRefresh()
        setSelected(null)
      }
    } catch {}
    setActionLoading(false)
  }

  return (
    <div style={cardStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: colors.muted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          All Disputes ({disputes.length})
        </div>
        <button
          onClick={onRefresh}
          style={{
            padding: '6px 14px',
            background: 'transparent',
            border: `1px solid ${colors.dim}`,
            borderRadius: 6,
            color: colors.muted,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {disputes.length === 0 ? (
        <div style={{ color: colors.dim, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
          No disputes found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {disputes.map((d) => (
            <div key={d.id}>
              <div
                onClick={() => setSelected(selected === d.id ? null : d.id)}
                style={{ cursor: 'pointer' }}
              >
                <DisputeRow dispute={d} />
              </div>

              {/* Action panel (expanded) */}
              {selected === d.id && d.status !== 'resolved' && (
                <div style={{
                  display: 'flex',
                  gap: 8,
                  padding: '12px 16px',
                  background: 'rgba(201, 168, 76, 0.05)',
                  borderRadius: '0 0 6px 6px',
                  borderTop: 'none',
                }}>
                  {d.status === 'open' && (
                    <ActionButton
                      label="Escalate"
                      color={colors.warning}
                      loading={actionLoading}
                      onClick={() => handleAction(d.id, 'escalate')}
                    />
                  )}
                  <ActionButton
                    label="Resolve — Creator Wins"
                    color={colors.success}
                    loading={actionLoading}
                    onClick={() => handleAction(d.id, 'resolve', {
                      resolution: 'creator_wins',
                      refund_percent: 0,
                    })}
                  />
                  <ActionButton
                    label="Resolve — Client Wins"
                    color="#3B82F6"
                    loading={actionLoading}
                    onClick={() => handleAction(d.id, 'resolve', {
                      resolution: 'client_wins',
                      refund_percent: 100,
                    })}
                  />
                  <ActionButton
                    label="Resolve — Split 50/50"
                    color={colors.muted}
                    loading={actionLoading}
                    onClick={() => handleAction(d.id, 'resolve', {
                      resolution: 'split',
                      refund_percent: 50,
                    })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActionButton({
  label,
  color,
  loading,
  onClick,
}: {
  label: string
  color: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '6px 12px',
        background: `${color}20`,
        border: `1px solid ${color}40`,
        borderRadius: 4,
        color,
        fontSize: 11,
        fontWeight: 500,
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}

function AccountsPanel({ admin }: { admin: Admin }) {
  const [accounts, setAccounts] = useState<Admin[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  useEffect(() => {
    // TODO: Wire to /api/admin/accounts endpoint
    // For now, show placeholder
    setLoadingAccounts(false)
  }, [])

  return (
    <div style={cardStyle}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: colors.muted,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 20,
      }}>
        Admin Accounts
      </div>

      <div style={{
        padding: '40px 0',
        textAlign: 'center',
        color: colors.dim,
        fontSize: 13,
      }}>
        <div style={{ marginBottom: 12 }}>
          Account management coming in next sprint.
        </div>
        <div style={{ fontSize: 11 }}>
          For now, use the seed script or Supabase dashboard to manage admin accounts.
        </div>
        <div style={{
          marginTop: 16,
          padding: '10px 16px',
          background: 'rgba(201, 168, 76, 0.08)',
          borderRadius: 6,
          display: 'inline-block',
        }}>
          <code style={{ fontSize: 12, color: colors.gold }}>
            npx tsx scripts/seed-boss.ts
          </code>
        </div>
      </div>

      {/* Role reference */}
      <div style={{
        borderTop: `1px solid ${colors.cardBorder}`,
        paddingTop: 20,
        marginTop: 20,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: colors.muted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          Role Reference
        </div>
        {[
          { role: 'boss', desc: 'Full access — platform owner', color: colors.gold },
          { role: 'dev', desc: 'Database + architecture', color: '#3B82F6' },
          { role: 'accounting', desc: 'Financial data + fee tracking', color: colors.success },
          { role: 'commercial', desc: 'Contracts + dispute resolution', color: colors.warning },
          { role: 'protocol', desc: 'UX/UI + user experience', color: '#A855F7' },
        ].map(({ role, desc, color }) => (
          <div key={role} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0',
            borderBottom: `1px solid rgba(255,255,255,0.03)`,
          }}>
            <span style={{
              padding: '2px 10px',
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color,
              background: `${color}20`,
              minWidth: 80,
              textAlign: 'center',
            }}>
              {role}
            </span>
            <span style={{ fontSize: 12, color: colors.muted }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
