'use client';

// ============================================
// Dashboard — v1.0: primary action strip, escrow prominence, staggered reveal
// ============================================

import Link from 'next/link';
import {
  DollarSign, FileText, Lock, Award, Plus,
  ArrowUpRight, ArrowDownLeft, ChevronRight, Trophy, Shield
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import WalletConnectBanner from '@/components/auth/WalletConnectBanner';
import OnboardingStrip from '@/components/dashboard/OnboardingStrip';
import { useDashboardStats, useContracts, useMCCs, useTransactions, useUser } from '@/hooks';
import { useWalletStore } from '@/stores/wallet-store';
import { formatAmount, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { data: user } = useUser();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: contractsData, isLoading: contractsLoading } = useContracts('all');
  const { data: mccsData, isLoading: mccsLoading } = useMCCs();
  const { data: txData, isLoading: txLoading } = useTransactions(1);
  const walletAddress = useWalletStore((s) => s.address);

  const needsWallet = user && !user.xrpl_address && !walletAddress;
  const isMarketmaker = user?.role === 'marketplace';

  const activeContracts = (contractsData?.contracts || []).filter(
    (c) => c.status === 'active' || c.status === 'funded' || c.status === 'draft'
  );

  const recentMCCs = (mccsData?.mccs || []).slice(0, 4);
  const recentTx = (txData?.transactions || []).slice(0, 8);

  const escrowMilestones = (contractsData?.contracts || [])
    .flatMap((c) =>
      (c.milestones || [])
        .filter((m) => m.status === 'funded' || m.status === 'submitted')
        .map((m) => ({
          ...m,
          contractTitle: c.title,
          currency: c.currency,
        }))
    )
    .slice(0, 6);

  const submittedCount = escrowMilestones.filter((m) => m.status === 'submitted').length;
  const hasReviewAction = submittedCount > 0;

  return (
    <>
      <TopBar breadcrumbs={[{ label: 'Dashboard' }]} />

      {needsWallet && (
        <div className="px-4 pt-4">
          <WalletConnectBanner />
        </div>
      )}

      {/* First-run onboarding strip — 3 steps, dismissible; hide when user has contracts or MCCs */}
      {!needsWallet &&
        !contractsLoading &&
        !mccsLoading &&
        (contractsData?.contracts?.length ?? 0) === 0 &&
        (mccsData?.mccs?.length ?? 0) === 0 && (
          <div className="px-4 pt-4 pb-1">
            <OnboardingStrip />
          </div>
        )}

      {/* Primary action strip — role-aware CTA */}
      {!statsLoading && !needsWallet && (
        <div className="px-2 pt-2">
          {hasReviewAction ? (
            /* Review milestones — shown for both roles when deliverables are pending */
            <div
              className="rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-fade-in-stagger stagger-1"
              style={{
                backgroundColor: 'var(--escrow-bg)',
                borderLeft: '4px solid var(--escrow)',
              }}
            >
              <div className="flex items-center gap-3">
                <Shield size={20} style={{ color: 'var(--escrow)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {submittedCount} milestone{submittedCount !== 1 ? 's' : ''} awaiting your review
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Approve to release escrow and mint credentials
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/contracts"
                className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5"
              >
                Review milestones <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            /* Post a Project (MK) / Post an Offer (CR) */
            <Link
              href="/dashboard/contracts/new"
              className="block rounded-2xl p-4 animate-fade-in-stagger stagger-1 transition-all duration-200 group"
              style={{
                backgroundColor: isMarketmaker ? 'var(--accent-blue-bg)' : 'var(--accent-burgundy2-bg)',
                borderLeft: isMarketmaker ? '4px solid var(--accent-blue)' : '4px solid var(--accent-burgundy2)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Plus
                    size={20}
                    style={{
                      color: isMarketmaker ? 'var(--accent-blue)' : 'var(--accent-burgundy2)',
                      filter: isMarketmaker
                        ? 'drop-shadow(0 0 4px var(--accent-blue)) drop-shadow(0 0 10px var(--accent-blue))'
                        : 'drop-shadow(0 0 6px var(--accent-burgundy2)) drop-shadow(0 0 14px var(--accent-burgundy2))',
                    }}
                  />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {isMarketmaker ? 'Post a Project' : 'Post an Offer'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {isMarketmaker
                        ? 'Find talent, set a budget, and fund with escrow protection.'
                        : 'Describe your services, set your rate, and attract clients.'}
                    </p>
                  </div>
                </div>
                <span
                  className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> {isMarketmaker ? 'Post a Project' : 'Post an Offer'}
                </span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="px-2 pt-2 pb-1 animate-fade-in-stagger stagger-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[72px] rounded-2xl animate-pulse"
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                />
              ))
            : [
                { label: isMarketmaker ? 'Total Spent' : 'Total Earned', value: `$${stats?.totalEarned || '0'}`, icon: DollarSign, color: 'var(--accent-green)', bg: 'var(--accent-green-bg)' },
                { label: isMarketmaker ? 'Active Projects' : 'Active Contracts', value: (stats?.activeContracts || 0).toString(), icon: FileText, color: 'var(--accent-blue)', bg: 'var(--accent-blue-bg)' },
                { label: isMarketmaker ? 'Funds Locked' : 'In Escrow', value: `$${stats?.escrowHeld || '0'}`, icon: Lock, color: 'var(--escrow)', bg: 'var(--escrow-bg)' },
                { label: isMarketmaker ? 'Completions' : 'Credentials', value: (stats?.mccs?.workCredentials || 0).toString(), icon: Award, color: 'var(--accent-purple)', bg: 'var(--accent-purple-bg)' },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                >
                  <s.icon
                    size={20}
                    strokeWidth={1.8}
                    className="shrink-0"
                    style={{
                      color: s.color,
                      filter: `drop-shadow(0 0 4px ${s.color}) drop-shadow(0 0 10px ${s.color}) drop-shadow(0 0 20px ${s.color})`,
                    }}
                  />
                  <div>
                    <p className="text-xl font-bold leading-tight" style={{ color: 'var(--text)' }}>{s.value}</p>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* 3-column */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT — Escrow + Quick Actions */}
        <div
          className="w-48 lg:w-56 overflow-y-auto shrink-0 hidden md:flex flex-col gap-2 p-2"
        >
          {/* Escrow block — v1.0: prominent anchor (orange left border + tint) */}
          <div
            className="rounded-2xl p-3 animate-fade-in-stagger stagger-3"
            style={{
              backgroundColor: 'var(--escrow-bg)',
              border: '1px solid var(--separator)',
              borderLeft: '4px solid var(--escrow)',
            }}
            title={isMarketmaker ? 'Funds you locked on XRPL — released when you approve deliverables' : 'Funds locked on XRPL until you deliver and client approves'}
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield size={12} style={{ color: 'var(--escrow)' }} />
              <h3
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: 'var(--escrow)' }}
              >
                Escrow
              </h3>
            </div>

            {contractsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl animate-pulse"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  />
                ))}
              </div>
            ) : escrowMilestones.length === 0 ? (
              <div className="text-center py-6">
                <Lock size={20} className="mx-auto mb-2" style={{ color: 'var(--escrow)' }} />
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No active escrows</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {isMarketmaker
                    ? 'Your funds appear here when you fund a project'
                    : 'Funds are locked here when contracts are funded'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {escrowMilestones.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl border-l-2"
                    style={{ backgroundColor: 'var(--bg-elevated)', borderLeftColor: 'var(--escrow)' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[11px] font-medium uppercase"
                        style={{ color: 'var(--escrow)' }}
                      >
                        {m.status === 'submitted' ? 'Review' : 'Locked'}
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                        {formatAmount(m.amount.toString(), m.currency)}
                      </span>
                    </div>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{m.title}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{m.contractTitle}</p>
                  </div>
                ))}
              </div>
            )}

            {!statsLoading && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--separator)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total locked</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--escrow-light)' }}>${stats?.escrowHeld || '0'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions — separate block */}
          <div
            className="rounded-2xl p-3"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--separator)' }}
          >
            <h3
              className="text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Quick Actions
            </h3>
            <div className="flex flex-col gap-1.5">
              {(isMarketmaker ? [
                { href: '/dashboard/contracts/new', label: 'Post a Project', icon: Plus },
                { href: '/dashboard/wallet', label: 'Fund Balance', icon: DollarSign },
                { href: '/dashboard/nfts', label: 'Completions', icon: Trophy },
              ] : [
                { href: '/dashboard/contracts/new', label: 'Create a New Contract', icon: Plus },
                { href: '/dashboard/wallet', label: 'Balance', icon: DollarSign },
                { href: '/dashboard/nfts', label: 'Assets', icon: Trophy },
              ]).map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="text-[12px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors duration-200"
                  style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <action.icon size={11} /> {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER — Main */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 animate-fade-in-stagger stagger-4">

          {/* Active Contracts */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>{isMarketmaker ? 'Active Projects' : 'Active Contracts'}</h2>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/contracts/new"
                  className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all duration-200"
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <Plus size={10} /> New
                </Link>
                <Link
                  href="/dashboard/contracts"
                  className="text-sm transition-colors duration-200"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  All
                </Link>
              </div>
            </div>

            {contractsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : activeContracts.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {isMarketmaker ? 'No active projects' : 'No active contracts'}
                </p>
                <p className="text-xs mb-4 max-w-[220px] mx-auto" style={{ color: 'var(--text-muted)' }}>
                  {isMarketmaker
                    ? 'Post a project to find talent and fund with escrow protection.'
                    : 'Your first contract will show here. Create one to get paid with escrow protection.'}
                </p>
                <Link href="/dashboard/contracts/new" className="btn-primary text-xs inline-flex items-center gap-1.5">
                  <Plus size={12} /> {isMarketmaker ? 'Post a project' : 'Create a new contract'}
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {activeContracts.map((contract) => {
                  const milestones = contract.milestones || [];
                  const completedMilestones = milestones.filter((m) => m.status === 'released').length;
                  const totalMilestones = milestones.length;
                  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

                  return (
                    <Link
                      key={contract.id}
                      href={`/dashboard/contracts/${contract.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                            {contract.title}
                          </span>
                          <StatusBadge status={contract.status} />
                        </div>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {(contract as any).marketplace_name || (contract as any).creator_name || 'Counterparty'}
                        </span>
                      </div>
                      {totalMilestones > 0 && (
                        <div className="w-20 hidden sm:block">
                          <div
                            className="h-1 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-inset)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: 'var(--status-active)',
                              }}
                            />
                          </div>
                          <span className="text-[11px] mt-0.5 block text-right" style={{ color: 'var(--text-muted)' }}>
                            {progress}%
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-semibold w-16 text-right" style={{ color: 'var(--text)' }}>
                        {formatAmount(contract.total_amount.toString(), contract.currency)}
                      </span>
                      <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Credentials */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Credential Assets</h2>
              <Link
                href="/dashboard/nfts"
                className="text-sm transition-colors duration-200"
                style={{ color: 'var(--text-tertiary)' }}
              >
                All
              </Link>
            </div>

            {mccsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse p-3 rounded-xl h-16"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  />
                ))}
              </div>
            ) : recentMCCs.length === 0 ? (
              <div className="text-center py-6">
                <Trophy size={20} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {isMarketmaker ? 'No completion records yet' : 'No credentials yet'}
                </p>
                <p className="text-xs max-w-[200px] mx-auto" style={{ color: 'var(--text-muted)' }}>
                  {isMarketmaker
                    ? 'Completion records appear when you approve milestones and release payment.'
                    : 'MCCs appear when you complete milestones. Finish a contract to mint your first.'}
                </p>
                <Link href="/dashboard/contracts" className="text-xs font-medium mt-2 inline-block" style={{ color: 'var(--escrow)' }}>
                  View contracts →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {recentMCCs.map((mcc) => (
                  <div
                    key={mcc.id}
                    className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--accent-purple-bg)' }}
                    >
                      <Award size={14} style={{ color: 'var(--accent-purple)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>
                        {mcc.metadata_cache.name}
                      </p>
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {mcc.taxon === 1 ? 'Work Credential' : mcc.taxon === 2 ? 'Usage License' : mcc.taxon === 4 ? 'Completion Record' : 'Access Token'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Feed */}
        <div
          className="w-56 lg:w-64 overflow-y-auto shrink-0 hidden md:flex flex-col gap-2 p-2 animate-fade-in-stagger stagger-5"
        >
          <div
            className="rounded-2xl p-3"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--separator)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Feed
              </h3>
              <Link
                href="/dashboard/wallet"
                className="text-[11px] transition-colors duration-200"
                style={{ color: 'var(--text-tertiary)' }}
              >
                All
              </Link>
            </div>

            {txLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-2.5 rounded w-3/4 mb-1" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                    <div className="h-2 rounded w-1/2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                  </div>
                ))}
              </div>
            ) : recentTx.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>No activity yet</p>
                <p className="text-[10px] max-w-[140px] mx-auto" style={{ color: 'var(--text-muted)' }}>
                  Recent XRPL activity will show here once you have contracts and payments.
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentTx.map((tx) => {
                  const isIncoming = tx.tx_type === 'EscrowFinish' || tx.tx_type === 'Payment';
                  return (
                    <div
                      key={tx.id}
                      className="p-2 rounded-xl transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                          >
                            {isIncoming
                              ? <ArrowDownLeft size={10} style={{ color: 'var(--status-active)' }} />
                              : <ArrowUpRight size={10} style={{ color: 'var(--status-disputed)' }} />
                            }
                          </div>
                          <span className="text-xs font-medium" style={{ color: isIncoming ? 'var(--status-active)' : 'var(--status-disputed)' }}>
                            {isIncoming ? '+' : '-'}{tx.amount}
                          </span>
                        </div>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{tx.currency}</span>
                      </div>
                      <div className="ml-7 mt-0.5">
                        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                          {tx.tx_type.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
