'use client';

import Link from 'next/link';
import { Bell, Briefcase, Sun, Moon, Search, Command } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useCommandPalette } from '@/contexts/CommandPaletteContext';
import { useUser } from '@/hooks';
import { TOPBAR_ROLE } from '@/config/constants';
import { useEffect } from 'react';

interface Crumb {
  label: string;
  href?: string;
}

interface TopBarProps {
  title?: string;
  breadcrumbs?: Crumb[];
}

/** Creator badge: blue + radius glow. Marketmaker badge: green + radius glow (--marketmaker, --marketmaker-glow). */
const CREATOR_GLOW = 'drop-shadow(0 0 4px var(--accent-blue)) drop-shadow(0 0 10px var(--accent-blue)) drop-shadow(0 0 20px var(--accent-blue))';

export default function TopBar({ title, breadcrumbs }: TopBarProps) {
  const network = process.env.NEXT_PUBLIC_XRPL_NETWORK || 'testnet';
  const { theme, toggleTheme } = useTheme();
  const { open: openCommandPalette } = useCommandPalette();
  const { data: user } = useUser();
  const isMarketmaker = user?.role === 'marketplace';

  // Cmd+K / Ctrl+K opens command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openCommandPalette]);

  // Default breadcrumb — fallback to title prop for backward compatibility
  const crumbs: Crumb[] = breadcrumbs && breadcrumbs.length > 0
    ? breadcrumbs
    : [{ label: title || 'Dashboard' }];

  return (
    <header
      className="h-[60px] px-6 flex items-center gap-5 shrink-0"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Left — Breadcrumbs + Role badge (Creator or Marketmaker) */}
      <div className="flex items-center gap-3 shrink-0">
        <nav className="flex items-center gap-2">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-lg" style={{ color: 'var(--text-muted)' }}>/</span>
                )}
                {isLast ? (
                  <span
                    className="text-xl font-bold tracking-tight"
                    style={{ color: 'var(--text)' }}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href || '/dashboard'}
                    className="text-lg font-medium tracking-tight transition-colors duration-200"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Role badge: Marketmaker (green, radius) when marketplace; Creator (blue, radius) otherwise */}
        <span
          className="px-3 py-1 rounded-lg text-[13px] font-bold uppercase tracking-wider"
          style={
            isMarketmaker
              ? { color: 'var(--marketmaker)', filter: 'var(--marketmaker-glow)' }
              : { color: 'var(--accent-blue)', filter: CREATOR_GLOW }
          }
        >
          {isMarketmaker ? TOPBAR_ROLE.MARKETMAKER_LABEL : TOPBAR_ROLE.CREATOR_LABEL}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        {/* Marketplace CTA — role-aware label */}
        <Link
          href="/dashboard/marketplace"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[15px] font-semibold transition-colors duration-200 shrink-0"
          style={{ color: 'var(--text)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <Briefcase size={16} strokeWidth={1.8} />
          {isMarketmaker ? 'Hire' : 'Find a Project'}
        </Link>

        {/* Separator */}
        <div className="w-px h-6 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

        {/* Network badge — escrow orange */}
        <span
          className="px-3 py-1 rounded-lg text-[14px] font-bold tracking-wide shrink-0"
          style={{
            color: 'var(--escrow)',
            filter: 'drop-shadow(0 0 4px var(--escrow)) drop-shadow(0 0 10px var(--escrow)) drop-shadow(0 0 20px var(--escrow))',
          }}
        >
          {network}
        </span>

        {/* Search pill — click or Cmd+K opens command palette; hint when focused */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="relative flex items-center rounded-xl px-3 py-2 w-[180px] shrink-0 border text-left"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--separator)',
          }}
        >
          <Search
            size={15}
            strokeWidth={1.8}
            className="shrink-0"
            style={{ color: 'var(--text-muted)' }}
          />
          <span
            className="flex-1 min-w-0 text-[15px] px-2 truncate"
            style={{ color: 'var(--text-muted)' }}
          >
            Search…
          </span>
          <div
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[13px] font-semibold shrink-0"
            style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}
          >
            <Command size={11} strokeWidth={1.8} />
            K
          </div>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-colors duration-200 shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark'
            ? <Sun size={20} strokeWidth={1.8} />
            : <Moon size={20} strokeWidth={1.8} />
          }
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl transition-colors duration-200 shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <Bell size={20} strokeWidth={1.8} />
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--status-disputed)' }}
          />
        </button>
      </div>
    </header>
  );
}
