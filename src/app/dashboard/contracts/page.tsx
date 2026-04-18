'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, DollarSign, ListChecks, RefreshCw } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import ContractCard from '@/components/ui/ContractCard';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import { useContracts, useUser } from '@/hooks';
// counterparty names now come from contracts API (creator_name, marketplace_name)
import { cn } from '@/lib/utils';

const tabs = ['all', 'active', 'funded', 'completed', 'disputed', 'draft'] as const;

const contractPhases = [
  {
    icon: DollarSign,
    label: 'Fixed Price',
    iconColor: 'var(--escrow)',
    bgColor: 'var(--escrow-bg)',
    borderColor: 'var(--escrow-bg)',
    description:
      'A single deliverable, one payment. Define the scope, set the price, and lock funds in escrow. When work is approved, payment releases automatically on-chain. Ideal for one-off projects with clear deliverables.',
  },
  {
    icon: ListChecks,
    label: 'Milestone',
    iconColor: 'var(--status-active)',
    bgColor: 'var(--status-active-bg)',
    borderColor: 'var(--status-active-bg)',
    description:
      'Break large projects into phases, each with its own escrow. Funds are locked per milestone and released as each phase is completed and approved. Reduces risk for both parties on complex, multi-phase work.',
  },
  {
    icon: RefreshCw,
    label: 'Retainer',
    iconColor: 'var(--accent-purple)',
    bgColor: 'var(--accent-purple-bg)',
    borderColor: 'var(--accent-purple-bg)',
    description:
      'Recurring monthly payments for ongoing work. Set a monthly rate, define the scope, and escrow renews each cycle. Perfect for long-term relationships — design retainers, dev support, content partnerships.',
  },
];

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const { data, isLoading } = useContracts(activeTab);
  const { data: user } = useUser();

  const contracts = data?.contracts || [];

  return (
    <>
      <TopBar title="Smart Contracts" />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize border',
                  activeTab === tab && 'btn-primary'
                )}
                style={
                  activeTab !== tab
                    ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)', borderColor: 'var(--border)' }
                    : undefined
                }
              >
                {tab}
              </button>
            ))}
          </div>
          <Link href="/dashboard/contracts/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Create a New Contract
          </Link>
        </div>

        {/* Contract List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : contracts.length > 0 ? (
          <div className="space-y-3 mb-8">
            {contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                clientName={(contract as any).marketplace_name || (contract as any).creator_name || 'Counterparty'}
                myRole={user?.id && contract.creator_id === user.id ? 'creator' : 'marketplace'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 mb-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No contracts match this filter. Create your first smart contract to get started.</p>
          </div>
        )}

        {/* Contract Phase Explainers */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Contract Types</h3>
          {contractPhases.map((phase) => {
            const Icon = phase.icon;
            return (
              <div
                key={phase.label}
                className="flex items-start gap-4 p-4 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: phase.borderColor }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: phase.bgColor }}>
                  <Icon size={18} style={{ color: phase.iconColor }} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>{phase.label}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{phase.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
