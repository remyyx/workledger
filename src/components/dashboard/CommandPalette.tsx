'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Award,
  Plus,
  Settings,
  User,
  Search,
  Command,
  Briefcase,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  href: string;
  icon: LucideIcon;
}

const COMMANDS: CommandItem[] = [
  { id: 'profile', label: 'Profile', href: '/dashboard/profile', icon: User },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'contracts', label: 'Smart Contracts', subtitle: 'Contracts & milestones', href: '/dashboard/contracts', icon: FileText },
  { id: 'new-contract', label: 'New contract', subtitle: 'Create a contract', href: '/dashboard/contracts/new', icon: Plus },
  { id: 'credentials', label: 'Credential Assets', subtitle: 'MCC tokens', href: '/dashboard/nfts', icon: Award },
  { id: 'balance', label: 'Balance', subtitle: 'Wallet & transactions', href: '/dashboard/wallet', icon: Wallet },
  { id: 'payments', label: 'Payments', subtitle: 'Payment history', href: '/dashboard/payments', icon: Wallet },
  { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { id: 'marketplace', label: 'Marketplace', subtitle: 'Browse & hire', href: '/dashboard/marketplace', icon: Briefcase },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase().trim();
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.subtitle?.toLowerCase().includes(q))
    );
  }, [query]);

  const select = useCallback(
    (item: CommandItem) => {
      router.push(item.href);
      onClose();
      setQuery('');
      setSelectedIndex(0);
    },
    [router, onClose]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        select(filtered[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, filtered, selectedIndex, select]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-[20%] -translate-x-1/2 z-50 w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contracts, credentials, or go to a page…"
            className="flex-1 bg-transparent border-none outline-none text-[15px] py-1"
            style={{ color: 'var(--text)', caretColor: 'var(--escrow)' }}
            autoFocus
          />
          <span
            className="px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            <Command size={12} className="inline mr-0.5" />K
          </span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              No matches
            </p>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{
                    backgroundColor: isSelected ? 'var(--hover)' : 'transparent',
                  }}
                >
                  <Icon size={18} style={{ color: 'var(--text-muted)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {item.label}
                    </p>
                    {item.subtitle && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
