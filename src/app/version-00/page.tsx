/**
 * Version 00 design preview — dark dashboard (archive).
 * Open http://localhost:3000/version-00 to view.
 */

import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Award,
  DollarSign,
  Lock,
  Shield,
  Plus,
  ChevronRight,
} from 'lucide-react';

export default function Version00Page() {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar mock */}
      <aside
        className="w-[240px] min-h-full flex flex-col shrink-0 border-r"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--separator)' }}
      >
        <div className="py-6 px-5">
          <span className="font-bold text-2xl tracking-tight" style={{ color: 'var(--text)' }}>
            StudioLedger.ai
          </span>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-1">
          {[
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
            { href: '/dashboard/wallet', label: 'Balance', icon: Wallet, active: false },
            { href: '/dashboard/contracts', label: 'Smart Contracts', icon: FileText, active: false },
            { href: '/dashboard/nfts', label: 'Credentials', icon: Award, active: false },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.active ? 'sidebar-link sidebar-link-active' : 'sidebar-link'}
            >
              <item.icon size={20} strokeWidth={1.5} className="shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="py-4 px-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}
          >
            JD
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar mock */}
        <div
          className="h-[60px] px-6 flex items-center border-b shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Dashboard
          </span>
          <span
            className="ml-3 px-3 py-1 rounded-lg text-[13px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--accent-blue)' }}
          >
            Creator
          </span>
          <span className="ml-auto px-3 py-1 rounded-lg text-sm font-bold" style={{ color: 'var(--escrow)' }}>
            testnet
          </span>
        </div>

        {/* Stats */}
        <div className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Total Earned', value: '$2,450', color: 'var(--accent-green)', Icon: DollarSign },
              { label: 'Active Contracts', value: '3', color: 'var(--accent-blue)', Icon: FileText },
              { label: 'In Escrow', value: '$1,200', color: 'var(--escrow)', Icon: Lock },
              { label: 'Credentials', value: '12', color: 'var(--accent-purple)', Icon: Award },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                <s.Icon
                  size={20}
                  strokeWidth={1.8}
                  className="shrink-0"
                  style={{ color: s.color }}
                />
                <div>
                  <p className="text-xl font-bold leading-tight" style={{ color: 'var(--text)' }}>
                    {s.value}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3-column */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left — Escrow */}
          <div className="w-56 shrink-0 hidden md:flex flex-col gap-2 p-2 overflow-y-auto">
            <div
              className="rounded-2xl p-3 border"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--separator)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield size={12} style={{ color: 'var(--escrow)' }} />
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--escrow)' }}>
                  Escrow
                </h3>
              </div>
              <div className="space-y-1.5">
                <div
                  className="p-2.5 rounded-xl border-l-2"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderLeftColor: 'var(--escrow)' }}
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] font-medium uppercase" style={{ color: 'var(--escrow)' }}>
                      Locked
                    </span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>$400</span>
                  </div>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                    Logo design
                  </p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                    Brand pack
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--separator)' }}>
                <div className="flex justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total locked</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--escrow-light)' }}>$1,200</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>
                  Active Contracts
                </h2>
                <Link
                  href="/dashboard/contracts/new"
                  className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <Plus size={10} /> New
                </Link>
              </div>
              <div className="space-y-1">
                {['Brand pack', 'Website copy', 'Illustration set'].map((title, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{title}</span>
                      <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                        Marketplace
                      </span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>$800</span>
                    <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Feed */}
          <div className="w-64 shrink-0 hidden md:flex flex-col p-2 overflow-y-auto">
            <div
              className="rounded-2xl p-3 border"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--separator)' }}
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                Feed
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Milestone released · $400
              </p>
              <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                Escrow funded · $800
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
