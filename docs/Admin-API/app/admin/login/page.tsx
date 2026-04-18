/**
 * Admin Login Page
 *
 * Drop into: src/app/admin/login/page.tsx
 *
 * Minimal, branded login form. Redirects to /admin on success.
 * No Supabase Auth — uses the separate admin_accounts system.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Store token for API calls (cookie is set automatically for /admin paths)
      sessionStorage.setItem('admin_token', data.token)

      router.push('/admin')
    } catch (err) {
      setError('Network error — check your connection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0A1628',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        width: 400,
        padding: 40,
        background: '#111C2E',
        borderRadius: 12,
        border: '1px solid rgba(201, 168, 76, 0.2)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.2em',
            color: '#C9A84C',
            fontWeight: 700,
            marginBottom: 8,
          }}>
            STUDIOLEDGER
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#F5F0E8',
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}>
            Admin Console
          </div>
          <div style={{
            fontSize: 13,
            color: '#8899AA',
            marginTop: 4,
          }}>
            @studioledger.ai accounts only
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 6,
            color: '#FCA5A5',
            fontSize: 13,
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 500,
              color: '#8899AA',
              letterSpacing: '0.08em',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@studioledger.ai"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0A1628',
                border: '1px solid rgba(136, 153, 170, 0.3)',
                borderRadius: 6,
                color: '#F5F0E8',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 500,
              color: '#8899AA',
              letterSpacing: '0.08em',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0A1628',
                border: '1px solid rgba(136, 153, 170, 0.3)',
                borderRadius: 6,
                color: '#F5F0E8',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 0',
              background: loading ? '#8B7A3A' : '#C9A84C',
              color: '#0A1628',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              letterSpacing: '0.05em',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 11,
          color: '#556677',
        }}>
          Separate from user accounts. Session expires in 8 hours.
        </div>
      </div>
    </div>
  )
}
