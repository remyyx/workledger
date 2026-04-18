'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import { useDisputes } from '@/hooks';
import { formatDate, cn } from '@/lib/utils';

const tabs = ['all', 'open', 'evidence', 'review', 'resolved'] as const;

export default function DisputesPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const { data, isLoading } = useDisputes(activeTab);

  const disputes = data?.disputes || [];

  return (
    <>
      <TopBar title="Disputes" />
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
        </div>

        {/* Disputes List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : disputes.length > 0 ? (
          <div className="space-y-3 mb-8">
            {disputes.map((dispute) => (
              <Link
                key={dispute.id}
                href={`/dashboard/disputes/${dispute.id}`}
                className="group block p-4 rounded-xl border transition-all hover:shadow-lg"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle size={16} style={{ color: 'var(--status-disputed)' }} />
                      <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {dispute.contracts?.title || 'Contract'}
                      </h3>
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                      Raised by <span style={{ color: 'var(--text)' }}>{dispute.raised_by_name}</span>
                    </p>
                    <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
                      {dispute.reason}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Created {formatDate(dispute.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={dispute.status} />
                    {dispute.resolution && (
                      <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
                        {dispute.resolution}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <AlertTriangle size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {activeTab === 'all'
                ? 'No disputes yet. Escalate a disputed milestone to open one.'
                : `No disputes in ${activeTab} status.`}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
