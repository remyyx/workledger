'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import { useUser } from '@/hooks';
import { useWalletStore } from '@/stores/wallet-store';
import { cn } from '@/lib/utils';

const strategies = [
  { value: 'single', label: 'Single Currency', description: 'Receive all payments in one currency' },
  { value: 'split', label: 'Split', description: 'Split payments across multiple currencies' },
  { value: 'stack', label: 'Stack', description: 'Accumulate and hold in chosen currencies' },
] as const;

const currencyOptions = ['EUR', 'USD', 'GBP', 'AUD', 'XRP', 'RLUSD'];

export default function SettingsPage() {
  const { displayCurrency, setDisplayCurrency } = useWalletStore();
  const { data: user, isLoading } = useUser();

  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    skills: '',
  });

  const [payoutStrategy, setPayoutStrategy] = useState('single');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfile({
        displayName: user.display_name || '',
        bio: user.bio || '',
        skills: (user.skills || []).join(', '),
      });
      setPayoutStrategy(user.payout_config?.strategy || 'single');
    }
  }, [user]);

  async function handleSave() {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName,
          bio: profile.bio,
          skills: profile.skills.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        console.error('[settings] Save failed:', res.status);
        setSaveError('Failed to save. Try again.');
        setTimeout(() => setSaveError(null), 3000);
        return;
      }
    } catch {
      setSaveError('Failed to save. Try again.');
      setTimeout(() => setSaveError(null), 3000);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (isLoading) {
    return (
      <>
        <TopBar title="Settings" />
        <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
          <SkeletonCard />
        </div>
      </>
    );
  }

  const initials = user?.display_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <>
      <TopBar title="Settings" />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        {/* Profile Link Block — goes to profile page */}
        <Link href="/dashboard/profile" className="block mb-6">
          <div
            className="card flex items-center gap-4 transition-colors cursor-pointer border"
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--escrow), var(--accent-purple))', color: 'var(--text)' }}
            >
              <span className="text-sm font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold" style={{ color: 'var(--text)' }}>{user?.display_name || 'Set up profile'}</p>
              <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{user?.role || 'creator'} — View your profile</p>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
        </Link>

        {/* Profile Details — editable */}
        <div className="card mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Profile Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                className="input min-h-[80px] resize-y"
                placeholder="Tell clients about yourself..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Skills (comma-separated)</label>
              <input
                type="text"
                value={profile.skills}
                onChange={(e) => setProfile((p) => ({ ...p, skills: e.target.value }))}
                className="input"
                placeholder="React, TypeScript, XRPL"
              />
            </div>
          </div>
        </div>

        {/* Payout Configuration */}
        <div className="card mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Payout Strategy</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {strategies.map((s) => (
              <button
                key={s.value}
                onClick={() => setPayoutStrategy(s.value)}
                className={cn('card text-center transition-all !p-4 border', payoutStrategy === s.value && 'ring-2')}
                style={
                  payoutStrategy === s.value
                    ? { borderColor: 'var(--escrow)', boxShadow: '0 0 0 2px var(--escrow-bg)' }
                    : { borderColor: 'var(--border)' }
                }
              >
                <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{s.label}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
              </button>
            ))}
          </div>

          {payoutStrategy === 'split' && user?.payout_config?.allocations && (
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Current Allocations</p>
              {user.payout_config.allocations.map((alloc) => (
                <div key={alloc.currency} className="flex items-center gap-3 mb-2">
                  <div className="flex-1 rounded-full h-2" style={{ backgroundColor: 'var(--hover)' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${alloc.percentage}%`, backgroundColor: 'var(--escrow)' }}
                    />
                  </div>
                  <span className="text-sm font-medium w-20" style={{ color: 'var(--text)' }}>{alloc.currency}</span>
                  <span className="text-sm w-12 text-right" style={{ color: 'var(--text-muted)' }}>{alloc.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Display Currency */}
        <div className="card mb-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Display Currency</h3>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            Choose which currency to show prices and balances in.
          </p>
          <div className="flex gap-2 flex-wrap">
            {currencyOptions.map((c) => (
              <button
                key={c}
                onClick={() => setDisplayCurrency(c)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                  displayCurrency === c && 'btn-primary'
                )}
                style={
                  displayCurrency !== c
                    ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)', borderColor: 'var(--border)' }
                    : undefined
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} className="btn-primary">
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
        {saveError && (
          <p className="text-sm mt-2" style={{ color: '#ef4444' }}>{saveError}</p>
        )}
      </div>
    </>
  );
}
