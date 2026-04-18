'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface TestUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

const IS_DEV = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true';

/**
 * Dev-only user switcher. Shows a dropdown of test users
 * and switches the impersonated identity via cookie.
 * Only renders when NEXT_PUBLIC_SKIP_AUTH=true.
 */
export default function DevUserSwitcher() {
  const [users, setUsers] = useState<TestUser[]>([]);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!IS_DEV) return;
    fetch('/api/dev/switch-user')
      .then(r => r.json())
      .then(data => {
        setUsers(data.users || []);
        setCurrentEmail(data.currentEmail);
      })
      .catch(() => {});
  }, []);

  async function switchTo(email: string) {
    setSwitching(true);
    try {
      const res = await fetch('/api/dev/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.switched) {
        setCurrentEmail(email);
        // Hard reload to force all server components + client cache to reset.
        // The server-side in-memory store already has the new email —
        // no cookies needed (Brave blocks them).
        window.location.reload();
      }
    } catch {
      // ignore
    } finally {
      setSwitching(false);
    }
  }

  // Don't render in production or if no users loaded
  if (!IS_DEV || users.length === 0) return null;

  const current = users.find(u => u.email === currentEmail);

  return (
    <div style={{
      padding: '8px 12px',
      margin: '8px 12px',
      borderRadius: '8px',
      background: 'rgba(251, 146, 60, 0.1)',
      border: '1px solid rgba(251, 146, 60, 0.3)',
      fontSize: '11px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginBottom: '6px',
        color: '#FB923C',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
      }}>
        <span>DEV USER</span>
        {switching && <RefreshCw size={10} className="animate-spin" />}
      </div>
      <select
        value={currentEmail || ''}
        onChange={e => switchTo(e.target.value)}
        disabled={switching}
        style={{
          width: '100%',
          padding: '4px 6px',
          borderRadius: '6px',
          background: 'var(--bg-surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          fontSize: '11px',
          cursor: 'pointer',
        }}
      >
        <option value="" disabled>Select user...</option>
        {users.map(u => (
          <option key={u.email} value={u.email}>
            {u.role === 'creator' ? '🎨' : '🏪'} {u.display_name || u.email}
          </option>
        ))}
      </select>
      {current && (
        <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '10px' }}>
          {current.role} · {current.email.split('@')[0]}
        </div>
      )}
    </div>
  );
}
